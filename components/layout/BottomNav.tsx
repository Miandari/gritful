'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, Trophy, Compass, Bell, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BottomNavProps {
  unreadCount: number;
}

const tabs = [
  { key: 'today', href: '/dashboard/today', label: 'Today', icon: CalendarCheck },
  { key: 'challenges', href: '/dashboard/challenges', label: 'Challenges', icon: Trophy },
  { key: 'browse', href: '/challenges/browse', label: 'Browse', icon: Compass },
  { key: 'notifications', href: '/notifications', label: 'Alerts', icon: Bell },
  { key: 'profile', href: '/profile', label: 'Profile', icon: User },
] as const;

function getActiveTab(pathname: string): string {
  if (pathname === '/dashboard/today') return 'today';
  if (pathname === '/challenges/browse' || pathname === '/challenges/create') return 'browse';
  if (pathname === '/notifications') return 'notifications';
  if (pathname === '/profile' || pathname.startsWith('/profile/')) return 'profile';
  if (pathname === '/dashboard/challenges' || pathname.startsWith('/challenges/')) return 'challenges';
  return '';
}

export function BottomNav({ unreadCount }: BottomNavProps) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setKeyboardOpen(window.innerHeight - vv.height > 100);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  return (
    <nav
      data-bottom-nav
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden transition-transform duration-200 ${
        keyboardOpen ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      onTouchStart={() => {}}
    >
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-transform active:scale-95 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {tab.key === 'notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
