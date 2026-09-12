/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ className, label, error, id, ...props }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-ink uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-lg bg-white border-2 border-ink px-4 py-2.5 text-sm text-ink transition-shadow outline-none placeholder:text-ink/45 focus:shadow-sticker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pulpen',
          error && 'border-spidol focus:shadow-[3px_3px_0_var(--color-spidol)]',
          className
        )}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span className="w-2 h-2 shrink-0 rounded-full border border-ink bg-spidol" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
