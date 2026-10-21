import { describe, expect, it } from 'vitest';
import { classifyRecoverableError } from './error-feedback';

describe('classifyRecoverableError', () => {
  it.each([
    [{ status: 401 }, 'session'],
    [{ statusCode: 403 }, 'forbidden'],
    [{ status: 404 }, 'missing'],
    [{ status: 408 }, 'timeout'],
    [{ status: 409 }, 'conflict'],
    [{ status: 413 }, 'limit'],
    [{ status: 429 }, 'limit'],
    [{ status: 503 }, 'server'],
    [{ status: 422 }, 'validation'],
    [new TypeError('Failed to fetch'), 'network'],
    [Object.assign(new Error('request timed out'), { name: 'TimeoutError' }), 'timeout'],
    [{ message: 'unexpected upstream payload' }, null],
  ])('classifies known error %j', (error, category) => {
    expect(classifyRecoverableError(error)).toBe(category);
  });
});
