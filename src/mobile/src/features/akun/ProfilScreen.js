/**
 * Profil & keluar (dipakai ketiga peran). Pemilik: P1.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../../auth/AuthContext';
import { Kartu, Layar, Tombol } from '../../components/ui';
import { huruf, jarak } from '../../theme/tokens';

const NAMA_PERAN = { PELAPOR: 'Masyarakat', ADMIN: 'Admin', PEMDA: 'Pemerintah Daerah' };

export default function ProfilScreen() {
  const { pengguna, keluar, segarkanPengguna } = useAuth();
  // Data profil (mis. jumlah laporan) dimuat ulang setiap tab Profil dibuka.
  useFocusEffect(
    useCallback(() => {
      segarkanPengguna();
    }, [segarkanPengguna]),
  );
  if (!pengguna) return null;
  return (
    <Layar>
      <Text style={[huruf.judul, { marginBottom: jarak.l }]}>Profil</Text>
      <Kartu>
        <Text style={huruf.subjudul}>{pengguna.nama}</Text>
        <Text style={huruf.kecil}>{pengguna.email}</Text>
        <View style={{ marginTop: jarak.m }}>
          <Text style={huruf.isi}>Peran: {NAMA_PERAN[pengguna.peran] ?? pengguna.peran}</Text>
          {pengguna.namaInstansi ? <Text style={huruf.isi}>Instansi: {pengguna.namaInstansi}</Text> : null}
          {pengguna.wilayahKerja ? <Text style={huruf.isi}>Wilayah kerja: {pengguna.wilayahKerja}</Text> : null}
          {pengguna.peran === 'PELAPOR' ? (
            <Text style={huruf.isi}>Jumlah laporan: {pengguna.jumlahLaporan}</Text>
          ) : null}
        </View>
      </Kartu>
      <Tombol judul="Keluar" varian="bahaya" ikon="log-out-outline" onPress={keluar} />
    </Layar>
  );
}
