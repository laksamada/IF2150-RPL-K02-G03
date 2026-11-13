/**
 * I-02 Beranda — UC04 Melihat laporan publik. Pemilik: P3.
 * Spesifikasi objek antarmuka: docs/M8/K02_G03_DPPL2.md (BAB 6, I-02). Tugas: src/docs/tasks/P3.md
 *
 *  O-0201 lonceng notifikasi (+ jumlah belum dibaca)   O-0202 kartu ringkasan
 *  O-0203 tab status (+ filter wilayah, UC04 alt 1)     O-0204 kartu laporan -> I-03 mode publik
 *  O-0205 navigasi Lapor ada di tab bawah (app/warga/(tabs)/_layout.js).
 */
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { referensiApi } from '../../api/referensi';
import { wargaApi } from '../../api/warga';
import { Chip, Kartu, Layar, TampilanGagal, TampilanKosong, TampilanMemuat } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import KartuLaporan from './KartuLaporan';
import { useMuatSaatFokus } from './useMuatSaatFokus';

/** O-0203: nilai `kelompok` sesuai kontrak GET /laporan/publik (src/docs/API.md#uc04). */
const TAB_STATUS = [
  { kelompok: '', label: 'Semua' },
  { kelompok: 'menunggu', label: 'Menunggu' },
  { kelompok: 'diproses', label: 'Diproses' },
  { kelompok: 'selesai', label: 'Selesai' },
];

export default function BerandaScreen() {
  const router = useRouter();
  const [kelompok, setKelompok] = useState('');
  const [wilayah, setWilayah] = useState('');
  const [menyegarkan, setMenyegarkan] = useState(false);

  const ringkasan = useApi(() => wargaApi.ringkasan(), []);
  const notifikasi = useApi(() => wargaApi.notifikasi(), []);
  const referensi = useApi(() => referensiApi.ambil(), []);
  const daftar = useApi(() => wargaApi.daftarPublik({ kelompok, wilayah }), [kelompok, wilayah]);

  // Kembali dari layar notifikasi/detail/Lapor: perbarui badge lonceng, ringkasan, dan daftar laporan.
  useMuatSaatFokus(notifikasi.muatUlang, ringkasan.muatUlang, daftar.muatUlang);

  async function segarkan() {
    setMenyegarkan(true);
    await Promise.all([ringkasan.muatUlang(), notifikasi.muatUlang(), daftar.muatUlang()]);
    setMenyegarkan(false);
  }

  const belumDibaca = notifikasi.data?.belumDibaca ?? 0;
  const daftarWilayah = referensi.data?.wilayah ?? [];

  return (
    <Layar onSegarkan={segarkan} menyegarkan={menyegarkan}>
      {/* Header + O-0201 */}
      <View style={s.kepala}>
        <View style={s.merekWadah}>
          <Image source={require('../../../assets/logo.jpeg')} style={s.logo} />
          <View>
            <Text style={s.merek}>SILEMBUR</Text>
            <Text style={huruf.label}>Laporan Fasilitas Kota Bandung</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Notifikasi, ${belumDibaca} belum dibaca`}
          onPress={() => router.push('/warga/notifikasi')}
          style={s.lonceng}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={24} color={warna.teks} />
          {belumDibaca > 0 ? (
            <View style={s.badge}>
              <Text style={s.badgeTeks}>{belumDibaca > 99 ? '99+' : belumDibaca}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* O-0202 */}
      <Kartu style={s.ringkasan}>
        <AngkaRingkasan label="Masuk bulan ini" nilai={ringkasan.data?.masuk} />
        <View style={s.pemisah} />
        <AngkaRingkasan label="Diproses" nilai={ringkasan.data?.diproses} />
        <View style={s.pemisah} />
        <AngkaRingkasan label="Tuntas" nilai={ringkasan.data?.selesai} />
      </Kartu>

      {/* O-0203 */}
      <View style={s.tabWadah}>
        {TAB_STATUS.map((t) => {
          const aktif = kelompok === t.kelompok;
          return (
            <Pressable
              key={t.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: aktif }}
              onPress={() => setKelompok(t.kelompok)}
              style={[s.tab, aktif && s.tabAktif]}
            >
              <Text style={[s.tabTeks, aktif && { color: warna.putih }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* UC04 alt 1: filter wilayah */}
      {daftarWilayah.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterWilayah}>
          <Chip label="Semua wilayah" ikon="map-outline" aktif={!wilayah} onPress={() => setWilayah('')} />
          {daftarWilayah.map((w) => (
            <Chip key={w} label={w} aktif={wilayah === w} onPress={() => setWilayah(w)} />
          ))}
        </ScrollView>
      ) : null}

      {/* O-0204 */}
      <DaftarLaporan
        hasil={daftar}
        menyegarkan={menyegarkan}
        onDetail={(id) => router.push(`/warga/laporan/${id}?mode=publik`)}
      />
    </Layar>
  );
}

function AngkaRingkasan({ label, nilai }) {
  return (
    <View style={s.angkaWadah}>
      <Text style={s.angka}>{nilai ?? '-'}</Text>
      <Text style={[huruf.kecil, { textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

function DaftarLaporan({ hasil, menyegarkan, onDetail }) {
  const { data, memuat, error, muatUlang } = hasil;
  if (memuat && !menyegarkan) return <TampilanMemuat />;
  if (error) return <TampilanGagal pesan={error.message} onCobaLagi={muatUlang} />;
  const laporan = data?.data ?? [];
  if (laporan.length === 0) return <TampilanKosong />;
  return laporan.map((l) => <KartuLaporan key={l.id} laporan={l} onDetail={() => onDetail(l.id)} />);
}

const s = StyleSheet.create({
  kepala: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: jarak.l },
  merekWadah: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  logo: { width: 40, height: 40, borderRadius: radius.s, marginRight: jarak.m },
  merek: { fontSize: 20, fontWeight: '800', color: warna.primer },
  lonceng: {
    width: 44,
    height: 44,
    borderRadius: radius.pil,
    backgroundColor: warna.permukaan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pil,
    backgroundColor: warna.bahaya,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTeks: { color: warna.putih, fontSize: 11, fontWeight: '700' },
  ringkasan: { flexDirection: 'row', alignItems: 'center' },
  angkaWadah: { flex: 1, alignItems: 'center' },
  angka: { fontSize: 24, fontWeight: '800', color: warna.primer },
  pemisah: { width: 1, alignSelf: 'stretch', backgroundColor: warna.garis },
  tabWadah: {
    flexDirection: 'row',
    backgroundColor: warna.permukaanLembut,
    borderRadius: radius.m,
    padding: jarak.xs,
    marginBottom: jarak.m,
  },
  tab: { flex: 1, paddingVertical: jarak.s, borderRadius: radius.s, alignItems: 'center' },
  tabAktif: { backgroundColor: warna.primer },
  tabTeks: { fontSize: 13, fontWeight: '600', color: warna.teksLembut },
  filterWilayah: { marginBottom: jarak.m, flexGrow: 0 },
});
