'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/admin', label: 'Admin Dashboard' },
  { href: '/admin/users', label: 'User Management' },
  { href: '/admin/organisations', label: 'Organisation Management' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
  { href: '/dashboard', label: 'Dashboard' },
];

export function DevNavbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-100 border-b border-gray-200 px-4 py-2">
      <div className="container mx-auto">
        <div className="flex items-center space-x-6">
          <span className="text-sm font-medium text-gray-600">Dev Navigation:</span>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'text-sm px-3 py-1 rounded-md transition-colors',
                pathname === item.href
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
} 