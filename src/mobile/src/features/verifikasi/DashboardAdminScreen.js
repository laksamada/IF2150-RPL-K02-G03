/**
 * I-05 Dashboard Admin: Daftar Laporan Masuk — UC02, UC06. Pemilik: P4.
 * Spesifikasi objek antarmuka: docs/M8/K02_G03_DPPL2.md (BAB 6, I-05). Tugas: src/docs/tasks/P4.md
 *
 *  - O-0503 top bar: judul, badge jumlah laporan baru (UC02 langkah 1), pencarian.
 *  - O-0501/O-0502 kartu laporan "Menunggu Verifikasi" (antrean, terlama dulu). Ketuk -> I-06.
 *  - Bagian "Fasilitas kerusakan berulang" (gap G10) memakai FasilitasBerulangPreview milik P5.
 * Daftar dimuat ulang setiap kali layar kembali difokuskan (mis. setelah keputusan di I-06).
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PESAN, STATUS } from '@silembur/shared';
import { adminApi } from '../../api/admin';
import { TampilanGagal, TampilanKosong, TampilanMemuat } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import FasilitasBerulangPreview from '../fasilitas/FasilitasBerulangPreview';
import KartuLaporanMasuk from './KartuLaporanMasuk';

const JEDA_CARI_MS = 400;

export default function DashboardAdminScreen() {
  const router = useRouter();
  const [kataKunci, setKataKunci] = useState('');
  const [kataDicari, setKataDicari] = useState('');
  const [kunciPreview, setKunciPreview] = useState(0);

  // Cari di server setelah pengguna berhenti mengetik sebentar.
  useEffect(() => {
    const t = setTimeout(() => setKataDicari(kataKunci.trim()), JEDA_CARI_MS);
    return () => clearTimeout(t);
  }, [kataKunci]);

  const daftar = useApi(
    () => adminApi.daftarLaporan({ status: STATUS.MENUNGGU_VERIFIKASI, q: kataDicari }),
    [kataDicari],
  );
  const badge = useApi(() => adminApi.jumlahBaru(), []);

  const muatSemua = useCallback(() => {
    daftar.muatUlang();
    badge.muatUlang();
    setKunciPreview((k) => k + 1);
  }, [daftar.muatUlang, badge.muatUlang]);

  // Muat ulang saat kembali dari I-06 (fokus pertama dilewati karena useApi sudah memuat).
  const sudahFokus = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (sudahFokus.current) muatSemua();
      sudahFokus.current = true;
    }, [muatSemua]),
  );

  const laporan = daftar.data?.data ?? [];
  const jumlahBaru = badge.data?.jumlah ?? 0;

  let isi;
  if (daftar.memuat && !daftar.data) isi = <TampilanMemuat />;
  else if (daftar.error) isi = <TampilanGagal pesan={daftar.error.message} onCobaLagi={daftar.muatUlang} />;
  else if (laporan.length === 0)
    isi = <TampilanKosong pesan={kataDicari ? 'Laporan yang dicari tidak ditemukan' : PESAN.BELUM_ADA_LAPORAN} />;
  else
    isi = laporan.map((l) => (
      <KartuLaporanMasuk key={l.id} laporan={l} onTekan={() => router.push(`/admin/verifikasi/${l.id}`)} />
    ));

  return (
    <SafeAreaView style={s.layar} edges={['top']}>
      <View style={s.atas}>
        <View style={s.barisAtas}>
          <View style={{ flex: 1 }}>
            <Text style={s.judulAtas}>Dashboard Admin</Text>
            <Text style={s.subjudulAtas}>Daftar laporan masuk yang menunggu verifikasi</Text>
          </View>
          <View
            style={s.lonceng}
            accessibilityLabel={`${jumlahBaru} laporan baru menunggu verifikasi`}
            accessibilityRole="text"
          >
            <Ionicons name="notifications-outline" size={24} color={warna.putih} />
            {jumlahBaru > 0 ? (
              <View style={s.badge}>
                <Text style={s.badgeTeks}>{jumlahBaru > 99 ? '99+' : jumlahBaru}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={s.cari}>
          <Ionicons name="search" size={18} color={warna.teksLembut} />
          <TextInput
            value={kataKunci}
            onChangeText={setKataKunci}
            placeholder="Cari deskripsi, lokasi, atau kategori"
            placeholderTextColor={warna.teksLembut}
            style={s.cariInput}
            returnKeyType="search"
            onSubmitEditing={() => setKataDicari(kataKunci.trim())}
          />
          {kataKunci ? (
            <Ionicons
              name="close-circle"
              size={18}
              color={warna.teksLembut}
              onPress={() => setKataKunci('')}
              accessibilityLabel="Hapus pencarian"
            />
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.isi}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={daftar.memuat && !!daftar.data} onRefresh={muatSemua} colors={[warna.primer]} />
        }
      >
        <View style={s.kepalaBagian}>
          <Text style={huruf.subjudul}>Menunggu verifikasi</Text>
          <Text style={huruf.kecil}>{jumlahBaru} laporan baru</Text>
        </View>
        {isi}

        <View style={{ marginTop: jarak.l }}>
          <FasilitasBerulangPreview
            key={kunciPreview}
            onLihatSemua={() => router.push({ pathname: '/admin/fasilitas', params: { berulang: 'true' } })}
            onPilih={(idFasilitas) => router.push(`/admin/fasilitas/${idFasilitas}`)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: warna.latar },
  atas: {
    backgroundColor: warna.primer,
    paddingHorizontal: jarak.l,
    paddingTop: jarak.m,
    paddingBottom: jarak.l,
    borderBottomLeftRadius: radius.l,
    borderBottomRightRadius: radius.l,
  },
  barisAtas: { flexDirection: 'row', alignItems: 'center', marginBottom: jarak.m },
  judulAtas: { fontSize: 22, fontWeight: '800', color: warna.putih },
  subjudulAtas: { fontSize: 13, color: warna.primerMuda, marginTop: 2 },
  lonceng: { padding: jarak.xs },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: radius.pil,
    backgroundColor: warna.bahaya,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTeks: { color: warna.putih, fontSize: 11, fontWeight: '800' },
  cari: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: warna.permukaan,
    borderRadius: radius.pil,
    paddingHorizontal: jarak.l,
  },
  cariInput: { flex: 1, paddingVertical: 10, paddingHorizontal: jarak.s, fontSize: 15, color: warna.teks },
  isi: { padding: jarak.l, paddingBottom: jarak.xxl, flexGrow: 1 },
  kepalaBagian: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: jarak.m,
  },
});
