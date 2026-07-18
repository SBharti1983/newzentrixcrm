/**
 * Unit Tests for Zentrix Core Utilities
 *
 * Verifies:
 * 1. NotFoundError is instanceof AppError
 * 2. SystemClock mock override updates predictions
 *
 * Run using: npx vitest run tests/unit/core.test.ts
 */

import { describe, test } from 'vitest';
import assert from 'assert';
import { NotFoundError, AppError, SystemClock } from '@zentrix/core';

describe('Zentrix CRM Core Utilities', () => {
    test('Core Errors: Custom subclasses map correctly', () => {
        const error = new NotFoundError('Lead record missing');
        assert.ok(error instanceof AppError);
        assert.strictEqual(error.statusCode, 404);
        assert.strictEqual(error.code, 'NOT_FOUND');
    });

    test('Core Clock: Predictable SystemClock override functions', () => {
        const targetDate = new Date('2026-07-15T12:00:00.000Z');
        SystemClock.setMockTime(targetDate);

        assert.strictEqual(SystemClock.now().toISOString(), targetDate.toISOString());
        SystemClock.clearMockTime();
    });
});
