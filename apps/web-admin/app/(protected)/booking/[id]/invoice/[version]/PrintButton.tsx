'use client';

import { Button } from '@fa/ui';

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} variant="secondary">
      Cetak / Simpan PDF
    </Button>
  );
}
