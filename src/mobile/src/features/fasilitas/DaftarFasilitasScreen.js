/**
 * I-09 Daftar Fasilitas — UC06 (fasilitas berulang) & UC08 langkah 1-2 (cari fasilitas). Pemilik: P5.
 * Dipakai PEMDA (/pemda/fasilitas) dan ADMIN (/admin/fasilitas, gap G10); rute detail mengikuti prefix path.
 *
 *  - O-0901 pencarian (nama/lokasi/wilayah) + filter Semua / Kerusakan Berulang (`?berulang=true` dari pratinjau).
 *  - O-0902 kartu fasilitas -> I-10.
 *  - Tidak ditemukan -> PESAN.FASILITAS_TIDAK_DITEMUKAN (UC08 alternatif 1). Gagal -> "Tolong muat ulang halaman".
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { PESAN } from '@silembur/shared';
import { pemdaApi } from '../../api/pemda';
import { Kartu, TampilanGagal, TampilanKosong, TampilanMemuat } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { PilihanChip } from '../prioritas/komponen';

export default function DaftarFasilitasScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { berulang } = useLocalSearchParams();
  const prefix = pathname.startsWith('/admin') ? '/admin' : '/pemda';

  const [hanyaBerulang, setHanyaBerulang] = useState(berulang === 'true');
  const [ketikan, setKetikan] = useState('');
  const [kataKunci, setKataKunci] = useState('');

  // Dibuka lagi dari "Tampilkan lebih banyak" saat tab sudah pernah dibuka.
  useEffect(() => {
    if (berulang === 'true') setHanyaBerulang(true);
  }, [berulang]);

  const { data, memuat, error, muatUlang } = useApi(
    () => pemdaApi.daftarFasilitas({ q: kataKunci, berulang: hanyaBerulang ? 'true' : undefined }),
    [kataKunci, hanyaBerulang],
  );
  const daftar = data?.data ?? [];

  let isi;
  if (memuat && !data) isi = <TampilanMemuat />;
  else if (error) isi = <TampilanGagal pesan={error.message || PESAN.MUAT_ULANG} onCobaLagi={muatUlang} />;
  else if (daftar.length === 0)
    isi = (
      <TampilanKosong
        ikon="business-outline"
        pesan={data?.pesan ?? (hanyaBerulang ? PESAN.BELUM_ADA_FASILITAS_BERULANG : 'Belum ada fasilitas')}
      />
    );
  else
    isi = daftar.map((f) => (
      <Kartu key={f.id} onPress={() => router.push(`${prefix}/fasilitas/${f.id}`)}>
        <View style={s.barisAtas}>
          <Text style={[huruf.subjudul, { flex: 1 }]} numberOfLines={2}>
            {f.nama}
          </Text>
          {f.kandidatEvaluasi ? (
            <View style={s.lencana}>
              <Text style={s.lencanaTeks}>Berulang · {f.jumlahKerusakanBerulang}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[huruf.kecil, { marginTop: jarak.xs }]}>{f.kategori}</Text>
        <View style={s.lokasi}>
          <Ionicons name="location-outline" size={14} color={warna.teksLembut} />
          <Text style={[huruf.kecil, { flex: 1 }]} numberOfLines={1}>
            {f.lokasi}
          </Text>
        </View>
        <View style={s.lokasi}>
          <Text style={[huruf.kecil, { flex: 1 }]}>{f.jumlahKerusakanBerulang} laporan dalam 90 hari</Text>
          <Text style={s.tautan}>Lihat detail</Text>
          <Ionicons name="chevron-forward" size={14} color={warna.primer} />
        </View>
      </Kartu>
    ));

  return (
    <SafeAreaView style={s.layar} edges={['top']}>
      <View style={s.atas}>
        <Text style={s.judulAtas}>Daftar Fasilitas</Text>
        <View style={s.cari}>
          <Ionicons name="search" size={18} color={warna.teksLembut} />
          <TextInput
            value={ketikan}
            onChangeText={setKetikan}
            onSubmitEditing={() => setKataKunci(ketikan.trim())}
            returnKeyType="search"
            placeholder="Cari nama, lokasi, atau wilayah"
            placeholderTextColor={warna.teksLembut}
            style={s.cariInput}
          />
          {ketikan ? (
            <Ionicons
              name="close-circle"
              size={18}
              color={warna.teksLembut}
              onPress={() => {
                setKetikan('');
                setKataKunci('');
              }}
            />
          ) : null}
        </View>
      </View>

      <View style={s.filter}>
        <PilihanChip
          label="Semua"
          aktif={!hanyaBerulang}
          onPress={() => {
            setHanyaBerulang(false);
            // Kosongkan param agar "Tampilkan lebih banyak" berikutnya memicu filter berulang lagi.
            if (berulang) router.setParams({ berulang: '' });
          }}
        />
        <PilihanChip label="Kerusakan Berulang" aktif={hanyaBerulang} onPress={() => setHanyaBerulang(true)} />
      </View>

      <ScrollView
        contentContainerStyle={s.isi}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={memuat && !!data} onRefresh={muatUlang} colors={[warna.primer]} />}
      >
        {isi}
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
  judulAtas: { fontSize: 22, fontWeight: '800', color: warna.putih, marginBottom: jarak.m },
  cari: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: warna.permukaan,
    borderRadius: radius.pil,
    paddingHorizontal: jarak.l,
  },
  cariInput: { flex: 1, paddingVertical: 10, paddingHorizontal: jarak.s, fontSize: 15, color: warna.teks },
  filter: { flexDirection: 'row', paddingHorizontal: jarak.l, paddingTop: jarak.m },
  isi: { padding: jarak.l, paddingBottom: jarak.xxl, flexGrow: 1 },
  barisAtas: { flexDirection: 'row', alignItems: 'flex-start', gap: jarak.s },
  lencana: { backgroundColor: warna.bahayaMuda, borderRadius: radius.pil, paddingHorizontal: 10, paddingVertical: 4 },
  lencanaTeks: { color: warna.bahaya, fontWeight: '700', fontSize: 12 },
  lokasi: { flexDirection: 'row', alignItems: 'center', gap: jarak.xs, marginTop: jarak.xs },
  tautan: { color: warna.primer, fontWeight: '600', fontSize: 13 },
});
