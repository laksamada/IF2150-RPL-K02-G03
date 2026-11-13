/**
 * O-0204 Kartu laporan (dipakai Beranda dan Laporan Saya). Pemilik: P3.
 * Tidak menampilkan identitas pelapor (KNF02).
 */
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { urlLengkap } from '../../api/client';
import { Kartu, LencanaStatus, Tombol } from '../../components/ui';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { judulLaporan, kodeLaporan, waktuRelatif } from '../../utils/format';

export default function KartuLaporan({ laporan, onDetail }) {
  const { lokasi } = laporan;
  const foto = urlLengkap(laporan.foto);
  return (
    <Kartu onPress={onDetail} style={s.kartu}>
      {foto ? <Image source={{ uri: foto }} style={s.foto} resizeMode="cover" accessibilityLabel="Foto kerusakan" /> : null}
      <View style={s.isi}>
        <View style={s.barisAtas}>
          <Text style={s.kategori}>{laporan.kategori}</Text>
          <Text style={huruf.kecil}>{waktuRelatif(laporan.tanggalLaporan)}</Text>
        </View>
        <Text style={huruf.subjudul} numberOfLines={2}>
          {judulLaporan({ kategori: laporan.kategori, alamat: lokasi?.alamat, wilayah: lokasi?.wilayah })}
        </Text>
        <View style={s.baris}>
          <Ionicons name="location-outline" size={14} color={warna.teksLembut} />
          <Text style={[huruf.kecil, { marginLeft: jarak.xs }]}>
            {lokasi?.wilayah ? `Kec. ${lokasi.wilayah}` : 'Lokasi tidak tersedia'} · {kodeLaporan(laporan.id)}
          </Text>
        </View>
        <View style={s.barisBawah}>
          <LencanaStatus status={laporan.status} />
          <Tombol judul="Detail" varian="sekunder" onPress={onDetail} style={s.tombol} />
        </View>
      </View>
    </Kartu>
  );
}

const s = StyleSheet.create({
  kartu: { padding: 0, overflow: 'hidden' },
  foto: { width: '100%', height: 140, backgroundColor: warna.permukaanLembut },
  isi: { padding: jarak.l },
  barisAtas: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: jarak.xs },
  kategori: { ...huruf.label, color: warna.primer, textTransform: 'uppercase' },
  baris: { flexDirection: 'row', alignItems: 'center', marginTop: jarak.xs },
  barisBawah: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: jarak.m,
  },
  tombol: { minHeight: 36, paddingHorizontal: jarak.l, borderRadius: radius.pil },
});
