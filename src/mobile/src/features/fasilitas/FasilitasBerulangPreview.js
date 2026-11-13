/**
 * Pratinjau fasilitas kerusakan berulang (UC06 langkah 1, KF14). Dipasang di I-08 (pemda) dan I-05 (admin, P4).
 * Pemilik: P5.
 *
 *   <FasilitasBerulangPreview onLihatSemua={() => router.push('/admin/fasilitas?berulang=true')}
 *                             onPilih={(idFasilitas) => router.push(`/admin/fasilitas/${idFasilitas}`)} />
 *
 * Maksimal 3 fasilitas + tombol "Tampilkan lebih banyak"; kosong -> PESAN.BELUM_ADA_FASILITAS_BERULANG.
 */
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { PESAN } from '@silembur/shared';
import { pemdaApi } from '../../api/pemda';
import { Kartu, Tombol } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';

const MAKS = 3;

export default function FasilitasBerulangPreview({ onLihatSemua, onPilih }) {
  const { data, memuat, error, muatUlang } = useApi(() => pemdaApi.fasilitasBerulang(MAKS), []);
  const daftar = data?.data ?? [];

  let isi;
  if (memuat && !data) isi = <ActivityIndicator color={warna.primer} style={{ marginVertical: jarak.m }} />;
  else if (error)
    isi = (
      <View style={s.gagal}>
        <Text style={[huruf.kecil, { flex: 1 }]}>{error.message || PESAN.MUAT_ULANG}</Text>
        <Tombol judul="Muat ulang" varian="teks" onPress={muatUlang} />
      </View>
    );
  else if (daftar.length === 0) isi = <Text style={huruf.kecil}>{PESAN.BELUM_ADA_FASILITAS_BERULANG}</Text>;
  else
    isi = daftar.map((f) => (
      <Pressable
        key={f.id}
        disabled={!onPilih}
        onPress={() => onPilih?.(f.id)}
        style={({ pressed }) => [s.baris, pressed && { opacity: 0.7 }]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[huruf.isi, { fontWeight: '600' }]} numberOfLines={1}>
            {f.nama}
          </Text>
          <Text style={huruf.kecil} numberOfLines={1}>
            {f.lokasi}
          </Text>
        </View>
        <View style={s.lencana}>
          <Text style={s.lencanaTeks}>{f.jumlahKerusakanBerulang} laporan</Text>
        </View>
      </Pressable>
    ));

  return (
    <Kartu>
      <Text style={huruf.subjudul}>Fasilitas Kerusakan Berulang</Text>
      <Text style={[huruf.kecil, { marginBottom: jarak.s }]}>Kandidat evaluasi dalam 90 hari terakhir</Text>
      {isi}
      {onLihatSemua && daftar.length > 0 ? (
        <Tombol judul="Tampilkan lebih banyak" varian="teks" onPress={onLihatSemua} />
      ) : null}
    </Kartu>
  );
}

const s = StyleSheet.create({
  baris: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: jarak.m,
    paddingVertical: jarak.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: warna.garis,
  },
  lencana: { backgroundColor: warna.bahayaMuda, borderRadius: radius.pil, paddingHorizontal: 10, paddingVertical: 4 },
  lencanaTeks: { color: warna.bahaya, fontWeight: '700', fontSize: 12 },
  gagal: { flexDirection: 'row', alignItems: 'center' },
});
