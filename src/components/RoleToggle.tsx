/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GraduationCap, Megaphone } from 'lucide-react';
import { UserRole } from '../types';
import { cn } from '../lib/utils';

const OPTIONS: { value: UserRole; label: string; hint: string; icon: typeof GraduationCap }[] = [
  { value: 'mahasiswa', label: 'Mahasiswa', hint: 'Ikuti event, berinteraksi dengan yang lain, dan dapatkan kabar terbaru.', icon: GraduationCap },
  { value: 'panitia', label: 'Panitia', hint: 'Buat dan kelola event kampus, setelah pengajuan Anda disetujui admin.', icon: Megaphone },
];

/** Pilihan tipe akun berbentuk dua stiker yang bisa ditekan. */
export function RoleToggle({ value, onChange }: { value: UserRole; onChange: (role: UserRole) => void }) {
  const active = OPTIONS.find(o => o.value === value) ?? OPTIONS[0];
  return (
    <div className="space-y-2">
      <span className="block text-xs font-bold text-ink uppercase tracking-wider" id="role-toggle-label">Tipe Akun</span>
      <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="role-toggle-label">
        {OPTIONS.map(({ value: optionValue, label, icon: Icon }) => {
          const selected = value === optionValue;
          return (
            <button
              key={optionValue}
              type="button"
              onClick={() => onChange(optionValue)}
              aria-pressed={selected}
              className={cn(
                'flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-ink text-sm font-bold transition-[box-shadow,background-color] motion-reduce:transition-none',
                selected ? 'bg-stabilo text-ink shadow-sticker' : 'bg-white text-ink/70 hover:text-ink'
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink/70">{active.hint}</p>
    </div>
  );
}
