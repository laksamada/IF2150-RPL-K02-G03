/**
 * Muat ulang data setiap kali layar kembali difokuskan (mis. setelah membuka notifikasi
 * atau mengirim revisi). Fokus pertama dilewati karena useApi sudah memuat saat mount. Pemilik: P3.
 *
 * Fungsi muat disimpan di ref dan callback fokus dibuat sekali saja: `muatUlang` dari useApi berganti
 * identitas setiap filter berubah, dan useFocusEffect menjalankan ulang callback yang berubah, sehingga
 * tanpa ini setiap ganti filter akan memuat data dua kali.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

export function useMuatSaatFokus(...fungsiMuat) {
  const pertama = useRef(true);
  const terbaru = useRef(fungsiMuat);
  terbaru.current = fungsiMuat;
  useFocusEffect(
    useCallback(() => {
      if (pertama.current) {
        pertama.current = false;
        return;
      }
      terbaru.current.forEach((f) => f());
    }, []),
  );
}
