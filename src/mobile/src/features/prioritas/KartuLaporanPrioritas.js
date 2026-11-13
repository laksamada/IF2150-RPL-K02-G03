/**
 * Kartu LaporanPrioritas (I-08 O-0804, I-10 O-1002). Tanpa identitas pelapor (KNF02, gap G9).
 * Pemilik: P5.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { urlLengkap } from '../../api/client';
import { Kartu, LencanaStatus } from '../../components/ui';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { judulLaporan, kodeLaporan, waktuRelatif } from '../../utils/format';
import { AksiStatusLaporan } from './komponen';

export default function KartuLaporanPrioritas({ laporan, bisaUbahStatus, onStatusBerubah, onBukaFasilitas }) {
  const { skor } = laporan;
  return (
    <Kartu>
      <View style={s.atas}>
        <Text style={huruf.label}>{kodeLaporan(laporan.id)}</Text>
        <LencanaStatus status={laporan.status} />
      </View>

      <View style={s.baris}>
        {laporan.foto ? <Image source={{ uri: urlLengkap(laporan.foto) }} style={s.foto} /> : null}
        <View style={{ flex: 1 }}>
          <Text style={huruf.subjudul} numberOfLines={2}>
            {judulLaporan({ kategori: laporan.kategori, alamat: laporan.lokasi?.alamat, wilayah: laporan.lokasi?.wilayah })}
          </Text>
          <Text style={[huruf.kecil, { marginTop: jarak.xs }]}>
            {laporan.lokasi?.wilayah ? `Kec. ${laporan.lokasi.wilayah} · ` : ''}
            {waktuRelatif(laporan.tanggalLaporan)}
          </Text>
        </View>
      </View>

      <Text style={[huruf.isi, { marginTop: jarak.s }]} numberOfLines={3}>
        {laporan.deskripsi}
      </Text>

      {skor ? (
        <View style={s.skor}>
          <View style={s.nilaiSkor}>
            <Text style={s.nilaiSkorTeks}>{skor.nilai}</Text>
            <Text style={s.nilaiSkorLabel}>skor</Text>
          </View>
          <Text style={[huruf.kecil, { flex: 1 }]}>
            {skor.jumlahPelapor} pelapor · menunggu {skor.lamaMenunggu} hari · {skor.frekuensiBerulang} laporan di fasilitas
            (90 hari)
          </Text>
        </View>
      ) : null}

      {laporan.fasilitas && onBukaFasilitas ? (
        <Pressable accessibilityRole="link" onPress={() => onBukaFasilitas(laporan.fasilitas.id)} style={s.fasilitas}>
          <Ionicons name="business-outline" size={16} color={warna.primer} />
          <Text style={s.fasilitasTeks} numberOfLines={1}>
            {laporan.fasilitas.nama}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={warna.primer} />
        </Pressable>
      ) : null}

      {bisaUbahStatus ? <AksiStatusLaporan laporan={laporan} onBerhasil={onStatusBerubah} /> : null}
    </Kartu>
  );
}

const s = StyleSheet.create({
  atas: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: jarak.s },
  baris: { flexDirection: 'row', gap: jarak.m },
  foto: { width: 64, height: 64, borderRadius: radius.s, backgroundColor: warna.permukaanLembut },
  skor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: jarak.m,
    marginTop: jarak.m,
    padding: jarak.s,
    borderRadius: radius.m,
    backgroundColor: warna.permukaanLembut,
  },
  nilaiSkor: { alignItems: 'center', minWidth: 48 },
  nilaiSkorTeks: { fontSize: 20, fontWeight: '800', color: warna.bahaya },
  nilaiSkorLabel: { fontSize: 11, color: warna.teksLembut },
  fasilitas: { flexDirection: 'row', alignItems: 'center', gap: jarak.xs, marginTop: jarak.m },
  fasilitasTeks: { flex: 1, color: warna.primer, fontWeight: '600' },
});
