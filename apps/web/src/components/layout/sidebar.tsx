/**
 * Sidebar navigation component — persistent left nav with route links.
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  GitBranch,
  MessageSquare,
  Zap,
  Home,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '@crm/ui';
import { clearToken } from '@/lib/api';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { href: '/conversations', label: 'Conversations', icon: MessageSquare },
  { href: '/workflows', label: 'Workflows', icon: Zap },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = () => {
    clearToken();
    router.push('/auth/signin');
  };

  return (
    <aside className="w-60 flex flex-col border-r border-border bg-card h-full">
      {/* Brand */}
      <div className="p-4 border-b border-border">
        <h1 className="font-bold text-lg text-primary">⚡ CRM</h1>
        <p className="text-xs text-muted-foreground">Power your growth</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === href || (href !== '/' && pathname.startsWith(href))
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <Settings size={16} /> Settings
        </Link>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}
