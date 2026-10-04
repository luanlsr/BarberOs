import { describe, expect, it } from 'vitest';

import { jsonError, jsonFromError } from './api';

describe('shared API presentation helpers', () => {
  it('preserves request id in stable error envelopes', async () => {
    const response = jsonError('UNAUTHENTICATED', 'Authentication is required.', 401, 'request-1');

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication is required.',
        requestId: 'request-1',
      },
    });
  });

  it('maps unknown failures to a non-sensitive public error with request id', async () => {
    const response = jsonFromError(new Error('provider token leaked'), 'request-2');

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'CORE_VALIDATION_ERROR',
        message: 'Request could not be processed.',
        requestId: 'request-2',
      },
    });
  });
});
