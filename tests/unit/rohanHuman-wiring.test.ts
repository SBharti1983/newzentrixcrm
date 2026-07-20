/**
 * Unit test: Rohan reasoning_complete → RohanAutomationEngine wiring
 *
 * Locks in the event-driven CRM automation wiring in
 * `apps/api/src/modules/ai/nehaBridge/NehaEventRoutes.ts`:
 * when an inbound `reasoning_complete` event (either the legacy
 * `neha:reasoning_complete` or the generalized `employee:reasoning_complete`
 * shape) carries an actionable Track B `action`, the route must forward a
 * mapped payload to `RohanAutomationEngine.executeTrigger`.
 *
 * This is a pure unit test — no database, no Socket.IO server, no HTTP
 * listener. The automation engine and the JWT auth middleware are mocked so
 * the only behavior under test is the mapping + dispatch seam.
 *
 * Run using: npx vitest run tests/unit/rohanHuman-wiring.test.ts
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── Mocks must be hoisted before the router import ───────────────────────
// `vi.mock` is hoisted by Vitest, so these run before the dynamic import
// of NehaEventRoutes below.

const executeTriggerMock = vi.fn().mockResolvedValue({
    success: true,
    message: 'mocked automation result',
});

vi.mock('../../apps/api/src/modules/automation/workflows/RohanAutomationEngine', () => ({
    default: {
        executeTrigger: executeTriggerMock,
    },
}));

// authenticateToken is imported at the bottom of NehaEventRoutes for the
// GET /buffer route. Stub it so no JWT/DB code is pulled into this unit test.
vi.mock('../../apps/api/src/middleware/auth', () => ({
    authenticateToken: (req: any, _res: any, next: any) => {
        req.user = { tenant_id: 1 };
        next();
    },
}));

// ── Load the router under test ───────────────────────────────────────────
// Use a fresh dynamic import so the mocks above are in effect.
let router: any;

beforeEach(async () => {
    executeTriggerMock.mockClear();
    // Re-import to get a clean module instance per test (cache busted).
    vi.resetModules();
    // Re-apply the mocks after resetModules.
    vi.doMock('../../apps/api/src/modules/automation/workflows/RohanAutomationEngine', () => ({
        default: { executeTrigger: executeTriggerMock },
    }));
    vi.doMock('../../apps/api/src/middleware/auth', () => ({
        authenticateToken: (req: any, _res: any, next: any) => {
            req.user = { tenant_id: 1 };
            next();
        },
    }));
    router = (await import('../../apps/api/src/modules/ai/nehaBridge/NehaEventRoutes')).default;
});

// ── Helpers ──────────────────────────────────────────────────────────────
const SHARED_SECRET = process.env.JWT_SECRET || 'zentrix-dev-secret-key-change-me';

function buildMockRes() {
    const res: any = {
        statusCode: 200,
        body: undefined,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.body = payload;
            return this;
        },
    };
    return res;
}

function buildMockReq(event: any, opts: { io?: boolean } = {}) {
    return {
        body: event,
        headers: { authorization: `Bearer ${SHARED_SECRET}` },
        io: opts.io === false ? undefined : { to: () => ({ emit: vi.fn() }) },
    };
}

/**
 * Pull the POST `/` handler out of the Express router's layer stack and
 * invoke it directly with mock req/res. This avoids spinning up a real
 * HTTP listener (no supertest dependency) while still exercising the
 * real route handler code path.
 */
function getPostHandler(routerInstance: any) {
    const layer = routerInstance.stack.find(
        (l: any) => l.route && l.route.methods && l.route.methods.post,
    );
    if (!layer) throw new Error('POST / route not found on NehaEventRoutes router');
    // Express wraps the handler stack in layer.route.stack; the route-level
    // handler is the single function registered via router.post('/').
    return layer.route.stack[0].handle;
}

/** Dispatch a POST / and flush the fire-and-forget automation microtask. */
async function postEvent(event: any, opts?: { io?: boolean }) {
    const req = buildMockReq(event, opts);
    const res = buildMockRes();
    const handler = getPostHandler(router);
    // The route handler is an async function; awaiting its returned
    // Promise waits for res.json() to have been called. It never calls
    // next() (it always sends a response), so we don't need a next cb.
    await handler(req, res, () => { });
    // NehaEventRoutes dispatches the automation fire-and-forget via
    // `.then()` on a detached promise. Flush pending microtasks so the
    // mock assertion sees the invocation.
    await new Promise((resolve) => setImmediate(resolve));
    return { req, res };
}

// ── Tests ────────────────────────────────────────────────────────────────
describe('NehaEventRoutes → RohanAutomationEngine wiring', () => {
    test('employee:reasoning_complete with send_document forwards to automation engine', async () => {
        const event = {
            type: 'employee:reasoning_complete',
            role: 'rohan',
            tenant_id: 1,
            persona_id: 'b7b4a2e5-4f40-4252-87db-2b58b4b73bbf',
            lead_id: 'd748f2aa-2780-452f-9812-4fb3dc5187bd',
            intent: 'share_brochure',
            action: 'send_document',
            emotion: 'neutral',
            confidence: 0.92,
            reasoning_latency_ms: 410,
            total_latency_ms: 620,
            reasoning_summary: 'Client asked for project brochure',
            timestamp: Date.now(),
        };

        const { res } = await postEvent(event);

        // Route acknowledges the event regardless of automation outcome.
        expect(res.statusCode).toBe(200);
        expect(res.body.ok).toBe(true);

        // The automation engine must have been invoked exactly once with
        // the mapped payload.
        expect(executeTriggerMock).toHaveBeenCalledTimes(1);
        const [payload] = executeTriggerMock.mock.calls[0];
        expect(payload.action).toBe('send_document');
        expect(payload.tenant_id).toBe(1);
        expect(payload.lead_id).toBe('d748f2aa-2780-452f-9812-4fb3dc5187bd');
        expect(payload.persona_id).toBe('b7b4a2e5-4f40-4252-87db-2b58b4b73bbf');
        // req.io is threaded through so escalate_to_human can emit alerts.
        expect(payload.io).toBeDefined();
    });

    test('neha:reasoning_complete (legacy shape) with schedule_visit forwards to automation engine', async () => {
        const event = {
            type: 'neha:reasoning_complete',
            tenant_id: 1,
            lead_id: 'd748f2aa-2780-452f-9812-4fb3dc5187bd',
            action: 'schedule_visit',
            intent: 'book_site_visit',
            next_goal: 'Confirm Sunday site visit',
            timestamp: Date.now(),
        };

        await postEvent(event);

        expect(executeTriggerMock).toHaveBeenCalledTimes(1);
        const [payload] = executeTriggerMock.mock.calls[0];
        expect(payload.action).toBe('schedule_visit');
        // next_goal should flow into trigger_reason per buildAutomationPayload.
        expect(payload.trigger_reason).toBe('Confirm Sunday site visit');
    });

    test('escalate_to_human maps intent → escalation_type when escalation_type absent', async () => {
        const event = {
            type: 'employee:reasoning_complete',
            role: 'rohan',
            tenant_id: 1,
            lead_id: 'd748f2aa-2780-452f-9812-4fb3dc5187bd',
            action: 'escalate_to_human',
            intent: 'legal_query',
            persona_id: 'b7b4a2e5-4f40-4252-87db-2b58b4b73bbf',
            timestamp: Date.now(),
        };

        await postEvent(event);

        expect(executeTriggerMock).toHaveBeenCalledTimes(1);
        const [payload] = executeTriggerMock.mock.calls[0];
        expect(payload.action).toBe('escalate_to_human');
        expect(payload.escalation_type).toBe('legal_query');
        expect(payload.persona_id).toBe('b7b4a2e5-4f40-4252-87db-2b58b4b73bbf');
    });

    test('reasoning_complete with a non-automatable action does NOT invoke the automation engine', async () => {
        const event = {
            type: 'employee:reasoning_complete',
            role: 'rohan',
            tenant_id: 1,
            lead_id: 'd748f2aa-2780-452f-9812-4fb3dc5187bd',
            action: 'answer_objection', // not in AUTOMATABLE_ACTIONS
            timestamp: Date.now(),
        };

        const { res } = await postEvent(event);

        expect(res.statusCode).toBe(200);
        expect(executeTriggerMock).not.toHaveBeenCalled();
    });

    test('reasoning_complete without lead_id does NOT invoke the automation engine', async () => {
        const event = {
            type: 'employee:reasoning_complete',
            role: 'rohan',
            tenant_id: 1,
            action: 'send_document', // actionable, but no lead_id
            timestamp: Date.now(),
        };

        await postEvent(event);

        expect(executeTriggerMock).not.toHaveBeenCalled();
    });

    test('non-reasoning event types do NOT invoke the automation engine', async () => {
        const event = {
            type: 'employee:turn_started',
            role: 'rohan',
            tenant_id: 1,
            lead_id: 'd748f2aa-2780-452f-9812-4fb3dc5187bd',
            action: 'send_document', // would be actionable, but wrong event type
            timestamp: Date.now(),
        };

        await postEvent(event);

        expect(executeTriggerMock).not.toHaveBeenCalled();
    });

    test('unauthorized request is rejected and automation engine is not invoked', async () => {
        const req = {
            body: {
                type: 'employee:reasoning_complete',
                role: 'rohan',
                tenant_id: 1,
                lead_id: 'd748f2aa-2780-452f-9812-4fb3dc5187bd',
                action: 'send_document',
                timestamp: Date.now(),
            },
            headers: { authorization: 'Bearer wrong-secret' },
            io: { to: () => ({ emit: vi.fn() }) },
        };
        const res = buildMockRes();

        const handler = getPostHandler(router);
        await handler(req, res, () => { });
        await new Promise((resolve) => setImmediate(resolve));

        expect(res.statusCode).toBe(401);
        expect(executeTriggerMock).not.toHaveBeenCalled();
    });
});
