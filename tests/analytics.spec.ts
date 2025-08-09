import { describe, it, expect } from 'vitest';
import { scrubPII } from '@/lib/analytics';

describe('analytics scrubPII', () => {
  it('drops PII keys and preserves safe primitives', () => {
    const input = {
      email: 'user@example.com',
      name: 'Jane Doe',
      firstName: 'Jane',
      lastName: 'Doe',
      role: 'sysadmin',
      count: 3,
      enabled: true,
      nothing: null,
      nested: { a: 1 },
      arr: [1, 2, 3],
    } as const;
    const out = scrubPII(input as unknown as Record<string, unknown>);
    expect(out.email).toBeUndefined();
    expect(out.name).toBeUndefined();
    expect(out.firstName).toBeUndefined();
    expect(out.lastName).toBeUndefined();
    expect(out.role).toBe('sysadmin');
    expect(out.count).toBe(3);
    expect(out.enabled).toBe(true);
    expect(out.nothing).toBeNull();
    expect(out.nested).toBeUndefined();
    expect(out.arr).toBeUndefined();
  });
});


