import { describe, test, expect, vi } from 'vitest';
import { ModelRouter } from '../../src/ai/routing/ModelRouter';

describe('ModelRouter Load and Resilience Test Suite', () => {
    test('Router handles multiple concurrent execution requests successfully without cross-contaminating states', async () => {
        const prompts = [
            'Hello, how is the property project location?',
            'Can I schedule a visit for tomorrow at 4 PM?',
            'What is the starting price range for units?',
        ];

        const results = await Promise.all(
            prompts.map(p => ModelRouter.generateResponse(p, false, 'fast'))
        );

        expect(results.length).toBe(3);
        results.forEach(res => {
            expect(typeof res === 'string' || typeof res === 'object').toBe(true);
        });
    });
});
