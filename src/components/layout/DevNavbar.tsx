'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
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
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <nav className="bg-gray-100 border-b border-gray-200 px-4 py-2">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
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
          
          {user && (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.firstName} {user.lastName} ({(user.publicMetadata?.role as string) || 'unknown'})
              </span>
              <Button
                onClick={handleSignOut}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 