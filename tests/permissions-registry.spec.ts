import { describe, it, expect } from 'vitest';
import { PERMISSIONS, DEFAULT_ROLES, type PermissionId } from '@/lib/permissions';

describe('permissions registry invariants', () => {
  it('permission ids are unique and formatted as group.action', () => {
    const ids = Object.keys(PERMISSIONS);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
    for (const id of ids) {
      expect(id.split('.').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('default roles reference existing permission ids', () => {
    const ids = new Set(Object.keys(PERMISSIONS));
    for (const [role, perms] of Object.entries(DEFAULT_ROLES)) {
      void role;
      for (const p of perms) {
        expect(ids.has(p as PermissionId)).toBe(true);
      }
    }
  });
});


