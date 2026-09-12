/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'gray';
  className?: string;
}

/** Label kecil bergaya stiker: border tinta, huruf mono. */
export function Badge({ children, variant = 'blue', className }: BadgeProps) {
  const variants = {
    blue: 'bg-pulpen text-white',
    green: 'bg-daun text-ink',
    purple: 'bg-stiker text-ink',
    red: 'bg-spidol text-ink',
    yellow: 'bg-stabilo text-ink',
    gray: 'bg-white text-ink/70',
  };

  return (
    <span className={cn('sticker', variants[variant], className)}>
      {children}
    </span>
  );
}
