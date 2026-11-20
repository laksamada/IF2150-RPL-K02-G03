/**
 * I-06 Verifikasi Laporan — UC02. Pemilik: P4.
 * Spesifikasi objek antarmuka: docs/M8/K02_G03_DPPL2.md (BAB 6, I-06). Tugas: src/docs/tasks/P4.md
 *
 *  - O-0601 detail laporan (admin boleh melihat nama pelapor), O-0602 foto (ketuk untuk memperbesar), lokasi di peta.
 *  - O-0605 pratinjau skor prioritas READ-ONLY dari server (gap G3: slider skor input admin dihapus).
 *  - O-0606 tombol Setujui / Tolak / Minta Revisi + catatan alasan (KF05). Catatan wajib untuk Tolak & Revisi
 *    (hanya pengecekan UX; server tetap memvalidasi).
 * Setelah keputusan tersimpan, kembali ke I-05 (yang memuat ulang daftarnya saat difokuskan).
 */
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { KEPUTUSAN, STATUS } from '@silembur/shared';
import { adminApi } from '../../api/admin';
import { urlLengkap } from '../../api/client';
import { beritahu, konfirmasi } from '../../components/dialog/konfirmasi';
import { PetaTampil } from '../../components/map/Peta';
import { Isian, Kartu, Layar, LencanaStatus, TampilanGagal, TampilanMemuat, Tombol } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { formatTanggal, judulLaporan, kodeLaporan } from '../../utils/format';

const BATAS_CATATAN = 500;

const LABEL_KEPUTUSAN = {
  [KEPUTUSAN.DISETUJUI]: 'Setujui',
  [KEPUTUSAN.DITOLAK]: 'Tolak',
  [KEPUTUSAN.REVISI]: 'Minta Revisi',
};

const PESAN_KONFIRMASI = {
  [KEPUTUSAN.DISETUJUI]: 'Laporan akan diteruskan ke pemerintah daerah dan skor prioritasnya dihitung otomatis.',
  [KEPUTUSAN.DITOLAK]: 'Laporan akan ditolak dan tidak diteruskan ke pemerintah daerah.',
  [KEPUTUSAN.REVISI]: 'Pelapor akan diminta memperbaiki laporannya.',
};

function BarisInfo({ ikon, label, nilai }) {
  return (
    <View style={s.barisInfo}>
      <Ionicons name={ikon} size={16} color={warna.teksLembut} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={huruf.label}>{label}</Text>
        <Text style={huruf.isi}>{nilai || '-'}</Text>
      </View>
    </View>
  );
}

function KomponenSkor({ label, nilai }) {
  return (
    <View style={s.komponenSkor}>
      <Text style={s.komponenNilai}>{nilai}</Text>
      <Text style={[huruf.kecil, { textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}

export default function VerifikasiScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, memuat, error, muatUlang } = useApi(() => adminApi.detailLaporan(id), [id]);
  const [catatan, setCatatan] = useState('');
  const [errorCatatan, setErrorCatatan] = useState(null);
  const [mengirim, setMengirim] = useState(null); // keputusan yang sedang dikirim
  const [fotoBesar, setFotoBesar] = useState(false);

  if (memuat && !data) return <TampilanMemuat />;
  if (error) return <TampilanGagal pesan={error.message} onCobaLagi={muatUlang} />;

  const laporan = data.laporan;
  const { lokasi, pratinjauSkor } = laporan;
  const bisaDiverifikasi = laporan.status === STATUS.MENUNGGU_VERIFIKASI;
  const judul = judulLaporan({ kategori: laporan.kategori, alamat: lokasi?.alamat, wilayah: lokasi?.wilayah });

  async function putuskan(keputusan) {
    const isi = catatan.trim();
    if (keputusan !== KEPUTUSAN.DISETUJUI && !isi) {
      setErrorCatatan('Catatan alasan wajib diisi untuk keputusan Tolak atau Minta Revisi');
      return;
    }
    setErrorCatatan(null);
    const yakin = await konfirmasi({
      judul: `${LABEL_KEPUTUSAN[keputusan]} ${kodeLaporan(laporan.id)}?`,
      pesan: PESAN_KONFIRMASI[keputusan],
      tombolYa: LABEL_KEPUTUSAN[keputusan],
      berbahaya: keputusan === KEPUTUSAN.DITOLAK,
    });
    if (!yakin) return;

    setMengirim(keputusan);
    try {
      const hasil = await adminApi.verifikasi(laporan.id, { keputusan, catatan: isi });
      const infoSkor = hasil.skor === null || hasil.skor === undefined ? '' : ` Skor prioritas: ${hasil.skor}.`;
      beritahu(
        'Keputusan tersimpan',
        `${kodeLaporan(laporan.id)} kini berstatus "${hasil.laporan?.status ?? keputusan}".${infoSkor} Pelapor sudah diberi notifikasi.`,
      );
      router.back();
    } catch (err) {
      const pesanCatatan = err.details?.find((d) => d.field === 'catatan')?.pesan;
      if (pesanCatatan) setErrorCatatan(pesanCatatan);
      beritahu('Gagal menyimpan keputusan', err.message);
      if (err.status === 409 || err.status === 404) muatUlang();
    } finally {
      setMengirim(null);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Layar tepi={['bottom']}>
        {/* O-0602 foto kerusakan */}
        <Pressable onPress={() => setFotoBesar(true)} accessibilityRole="imagebutton" accessibilityLabel="Perbesar foto kerusakan">
          <Image source={{ uri: urlLengkap(laporan.foto) }} style={s.foto} />
          <View style={s.ikonPerbesar}>
            <Ionicons name="expand-outline" size={18} color={warna.putih} />
          </View>
        </Pressable>

        {/* O-0601 detail laporan */}
        <Kartu style={{ marginTop: jarak.m }}>
          <View style={s.barisJudul}>
            <Text style={huruf.label}>
              {kodeLaporan(laporan.id)} · {laporan.kategori}
            </Text>
            <LencanaStatus status={laporan.status} />
          </View>
          <Text style={[huruf.subjudul, { marginTop: jarak.s }]}>{judul}</Text>
          <Text style={[huruf.isi, { marginTop: jarak.s }]}>{laporan.deskripsi}</Text>
          <View style={s.garis} />
          <BarisInfo ikon="calendar-outline" label="Tanggal laporan" nilai={formatTanggal(laporan.tanggalLaporan)} />
          <BarisInfo
            ikon="person-outline"
            label="Pelapor"
            nilai={laporan.pelapor ? `${laporan.pelapor.nama} (${laporan.pelapor.email})` : '-'}
          />
          <BarisInfo ikon="business-outline" label="Fasilitas" nilai={laporan.fasilitas?.nama} />
        </Kartu>

        {/* Lokasi */}
        <Kartu>
          <Text style={[huruf.subjudul, { marginBottom: jarak.s }]}>Lokasi</Text>
          {lokasi ? (
            <>
              <PetaTampil titik={[{ id: laporan.id, latitude: lokasi.latitude, longitude: lokasi.longitude, judul }]} />
              <Text style={[huruf.isi, { marginTop: jarak.s }]}>{lokasi.alamat || '-'}</Text>
              <Text style={huruf.kecil}>
                Kec. {lokasi.wilayah} · {lokasi.latitude}, {lokasi.longitude}
              </Text>
            </>
          ) : (
            <Text style={huruf.kecil}>Lokasi tidak tersedia</Text>
          )}
        </Kartu>

        {/* O-0605 pratinjau skor (read-only, gap G3) */}
        <Kartu>
          <View style={s.barisJudul}>
            <Text style={huruf.subjudul}>Pratinjau skor prioritas</Text>
            <View style={s.nilaiSkor}>
              <Text style={s.nilaiSkorTeks}>{pratinjauSkor.nilai}</Text>
            </View>
          </View>
          <View style={s.barisKomponen}>
            <KomponenSkor label="Jumlah pelapor" nilai={pratinjauSkor.jumlahPelapor} />
            <KomponenSkor label="Hari menunggu" nilai={pratinjauSkor.lamaMenunggu} />
            <KomponenSkor label="Laporan di fasilitas" nilai={pratinjauSkor.frekuensiBerulang} />
          </View>
          <Text style={huruf.kecil}>
            Skor dihitung otomatis oleh sistem dari kategori, jumlah pelapor, lama menunggu, dan frekuensi kerusakan.
            {bisaDiverifikasi ? ' Skor disimpan saat laporan disetujui.' : ''}
            {laporan.skor !== null && laporan.skor !== undefined ? ` Skor tersimpan: ${laporan.skor}.` : ''}
          </Text>
        </Kartu>

        {/* Histori verifikasi sebelumnya (mis. laporan hasil revisi) */}
        {laporan.verifikasi?.length ? (
          <Kartu>
            <Text style={[huruf.subjudul, { marginBottom: jarak.s }]}>Riwayat verifikasi</Text>
            {laporan.verifikasi.map((v, i) => (
              <View key={`${v.waktu}-${i}`} style={s.itemRiwayat}>
                <Text style={[huruf.isi, { fontWeight: '700' }]}>{v.keputusan}</Text>
                {v.catatan ? <Text style={huruf.isi}>{v.catatan}</Text> : null}
                <Text style={huruf.kecil}>
                  {formatTanggal(v.waktu)} · {v.admin}
                </Text>
              </View>
            ))}
          </Kartu>
        ) : null}

        {/* O-0606 keputusan */}
        {bisaDiverifikasi ? (
          <Kartu>
            <Text style={[huruf.subjudul, { marginBottom: jarak.m }]}>Keputusan verifikasi</Text>
            <Isian
              label="Catatan alasan"
              placeholder="Wajib diisi untuk Tolak atau Minta Revisi"
              value={catatan}
              onChangeText={(t) => {
                setCatatan(t);
                if (errorCatatan && t.trim()) setErrorCatatan(null);
              }}
              multiline
              maxLength={BATAS_CATATAN}
              textAlignVertical="top"
              style={s.isianCatatan}
              error={errorCatatan}
              editable={!mengirim}
            />
            <Text style={[huruf.kecil, s.penghitung]}>
              {catatan.length}/{BATAS_CATATAN}
            </Text>
            <Tombol
              judul="Setujui"
              ikon="checkmark-circle-outline"
              onPress={() => putuskan(KEPUTUSAN.DISETUJUI)}
              memuat={mengirim === KEPUTUSAN.DISETUJUI}
              nonaktif={!!mengirim}
            />
            <View style={s.barisTombol}>
              <Tombol
                judul="Minta Revisi"
                varian="sekunder"
                ikon="create-outline"
                onPress={() => putuskan(KEPUTUSAN.REVISI)}
                memuat={mengirim === KEPUTUSAN.REVISI}
                nonaktif={!!mengirim}
                style={{ flex: 1 }}
              />
              <Tombol
                judul="Tolak"
                varian="bahaya"
                ikon="close-circle-outline"
                onPress={() => putuskan(KEPUTUSAN.DITOLAK)}
                memuat={mengirim === KEPUTUSAN.DITOLAK}
                nonaktif={!!mengirim}
                style={{ flex: 1 }}
              />
            </View>
          </Kartu>
        ) : (
          <Kartu style={{ backgroundColor: warna.permukaanLembut }}>
            <Text style={huruf.isi}>
              Laporan ini sudah tidak menunggu verifikasi (status: {laporan.status}), sehingga keputusan tidak dapat diubah.
            </Text>
          </Kartu>
        )}

        <Modal visible={fotoBesar} transparent animationType="fade" onRequestClose={() => setFotoBesar(false)}>
          <Pressable style={s.latarModal} onPress={() => setFotoBesar(false)} accessibilityLabel="Tutup foto">
            <Image source={{ uri: urlLengkap(laporan.foto) }} style={s.fotoBesar} resizeMode="contain" />
            <Text style={s.tutupModal}>Ketuk untuk menutup</Text>
          </Pressable>
        </Modal>
      </Layar>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  foto: { width: '100%', height: 220, borderRadius: radius.l, backgroundColor: warna.permukaanLembut },
  ikonPerbesar: {
    position: 'absolute',
    right: jarak.m,
    bottom: jarak.m,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.pil,
    padding: jarak.s,
  },
  barisJudul: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: jarak.s },
  garis: { height: 1, backgroundColor: warna.garis, marginVertical: jarak.m },
  barisInfo: { flexDirection: 'row', gap: jarak.s, marginBottom: jarak.s },
  nilaiSkor: {
    minWidth: 56,
    paddingHorizontal: jarak.m,
    paddingVertical: jarak.xs,
    borderRadius: radius.pil,
    backgroundColor: warna.primerMuda,
    alignItems: 'center',
  },
  nilaiSkorTeks: { fontSize: 20, fontWeight: '800', color: warna.primer },
  barisKomponen: { flexDirection: 'row', gap: jarak.s, marginVertical: jarak.m },
  komponenSkor: {
    flex: 1,
    backgroundColor: warna.permukaanLembut,
    borderRadius: radius.m,
    paddingVertical: jarak.s,
    alignItems: 'center',
  },
  komponenNilai: { fontSize: 18, fontWeight: '700', color: warna.teks },
  itemRiwayat: { paddingVertical: jarak.s, borderTopWidth: 1, borderTopColor: warna.garis },
  isianCatatan: { minHeight: 96 },
  penghitung: { textAlign: 'right', marginTop: -jarak.m, marginBottom: jarak.m },
  barisTombol: { flexDirection: 'row', gap: jarak.m, marginTop: jarak.m },
  latarModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  fotoBesar: { width: '100%', height: '80%' },
  tutupModal: { color: warna.putih, marginTop: jarak.m },
});
