/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link, useLocation } from 'react-router-dom';
import { Award, Compass, Home, LayoutDashboard, Menu, Ticket, type LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { KunciNavigasi, itemNavigasiBawah, navigasiAktif } from '../lib/navigasi';
import { cn } from '../lib/utils';

const IKON: Record<KunciNavigasi, LucideIcon> = {
  beranda: Home,
  jelajah: Compass,
  tiket: Ticket,
  sertifikat: Award,
  kelola: LayoutDashboard,
};

function IsiItem({ Ikon, label, aktif }: { Ikon: LucideIcon; label: string; aktif: boolean }) {
  return (
    <>
      <span
        className={cn(
          'grid h-7 w-12 place-items-center rounded-full border-2 transition-[background-color,border-color] duration-150 motion-reduce:transition-none',
          aktif ? 'border-ink bg-stabilo text-ink' : 'border-transparent text-ink/60'
        )}
      >
        <Ikon size={18} strokeWidth={aktif ? 2.5 : 2} aria-hidden="true" />
      </span>
      <span className={aktif ? 'text-ink' : 'text-ink/60'}>{label}</span>
    </>
  );
}

const kelasItem =
  'flex min-h-14 w-full flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-bold text-ink active:bg-ink/5';

/**
 * Navigasi bawah khusus layar kecil: empat tujuan yang paling sering dibuka
 * sesuai peran, dalam jangkauan jempol, ditambah Menu untuk halaman lainnya.
 */
export function BottomNav({ onMenu, menuTerbuka }: { onMenu: () => void; menuTerbuka: boolean }) {
  const { profile } = useAuth();
  const { pathname } = useLocation();
  const aktif = navigasiAktif(pathname);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {itemNavigasiBawah(profile?.role).map((item, urutan) => (
          // Slot ketiga dan keempat berbeda antara mahasiswa dan panitia. Selama
          // profil belum termuat keduanya dikosongkan, supaya panitia tidak
          // melihat menu mahasiswa berkedip lalu berganti.
          <li key={item.kunci} className={!profile && urutan >= 2 ? 'invisible' : undefined} aria-hidden={!profile && urutan >= 2 ? true : undefined}>
            <Link to={item.ke} aria-current={aktif === item.kunci ? 'page' : undefined} className={kelasItem}>
              <IsiItem Ikon={IKON[item.kunci]} label={item.label} aktif={aktif === item.kunci} />
            </Link>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={onMenu}
            aria-haspopup="dialog"
            aria-expanded={menuTerbuka}
            className={kelasItem}
          >
            {/* Menyala untuk halaman yang hanya bisa dibuka dari Menu, seperti Profil. */}
            <IsiItem Ikon={Menu} label="Menu" aktif={menuTerbuka || aktif === null} />
          </button>
        </li>
      </ul>
    </nav>
  );
}
