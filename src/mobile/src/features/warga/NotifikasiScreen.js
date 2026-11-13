/**
 * O-0201 Notifikasi — kotak masuk pelapor: hasil verifikasi + alasan (KF07 sisi penerima,
 * DPPL C01 terimaNotifikasi()). Pemilik: P3. Tugas: src/docs/tasks/P3.md
 * Ketuk notifikasi -> ditandai dibaca, lalu buka detail laporan terkait (mode saya).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { wargaApi } from '../../api/warga';
import { Kartu, Layar, TampilanGagal, TampilanKosong, TampilanMemuat } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { formatTanggal, kodeLaporan, waktuRelatif } from '../../utils/format';

export default function NotifikasiScreen() {
  const router = useRouter();
  const [menyegarkan, setMenyegarkan] = useState(false);
  const { data, memuat, error, muatUlang, setData } = useApi(() => wargaApi.notifikasi(), []);

  async function segarkan() {
    setMenyegarkan(true);
    await muatUlang();
    setMenyegarkan(false);
  }

  async function buka(n) {
    if (!n.dibaca) {
      // Perbarui tampilan dulu agar responsif; server tetap sumber kebenaran saat dimuat ulang.
      setData((lama) =>
        lama && {
          ...lama,
          data: lama.data.map((x) => (x.id === n.id ? { ...x, dibaca: true } : x)),
          belumDibaca: Math.max(0, lama.belumDibaca - 1),
        },
      );
      try {
        await wargaApi.tandaiDibaca(n.id);
      } catch {
        // Gagal menandai tidak menghalangi membuka laporan; status asli dimuat ulang.
        muatUlang();
      }
    }
    router.push(`/warga/laporan/${n.idLaporan}?mode=saya`);
  }

  const daftar = data?.data ?? [];
  let isi;
  if (memuat && !data) isi = <TampilanMemuat />;
  else if (error) isi = <TampilanGagal pesan={error.message} onCobaLagi={muatUlang} />;
  else if (daftar.length === 0) isi = <TampilanKosong pesan="Belum ada notifikasi" ikon="notifications-off-outline" />;
  else {
    isi = daftar.map((n) => (
      <Kartu key={n.id} onPress={() => buka(n)} style={[s.kartu, !n.dibaca && s.kartuBaru]}>
        <View style={[s.ikon, !n.dibaca && s.ikonBaru]}>
          <Ionicons name="notifications" size={18} color={n.dibaca ? warna.teksLembut : warna.primer} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={s.barisAtas}>
            <Text style={s.kode}>{kodeLaporan(n.idLaporan)}</Text>
            <Text style={huruf.kecil} accessibilityLabel={formatTanggal(n.waktuKirim)}>
              {waktuRelatif(n.waktuKirim)}
            </Text>
          </View>
          <Text style={[huruf.isi, !n.dibaca && { fontWeight: '700' }]}>{n.isiPesan}</Text>
        </View>
        {n.dibaca ? null : <View style={s.titik} accessibilityLabel="Belum dibaca" />}
      </Kartu>
    ));
  }

  return (
    <Layar tepi={['bottom']} onSegarkan={segarkan} menyegarkan={menyegarkan}>
      {data?.belumDibaca ? (
        <Text style={[huruf.kecil, { marginBottom: jarak.m }]}>{data.belumDibaca} notifikasi belum dibaca</Text>
      ) : null}
      {isi}
    </Layar>
  );
}

const s = StyleSheet.create({
  kartu: { flexDirection: 'row', alignItems: 'flex-start' },
  kartuBaru: { borderLeftWidth: 4, borderLeftColor: warna.primer },
  ikon: {
    width: 36,
    height: 36,
    borderRadius: radius.pil,
    backgroundColor: warna.permukaanLembut,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: jarak.m,
  },
  ikonBaru: { backgroundColor: warna.primerMuda },
  barisAtas: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: jarak.xs },
  kode: { ...huruf.label, color: warna.primer },
  titik: { width: 10, height: 10, borderRadius: 5, backgroundColor: warna.primer, marginLeft: jarak.s, marginTop: 6 },
});
