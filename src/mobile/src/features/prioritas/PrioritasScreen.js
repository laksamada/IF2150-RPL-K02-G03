/**
 * I-08 Laporan Terverifikasi (dashboard pemerintah daerah) — UC03, UC06 langkah 1. Pemilik: P5.
 * Spesifikasi objek antarmuka: docs/M8/K02_G03_DPPL2.md (BAB 6, I-08).
 *
 *  - FasilitasBerulangPreview di atas (KF14); "Tampilkan lebih banyak" -> I-09 filter berulang.
 *  - O-0801 dropdown wilayah, O-0802 filter kategori (KF19), O-0803 peta semua titik,
 *    O-0804 kartu laporan urut skor (KF18) + aksi Mulai Tangani / Tandai Selesai (gap G8).
 *  - Kosong -> "Belum ada laporan" (UC03 alternatif 1 & 2). Gagal/timeout -> "Tolong muat ulang halaman".
 */
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PESAN, SEMUA_KATEGORI } from '@silembur/shared';
import { pemdaApi } from '../../api/pemda';
import { referensiApi } from '../../api/referensi';
import { PetaTampil } from '../../components/map/Peta';
import { TampilanGagal, TampilanKosong, TampilanMemuat } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { judulLaporan } from '../../utils/format';
import FasilitasBerulangPreview from '../fasilitas/FasilitasBerulangPreview';
import { useMuatSaatFokus } from '../warga/useMuatSaatFokus';
import KartuLaporanPrioritas from './KartuLaporanPrioritas';
import { PilihanChip, PilihWilayah } from './komponen';

export default function PrioritasScreen() {
  const router = useRouter();
  const [kategori, setKategori] = useState('');
  const [wilayah, setWilayah] = useState('');

  const referensi = useApi(() => referensiApi.ambil(), []);
  const { data, memuat, error, muatUlang } = useApi(
    () => pemdaApi.prioritas({ kategori, wilayah }),
    [kategori, wilayah],
  );
  // Kembali dari I-10 (status bisa sudah diubah di sana): muat ulang agar tombol aksi tidak usang (409).
  useMuatSaatFokus(muatUlang);
  const laporan = data?.data ?? [];
  const titik = laporan
    .filter((l) => l.lokasi?.latitude !== undefined && l.lokasi?.latitude !== null)
    .map((l) => ({
      id: l.id,
      latitude: l.lokasi.latitude,
      longitude: l.lokasi.longitude,
      judul: judulLaporan({ kategori: l.kategori, alamat: l.lokasi.alamat, wilayah: l.lokasi.wilayah }),
    }));

  const bukaFasilitas = (id) => router.push(`/pemda/fasilitas/${id}`);

  let isi;
  if (memuat && !data) isi = <TampilanMemuat />;
  else if (error) isi = <TampilanGagal pesan={error.message || PESAN.MUAT_ULANG} onCobaLagi={muatUlang} />;
  else if (laporan.length === 0) isi = <TampilanKosong pesan={PESAN.BELUM_ADA_LAPORAN} />;
  else
    isi = (
      <>
        <PetaTampil titik={titik} tinggi={200} />
        <Text style={[huruf.kecil, { marginVertical: jarak.m }]}>
          {laporan.length} laporan, diurutkan dari skor prioritas tertinggi.
        </Text>
        {laporan.map((l) => (
          <KartuLaporanPrioritas
            key={l.id}
            laporan={l}
            bisaUbahStatus
            onStatusBerubah={muatUlang}
            onBukaFasilitas={bukaFasilitas}
          />
        ))}
      </>
    );

  return (
    <SafeAreaView style={s.layar} edges={['top']}>
      <View style={s.atas}>
        <Text style={s.judulAtas}>Laporan Terverifikasi</Text>
        <Text style={s.subAtas}>Prioritas penanganan kerusakan fasilitas umum</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.isi}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={memuat && !!data} onRefresh={muatUlang} colors={[warna.primer]} />}
      >
        <FasilitasBerulangPreview
          onLihatSemua={() => router.push({ pathname: '/pemda/fasilitas', params: { berulang: 'true' } })}
          onPilih={bukaFasilitas}
        />

        <Text style={[huruf.label, s.labelFilter]}>Wilayah</Text>
        <PilihWilayah nilai={wilayah} daftar={referensi.data?.wilayah ?? []} onUbah={setWilayah} />

        <Text style={[huruf.label, s.labelFilter]}>Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterKategori}>
          <PilihanChip label="Semua" aktif={!kategori} onPress={() => setKategori('')} />
          {SEMUA_KATEGORI.map((k) => (
            <PilihanChip key={k} label={k} aktif={kategori === k} onPress={() => setKategori(k)} />
          ))}
        </ScrollView>

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
  judulAtas: { fontSize: 22, fontWeight: '800', color: warna.putih },
  subAtas: { fontSize: 13, color: warna.primerMuda, marginTop: jarak.xs },
  isi: { padding: jarak.l, paddingBottom: jarak.xxl, flexGrow: 1 },
  // ScrollView horizontal bawaan RN ber-flexGrow 1; tanpa ini baris chip melar saat daftar masih memuat.
  filterKategori: { marginBottom: jarak.l, flexGrow: 0 },
  labelFilter: { marginBottom: jarak.xs, marginTop: jarak.s },
});
