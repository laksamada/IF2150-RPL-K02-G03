/**
 * Kartu laporan masuk untuk I-05 (O-0501 info laporan, O-0502 foto). Pemilik: P4.
 */
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { urlLengkap } from '../../api/client';
import { Kartu, LencanaStatus } from '../../components/ui';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { judulLaporan, kodeLaporan, waktuRelatif } from '../../utils/format';

export default function KartuLaporanMasuk({ laporan, onTekan }) {
  const { lokasi } = laporan;
  return (
    <Kartu onPress={onTekan}>
      <View style={s.baris}>
        <Image source={{ uri: urlLengkap(laporan.foto) }} style={s.foto} accessibilityLabel="Foto kerusakan" />
        <View style={s.isi}>
          <Text style={huruf.label}>
            {kodeLaporan(laporan.id)} · {laporan.kategori}
          </Text>
          <Text style={s.judul} numberOfLines={2}>
            {judulLaporan({ kategori: laporan.kategori, alamat: lokasi?.alamat, wilayah: lokasi?.wilayah })}
          </Text>
          <View style={s.barisKecil}>
            <Ionicons name="location-outline" size={14} color={warna.teksLembut} />
            <Text style={huruf.kecil} numberOfLines={1}>
              {' '}
              {lokasi?.wilayah ? `Kec. ${lokasi.wilayah}` : '-'}
            </Text>
          </View>
          <Text style={huruf.kecil}>Dilaporkan {waktuRelatif(laporan.tanggalLaporan)}</Text>
          <View style={{ marginTop: jarak.s }}>
            <LencanaStatus status={laporan.status} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={warna.teksLembut} style={{ alignSelf: 'center' }} />
      </View>
    </Kartu>
  );
}

const s = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'flex-start', gap: jarak.m },
  foto: { width: 84, height: 96, borderRadius: radius.s, backgroundColor: warna.permukaanLembut },
  isi: { flex: 1 },
  judul: { ...huruf.isi, fontWeight: '700', marginVertical: 2 },
  barisKecil: { flexDirection: 'row', alignItems: 'center' },
});
