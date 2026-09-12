/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

const BASE_TITLE = 'KampusHub';

/** Set document.title per halaman; kembali ke default saat unmount. */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE_TITLE}` : `${BASE_TITLE} - Platform Event Kampus`;
    return () => {
      document.title = `${BASE_TITLE} - Platform Event Kampus`;
    };
  }, [title]);
}
