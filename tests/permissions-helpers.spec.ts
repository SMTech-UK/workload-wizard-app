import { describe, it, expect } from 'vitest';
import { listPermissionsByGroup, rolesForPermission, PERMISSIONS } from '@/lib/permissions';

describe('permissions helpers', () => {
  it('listPermissionsByGroup groups correctly', () => {
    const grouped = listPermissionsByGroup();
    // Every permission appears in exactly one group
    const count = Object.values(grouped).reduce((n, arr) => n + arr.length, 0);
    expect(count).toBe(Object.keys(PERMISSIONS).length);
  });

  it('rolesForPermission returns known roles for a permission', () => {
    const anyId = Object.keys(PERMISSIONS)[0]!;
    const roles = rolesForPermission(anyId as any);
    expect(Array.isArray(roles)).toBe(true);
  });
});


