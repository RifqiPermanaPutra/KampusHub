/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation } from 'react-router-dom';
import { Compass, Home, Ticket, User } from 'lucide-react';
import { cn } from '../lib/utils';

const ITEMS = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/explore', label: 'Jelajah', icon: Compass },
  { to: '/my-rsvps', label: 'Tiket', icon: Ticket },
  { to: '/profile', label: 'Profil', icon: User },
];

/**
 * Navigasi bawah khusus layar kecil: empat tujuan yang paling sering dibuka
 * mahasiswa, dalam jangkauan jempol. Menu lengkap tetap ada di drawer.
 */
export function BottomNav() {
  const location = useLocation();

  return (
    <nav
      aria-label="Navigasi utama"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {ITEMS.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold text-ink"
              >
                <span
                  className={cn(
                    'grid place-items-center w-11 h-7 rounded-full border-2 transition-[background-color,border-color] duration-150 motion-reduce:transition-none',
                    active ? 'bg-stabilo border-ink' : 'border-transparent text-ink/60'
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className={active ? 'text-ink' : 'text-ink/60'}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
