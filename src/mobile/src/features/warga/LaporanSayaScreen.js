/**
 * Laporan Saya — UC05 Melihat status laporan milik sendiri (KF13). Pemilik: P3.
 * Tugas: src/docs/tasks/P3.md. Ketuk kartu -> I-03 mode saya (riwayat penanganan, revisi).
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { wargaApi } from '../../api/warga';
import { Layar, TampilanGagal, TampilanKosong, TampilanMemuat } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak } from '../../theme/tokens';
import KartuLaporan from './KartuLaporan';
import { useMuatSaatFokus } from './useMuatSaatFokus';

export default function LaporanSayaScreen() {
  const router = useRouter();
  const [menyegarkan, setMenyegarkan] = useState(false);
  const { data, memuat, error, muatUlang } = useApi(() => wargaApi.daftarSaya(), []);
  // Laporan baru (tab Lapor) atau hasil revisi langsung terlihat saat kembali ke tab ini.
  useMuatSaatFokus(muatUlang);

  async function segarkan() {
    setMenyegarkan(true);
    await muatUlang();
    setMenyegarkan(false);
  }

  const laporan = data?.data ?? [];
  let isi;
  if (memuat && !data) isi = <TampilanMemuat />;
  else if (error) isi = <TampilanGagal pesan={error.message} onCobaLagi={muatUlang} />;
  else if (laporan.length === 0) isi = <TampilanKosong />;
  else {
    isi = laporan.map((l) => (
      <KartuLaporan key={l.id} laporan={l} onDetail={() => router.push(`/warga/laporan/${l.id}?mode=saya`)} />
    ));
  }

  return (
    <Layar onSegarkan={segarkan} menyegarkan={menyegarkan}>
      <Text style={huruf.judul}>Laporan Saya</Text>
      <Text style={[huruf.kecil, { marginBottom: jarak.l }]}>Pantau status dan riwayat penanganan laporanmu.</Text>
      {isi}
    </Layar>
  );
}
