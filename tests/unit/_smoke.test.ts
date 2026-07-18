import { describe, test } from 'vitest';
import assert from 'assert';

describe('smoke', () => {
    test('asserts', () => {
        assert.strictEqual(1 + 1, 2);
    });
});
