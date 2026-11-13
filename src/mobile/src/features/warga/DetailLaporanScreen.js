/**
 * I-03 Detail Laporan — UC04 (mode publik) dan UC05 (mode saya). Pemilik: P3.
 * Spesifikasi objek antarmuka: docs/M8/K02_G03_DPPL2.md (BAB 6, I-03). Tugas: src/docs/tasks/P3.md
 *
 *  O-0301 header (kode, status, kategori, tanggal)   O-0302 foto (ketuk untuk perbesar)
 *  O-0303 lokasi + peta                              O-0304 deskripsi
 *  O-0305 riwayat penanganan: HANYA mode saya (bukaRiwayatLaporan / getRiwayatStatus).
 *  Mode saya + Perlu Revisi: catatan admin + tombol Revisi -> /warga/revisi/<id> (gap G7).
 */
import { Ionicons } from '@expo/vector-icons';
import { STATUS } from '@silembur/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { urlLengkap } from '../../api/client';
import { wargaApi } from '../../api/warga';
import { PetaTampil } from '../../components/map/Peta';
import { Kartu, Layar, LencanaStatus, TampilanGagal, TampilanMemuat, Tombol } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { formatTanggal, judulLaporan, kodeLaporan } from '../../utils/format';
import { useMuatSaatFokus } from './useMuatSaatFokus';

export default function DetailLaporanScreen() {
  const { id, mode } = useLocalSearchParams();
  const modeSaya = mode === 'saya';
  const router = useRouter();
  const [menyegarkan, setMenyegarkan] = useState(false);

  const { data, memuat, error, muatUlang } = useApi(
    () => (modeSaya ? wargaApi.detailSaya(id) : wargaApi.detailPublik(id)),
    [id, modeSaya],
  );
  // Kembali dari layar revisi: status dan riwayat bisa sudah berubah.
  useMuatSaatFokus(muatUlang);

  async function segarkan() {
    setMenyegarkan(true);
    await muatUlang();
    setMenyegarkan(false);
  }

  const laporan = data?.laporan;
  if (memuat && !laporan) return <TampilanMemuat />;
  if (error) {
    return (
      <Layar tepi={[]}>
        <TampilanGagal pesan={error.message} onCobaLagi={muatUlang} />
      </Layar>
    );
  }
  if (!laporan) return null;

  const { lokasi } = laporan;
  const perluRevisi = modeSaya && laporan.status === STATUS.PERLU_REVISI;
  const tampilkanCatatan =
    modeSaya &&
    laporan.catatanVerifikasi?.catatan &&
    [STATUS.PERLU_REVISI, STATUS.DITOLAK].includes(laporan.status);

  return (
    <Layar tepi={['bottom']} onSegarkan={segarkan} menyegarkan={menyegarkan}>
      {/* O-0301 */}
      <Kartu>
        <View style={s.barisAntara}>
          <Text style={s.kode}>{kodeLaporan(laporan.id)}</Text>
          <LencanaStatus status={laporan.status} />
        </View>
        <Text style={[huruf.subjudul, { marginTop: jarak.s }]}>
          {judulLaporan({ kategori: laporan.kategori, alamat: lokasi?.alamat, wilayah: lokasi?.wilayah })}
        </Text>
        <InfoBaris ikon="pricetag-outline" teks={laporan.kategori} />
        <InfoBaris ikon="calendar-outline" teks={formatTanggal(laporan.tanggalLaporan)} />
      </Kartu>

      {tampilkanCatatan ? (
        <Kartu style={s.kartuCatatan}>
          <View style={s.baris}>
            <Ionicons name="alert-circle-outline" size={18} color={warna.bahaya} />
            <Text style={[huruf.subjudul, s.judulCatatan]}>Catatan admin</Text>
          </View>
          <Text style={[huruf.isi, { marginTop: jarak.s }]}>{laporan.catatanVerifikasi.catatan}</Text>
          {perluRevisi ? (
            <Tombol
              judul="Revisi Laporan"
              ikon="create-outline"
              onPress={() => router.push(`/warga/revisi/${laporan.id}`)}
              style={{ marginTop: jarak.m }}
            />
          ) : null}
        </Kartu>
      ) : null}

      {/* O-0302 */}
      <FotoLaporan uri={urlLengkap(laporan.foto)} />

      {/* O-0303 */}
      <Kartu>
        <Text style={s.judulBagian}>Lokasi</Text>
        {laporan.fasilitas?.nama ? <Text style={huruf.isi}>{laporan.fasilitas.nama}</Text> : null}
        <InfoBaris ikon="location-outline" teks={lokasi?.alamat || 'Alamat tidak tersedia'} />
        {lokasi?.wilayah ? <InfoBaris ikon="map-outline" teks={`Kec. ${lokasi.wilayah}`} /> : null}
        {lokasi ? (
          <View style={{ marginTop: jarak.m }}>
            <PetaTampil
              titik={[
                {
                  id: laporan.id,
                  latitude: lokasi.latitude,
                  longitude: lokasi.longitude,
                  judul: laporan.kategori,
                },
              ]}
            />
          </View>
        ) : null}
      </Kartu>

      {/* O-0304 */}
      <Kartu>
        <Text style={s.judulBagian}>Deskripsi</Text>
        <Text style={huruf.isi}>{laporan.deskripsi}</Text>
      </Kartu>

      {/* O-0305 — hanya Laporan Saya */}
      {modeSaya ? <RiwayatPenanganan riwayat={laporan.riwayat ?? []} /> : null}
    </Layar>
  );
}

function InfoBaris({ ikon, teks }) {
  return (
    <View style={[s.baris, { marginTop: jarak.xs }]}>
      <Ionicons name={ikon} size={14} color={warna.teksLembut} />
      <Text style={[huruf.kecil, { marginLeft: jarak.xs, flexShrink: 1 }]}>{teks}</Text>
    </View>
  );
}

function FotoLaporan({ uri }) {
  const [besar, setBesar] = useState(false);
  if (!uri) return null;
  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel="Foto kerusakan, ketuk untuk memperbesar"
        onPress={() => setBesar(true)}
        style={s.fotoWadah}
      >
        <Image source={{ uri }} style={s.foto} resizeMode="cover" />
        <View style={s.ikonPerbesar}>
          <Ionicons name="expand-outline" size={16} color={warna.putih} />
        </View>
      </Pressable>
      <Modal visible={besar} transparent animationType="fade" onRequestClose={() => setBesar(false)}>
        <SafeAreaView style={s.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tutup foto"
            onPress={() => setBesar(false)}
            style={s.tutup}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color={warna.putih} />
          </Pressable>
          <Image source={{ uri }} style={s.fotoBesar} resizeMode="contain" />
        </SafeAreaView>
      </Modal>
    </>
  );
}

function RiwayatPenanganan({ riwayat }) {
  return (
    <Kartu>
      <Text style={s.judulBagian}>Riwayat Penanganan</Text>
      {riwayat.length === 0 ? <Text style={huruf.kecil}>Belum ada riwayat</Text> : null}
      {riwayat.map((r, i) => {
        const terakhir = i === riwayat.length - 1;
        return (
          <View key={r.id} style={s.riwayat}>
            <View style={s.garisWaktu}>
              <View style={[s.titik, terakhir && s.titikAktif]} />
              {terakhir ? null : <View style={s.garis} />}
            </View>
            <View style={s.riwayatIsi}>
              <Text style={[huruf.isi, { fontWeight: '700' }]}>{r.statusBaru}</Text>
              <Text style={huruf.kecil}>{formatTanggal(r.tanggal)}</Text>
              {r.deskripsi ? <Text style={[huruf.isi, { marginTop: jarak.xs }]}>{r.deskripsi}</Text> : null}
            </View>
          </View>
        );
      })}
    </Kartu>
  );
}

const s = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center' },
  barisAntara: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kode: { ...huruf.label, fontSize: 13, color: warna.primer },
  judulBagian: { ...huruf.subjudul, marginBottom: jarak.s },
  kartuCatatan: { backgroundColor: warna.bahayaMuda },
  judulCatatan: { marginLeft: jarak.s, color: warna.bahaya },
  fotoWadah: { marginBottom: jarak.m, borderRadius: radius.l, overflow: 'hidden' },
  foto: { width: '100%', height: 220, backgroundColor: warna.permukaanLembut },
  ikonPerbesar: {
    position: 'absolute',
    right: jarak.s,
    bottom: jarak.s,
    padding: 6,
    borderRadius: radius.pil,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  tutup: { position: 'absolute', top: jarak.xxl, right: jarak.l, zIndex: 1, padding: jarak.s },
  fotoBesar: { width: '100%', height: '80%' },
  riwayat: { flexDirection: 'row' },
  garisWaktu: { width: 20, alignItems: 'center' },
  titik: { width: 12, height: 12, borderRadius: 6, backgroundColor: warna.garis, marginTop: 4 },
  titikAktif: { backgroundColor: warna.primer },
  garis: { flex: 1, width: 2, backgroundColor: warna.garis, marginVertical: 2 },
  riwayatIsi: { flex: 1, paddingLeft: jarak.s, paddingBottom: jarak.l },
});
