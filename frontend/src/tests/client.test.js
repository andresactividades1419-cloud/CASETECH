import { describe, it, expect } from 'vitest';
import { apiClient } from '../api/client';

describe('Frontend API Client & Utilities', () => {
  it('apiClient is configured with correct base url suffix /api/v1', () => {
    expect(apiClient.defaults.baseURL).toContain('/api/v1');
  });

  it('apiClient has default json headers and timeout', () => {
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
    expect(apiClient.defaults.timeout).toBe(15000);
  });
});
