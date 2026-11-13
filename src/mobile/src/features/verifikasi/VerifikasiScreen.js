/**
 * I-06 Verifikasi Laporan — UC02. Pemilik: P4.
 * Spesifikasi objek antarmuka: docs/M8/K02_G03_DPPL2.md (BAB 6, I-06). Tugas: src/docs/tasks/P4.md
 * Detail laporan (O-0601/0602), pratinjau skor read-only (O-0605, gap G3), catatan alasan,
 * tombol Setujui / Tolak / Minta Revisi (O-0606, KF05). Aturan bisnis (skor, transisi status) ada di server.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { KEPUTUSAN, STATUS } from '@silembur/shared';
import { adminApi } from '../../api/admin';
import { urlLengkap } from '../../api/client';
import { beritahu, konfirmasi } from '../../components/dialog/konfirmasi';
import { Isian, Kartu, Layar, LencanaStatus, TampilanGagal, TampilanMemuat, Tombol } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { formatTanggal, judulLaporan, kodeLaporan } from '../../utils/format';

const BATAS_CATATAN = 500;

function BarisSkor({ label, nilai }) {
  return (
    <View style={s.barisSkor}>
      <Text style={huruf.isi}>{label}</Text>
      <Text style={[huruf.isi, { fontWeight: '700' }]}>{nilai}</Text>
    </View>
  );
}

export default function VerifikasiScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, memuat, error, muatUlang } = useApi(() => adminApi.detailLaporan(id), [id]);
  const [catatan, setCatatan] = useState('');
  const [errorCatatan, setErrorCatatan] = useState('');
  const [mengirim, setMengirim] = useState(null);

  async function putuskan(keputusan) {
    // Validasi di sini hanya untuk UX; server tetap memeriksa (KF05).
    if (keputusan !== KEPUTUSAN.DISETUJUI && !catatan.trim()) {
      setErrorCatatan('Catatan alasan wajib diisi untuk Tolak atau Minta Revisi');
      return;
    }
    setErrorCatatan('');

    if (keputusan === KEPUTUSAN.DITOLAK) {
      const yakin = await konfirmasi({
        judul: 'Tolak laporan?',
        pesan: 'Laporan yang ditolak tidak dapat diverifikasi ulang.',
        tombolYa: 'Tolak',
        berbahaya: true,
      });
      if (!yakin) return;
    }

    setMengirim(keputusan);
    try {
      await adminApi.verifikasi(id, { keputusan, catatan: catatan.trim() });
      router.back(); // I-05 memuat ulang otomatis saat kembali fokus
    } catch (err) {
      beritahu('Gagal menyimpan keputusan', err.message); // termasuk 409 bila sudah diputuskan admin lain
    } finally {
      setMengirim(null);
    }
  }

  if (memuat && !data) return <Layar tepi={[]}><TampilanMemuat /></Layar>;
  if (error || !data) {
    return (
      <Layar tepi={[]}>
        <TampilanGagal pesan={error?.message} onCobaLagi={muatUlang} />
      </Layar>
    );
  }

  const l = data.laporan;
  const p = l.pratinjauSkor;
  const bisaMemutuskan = l.status === STATUS.MENUNGGU_VERIFIKASI;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Layar tepi={[]}>
        <Image source={{ uri: urlLengkap(l.foto) }} style={s.foto} accessibilityLabel="Foto kerusakan" />
        <Text style={[huruf.label, { marginTop: jarak.m }]}>{kodeLaporan(l.id)} · {l.kategori}</Text>
        <Text style={huruf.judul}>
          {judulLaporan({ kategori: l.kategori, alamat: l.lokasi?.alamat, wilayah: l.lokasi?.wilayah })}
        </Text>
        <View style={{ marginVertical: jarak.s }}>
          <LencanaStatus status={l.status} />
        </View>
        <Text style={[huruf.isi, { marginVertical: jarak.s }]}>{l.deskripsi}</Text>
        <Text style={huruf.kecil}>Lokasi: {l.lokasi?.alamat ?? '-'}{l.lokasi?.wilayah ? ` (${l.lokasi.wilayah})` : ''}</Text>
        <Text style={huruf.kecil}>Pelapor: {l.pelapor.nama} · {l.pelapor.email}</Text>
        <Text style={[huruf.kecil, { marginBottom: jarak.l }]}>Dilaporkan {formatTanggal(l.tanggalLaporan)}</Text>

        <Kartu>
          <Text style={huruf.subjudul}>Pratinjau skor prioritas</Text>
          <Text style={[huruf.kecil, { marginBottom: jarak.s }]}>
            Dihitung otomatis oleh sistem dan tidak dapat diubah. Skor disimpan setelah laporan disetujui.
          </Text>
          <Text style={s.nilaiSkor}>{p.nilai}</Text>
          <BarisSkor label="Jumlah pelapor" nilai={p.jumlahPelapor} />
          <BarisSkor label="Lama menunggu (hari)" nilai={p.lamaMenunggu} />
          <BarisSkor label="Kerusakan berulang di fasilitas" nilai={p.frekuensiBerulang} />
        </Kartu>

        {l.verifikasi.length > 0 ? (
          <Kartu>
            <Text style={huruf.subjudul}>Riwayat verifikasi</Text>
            {l.verifikasi.map((v, i) => (
              <Text key={`${v.waktu}-${i}`} style={[huruf.kecil, { marginTop: jarak.xs }]}>
                {formatTanggal(v.waktu)} · {v.keputusan} oleh {v.admin}: {v.catatan || '-'}
              </Text>
            ))}
          </Kartu>
        ) : null}

        {bisaMemutuskan ? (
          <View style={{ marginTop: jarak.s }}>
            <Isian
              label="Catatan alasan"
              wajib
              multiline
              maxLength={BATAS_CATATAN}
              value={catatan}
              onChangeText={(t) => {
                setCatatan(t);
                if (errorCatatan) setErrorCatatan('');
              }}
              error={errorCatatan}
              placeholder="Wajib diisi untuk Tolak atau Minta Revisi"
              style={{ minHeight: 90, textAlignVertical: 'top' }}
            />
            <Tombol
              judul="Setujui"
              ikon="checkmark-circle-outline"
              memuat={mengirim === KEPUTUSAN.DISETUJUI}
              nonaktif={!!mengirim}
              onPress={() => putuskan(KEPUTUSAN.DISETUJUI)}
            />
            <Tombol
              judul="Minta Revisi"
              varian="sekunder"
              ikon="create-outline"
              style={{ marginTop: jarak.s }}
              memuat={mengirim === KEPUTUSAN.REVISI}
              nonaktif={!!mengirim}
              onPress={() => putuskan(KEPUTUSAN.REVISI)}
            />
            <Tombol
              judul="Tolak"
              varian="bahaya"
              ikon="close-circle-outline"
              style={{ marginTop: jarak.s }}
              memuat={mengirim === KEPUTUSAN.DITOLAK}
              nonaktif={!!mengirim}
              onPress={() => putuskan(KEPUTUSAN.DITOLAK)}
            />
          </View>
        ) : (
          <Text style={[huruf.kecil, { marginTop: jarak.s }]}>
            Laporan ini sudah tidak berstatus Menunggu Verifikasi sehingga keputusan tidak dapat diubah.
          </Text>
        )}
      </Layar>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  foto: { width: '100%', height: 220, borderRadius: radius.l, backgroundColor: warna.permukaanLembut },
  nilaiSkor: { fontSize: 36, fontWeight: '800', color: warna.primer, marginVertical: jarak.s },
  barisSkor: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: jarak.xs },
});
