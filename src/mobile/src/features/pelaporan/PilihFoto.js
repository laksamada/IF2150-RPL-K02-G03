import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { beritahu } from '../../components/dialog/konfirmasi';
import { Tombol } from '../../components/ui';
import { huruf, jarak, radius, warna } from '../../theme/tokens';

const OPSI = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false };

function keNilai(hasil) {
  if (hasil.canceled || !hasil.assets?.length) return null;
  const a = hasil.assets[0];
  return { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg', fileName: a.fileName ?? 'foto.jpg', baru: true };
}

export default function PilihFoto({ nilai, onUbah }) {
  async function ambilFoto() {
    try {
      const izin = await ImagePicker.requestCameraPermissionsAsync();
      if (!izin.granted) {
        beritahu('Izin kamera ditolak', 'Izinkan akses kamera di pengaturan, atau pilih foto dari galeri.');
        return;
      }
      const foto = keNilai(await ImagePicker.launchCameraAsync(OPSI));
      if (foto) onUbah(foto);
    } catch {
      beritahu('Foto gagal diambil', 'Coba lagi atau pilih foto dari galeri.');
    }
  }

  async function pilihGaleri() {
    try {
      const foto = keNilai(await ImagePicker.launchImageLibraryAsync(OPSI));
      if (foto) onUbah(foto);
    } catch {
      beritahu('Foto gagal dipilih', 'Coba lagi atau ambil foto dengan kamera.');
    }
  }

  return (
    <View>
      {nilai ? (
        <View style={s.pratinjau}>
          <Image source={{ uri: nilai.uri }} style={s.gambar} resizeMode="cover" accessibilityLabel="Pratinjau foto kerusakan" />
          {nilai.baru ? (
            <Pressable onPress={() => onUbah(null)} style={s.hapus} accessibilityLabel="Hapus foto" hitSlop={8}>
              <Ionicons name="close" size={18} color={warna.putih} />
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={[s.pratinjau, s.kosong]}>
          <Ionicons name="camera-outline" size={36} color={warna.teksLembut} />
          <Text style={[huruf.kecil, { marginTop: jarak.xs }]}>Belum ada foto kerusakan</Text>
        </View>
      )}
      <View style={s.baris}>
        <Tombol judul="Ambil Foto" ikon="camera" varian="sekunder" onPress={ambilFoto} style={s.tombol} />
        <Tombol judul="Pilih Galeri" ikon="images" varian="sekunder" onPress={pilihGaleri} style={s.tombol} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pratinjau: { height: 190, borderRadius: radius.m, overflow: 'hidden', backgroundColor: warna.permukaanLembut },
  kosong: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: warna.garis },
  gambar: { width: '100%', height: '100%' },
  hapus: {
    position: 'absolute',
    top: jarak.s,
    right: jarak.s,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.pil,
    padding: jarak.xs,
  },
  baris: { flexDirection: 'row', gap: jarak.s, marginTop: jarak.s },
  tombol: { flex: 1 },
});