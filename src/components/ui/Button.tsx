/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'stabilo' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  children,
  ...props
}: ButtonProps) {
  // Tombol "stiker": border tinta + bayangan offset yang hilang saat ditekan.
  const sticker =
    'border-2 border-ink shadow-sticker hover:-translate-x-px hover:-translate-y-px hover:shadow-sticker-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none';

  const variants = {
    primary: cn(sticker, 'bg-pulpen text-white'),
    stabilo: cn(sticker, 'bg-stabilo text-ink'),
    outline: cn(sticker, 'bg-white text-ink'),
    danger: cn(sticker, 'bg-spidol text-ink'),
    success: cn(sticker, 'bg-daun text-ink'),
    ghost: 'border-2 border-transparent text-ink/70 hover:text-ink hover:bg-ink/5',
  };

  // Ukuran kecil tetap setinggi 40px di layar sentuh supaya mudah diketuk
  // jempol, lalu kembali ringkas di layar besar yang dipakai dengan tetikus.
  const sizes = {
    sm: 'min-h-10 px-3 py-1.5 text-xs sm:min-h-0',
    md: 'min-h-11 px-5 py-2.5 text-sm',
    lg: 'min-h-12 px-8 py-4 text-base',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-bold transition-[transform,box-shadow,background-color,color] duration-100 motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-sticker',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
