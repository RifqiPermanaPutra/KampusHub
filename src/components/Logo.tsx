/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '../lib/utils';

/** Logo "kampus[HUB]" dengan stiker stabilo miring. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('font-editorial font-extrabold text-2xl tracking-tight text-ink whitespace-nowrap', className)}>
      kampus
      <span className="inline-block -rotate-3 ml-1 rounded-md border-2 border-ink bg-stabilo px-1.5 shadow-sticker">
        HUB
      </span>
    </span>
  );
}
