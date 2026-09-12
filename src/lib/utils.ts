import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Kenalkan bayangan tema Mading ke tailwind-merge agar `shadow-none` dsb.
// bisa menimpa `shadow-sticker` lewat prop className.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      shadow: ['sticker', 'sticker-lg'],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
