/**
 * I-05 Dashboard Admin: Daftar Laporan Masuk — UC02, UC06. Pemilik: P4.
 * Spesifikasi objek antarmuka: docs/M8/K02_G03_DPPL2.md (BAB 6, I-05). Tugas: src/docs/tasks/P4.md
 * Antrean laporan Menunggu Verifikasi (O-0501/0502) + pencarian (O-0503) + badge laporan baru
 * + pratinjau fasilitas kerusakan berulang (komponen P5).
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminApi } from '../../api/admin';
import { TampilanGagal, TampilanKosong, TampilanMemuat } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import FasilitasBerulangPreview from '../fasilitas/FasilitasBerulangPreview';
import KartuAntrean from './KartuAntrean';

export default function DashboardAdminScreen() {
  const router = useRouter();
  const [kataKunci, setKataKunci] = useState('');
  const [q, setQ] = useState('');

  // Debounce pencarian agar tidak memanggil server pada setiap ketukan huruf.
  useEffect(() => {
    const t = setTimeout(() => setQ(kataKunci.trim()), 400);
    return () => clearTimeout(t);
  }, [kataKunci]);

  const antrean = useApi(() => adminApi.daftarLaporan({ q }), [q]);
  const badge = useApi(() => adminApi.jumlahBaru(), []);

  // Muat ulang saat layar kembali fokus (mis. setelah memutuskan di I-06), kecuali saat pertama dibuka.
  const segarkan = useRef(() => {});
  segarkan.current = () => {
    antrean.muatUlang();
    badge.muatUlang();
  };
  const pertama = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (pertama.current) {
        pertama.current = false;
        return;
      }
      segarkan.current();
    }, []),
  );

  const daftar = antrean.data?.data ?? [];
  const jumlahBaru = badge.data?.jumlah ?? 0;

  let isi;
  if (antrean.memuat && !antrean.data) isi = <TampilanMemuat />;
  else if (antrean.error) isi = <TampilanGagal pesan={antrean.error.message} onCobaLagi={antrean.muatUlang} />;
  else if (daftar.length === 0) {
    isi = <TampilanKosong pesan={q ? 'Laporan yang dicari tidak ditemukan' : 'Tidak ada laporan yang menunggu verifikasi'} />;
  } else {
    isi = daftar.map((l) => (
      <KartuAntrean key={l.id} laporan={l} onPress={() => router.push(`/admin/verifikasi/${l.id}`)} />
    ));
  }

  return (
    <SafeAreaView style={s.layar} edges={['top']}>
      <View style={s.atas}>
        <View style={s.barisAtas}>
          <Text style={s.judulAtas}>Dashboard Admin</Text>
          {jumlahBaru > 0 ? (
            <View style={s.badge} accessibilityLabel={`${jumlahBaru} laporan baru`}>
              <Ionicons name="notifications" size={14} color={warna.putih} />
              <Text style={s.badgeTeks}>{jumlahBaru} baru</Text>
            </View>
          ) : null}
        </View>
        <View style={s.cari}>
          <Ionicons name="search" size={18} color={warna.teksLembut} />
          <TextInput
            value={kataKunci}
            onChangeText={setKataKunci}
            placeholder="Cari laporan (deskripsi atau alamat)"
            placeholderTextColor={warna.teksLembut}
            style={s.cariInput}
            returnKeyType="search"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.isi}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={antrean.memuat && !!antrean.data}
            onRefresh={segarkan.current}
            colors={[warna.primer]}
          />
        }
      >
        <Text style={[huruf.subjudul, { marginBottom: jarak.m }]}>Menunggu verifikasi</Text>
        {isi}

        <View style={{ marginTop: jarak.l }}>
          <FasilitasBerulangPreview onLihatSemua={() => router.push('/admin/fasilitas')} />
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
  barisAtas: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: jarak.m },
  judulAtas: { ...huruf.judul, color: warna.putih },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: jarak.xs,
    backgroundColor: warna.bahaya,
    borderRadius: radius.pil,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTeks: { color: warna.putih, fontSize: 12, fontWeight: '700' },
  cari: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: jarak.s,
    backgroundColor: warna.permukaan,
    borderRadius: radius.m,
    paddingHorizontal: jarak.m,
  },
  cariInput: { flex: 1, paddingVertical: jarak.m, fontSize: 15, color: warna.teks },
  isi: { padding: jarak.l, flexGrow: 1 },
});
