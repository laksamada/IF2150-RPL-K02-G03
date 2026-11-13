/**
 * I-10 Detail Fasilitas — UC08 langkah 3-4 (KF22, KF23). Pemilik: P5.
 * Dipakai PEMDA (/pemda/fasilitas/:id) dan ADMIN (/admin/fasilitas/:id, gap G10).
 *
 *  - O-1001 detail fasilitas + peta, O-1002 laporan yang menunjuk fasilitas,
 *    O-1004 riwayat status semua laporan (terbaru dulu) beserta foto, O-1005 perbarui status (khusus PEMDA, gap G8).
 *  - Tanpa nama pelapor (KNF02, gap G9).
 */
import { Ionicons } from '@expo/vector-icons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { PERAN, PESAN } from '@silembur/shared';
import { urlLengkap } from '../../api/client';
import { pemdaApi } from '../../api/pemda';
import { useAuth } from '../../auth/AuthContext';
import { PetaTampil } from '../../components/map/Peta';
import { Kartu, Layar, TampilanGagal, TampilanKosong, TampilanMemuat } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { formatTanggal, kodeLaporan } from '../../utils/format';
import KartuLaporanPrioritas from '../prioritas/KartuLaporanPrioritas';

export default function DetailFasilitasScreen() {
  const { id } = useLocalSearchParams();
  const { pengguna } = useAuth();
  const bisaUbahStatus = pengguna?.peran === PERAN.PEMDA;
  const { data, memuat, error, muatUlang } = useApi(() => pemdaApi.detailFasilitas(id), [id]);

  if (memuat && !data) return <TampilanMemuat />;
  if (error) {
    if (error.status === 404) return <TampilanKosong ikon="business-outline" pesan={PESAN.FASILITAS_TIDAK_DITEMUKAN} />;
    return <TampilanGagal pesan={error.message || PESAN.MUAT_ULANG} onCobaLagi={muatUlang} />;
  }
  if (!data) return null;

  const { fasilitas, laporan = [], riwayat = [] } = data;
  const fotoLaporan = Object.fromEntries(laporan.map((l) => [l.id, l.foto]));

  return (
    <Layar tepi={[]}>
      <Kartu>
        <Text style={huruf.judul}>{fasilitas.nama}</Text>
        <Text style={[huruf.kecil, { marginTop: jarak.xs }]}>{fasilitas.kategori}</Text>
        <View style={s.baris}>
          <Ionicons name="location-outline" size={16} color={warna.teksLembut} />
          <Text style={[huruf.isi, { flex: 1 }]}>{fasilitas.lokasi}</Text>
        </View>
        <Text style={[huruf.kecil, { marginBottom: jarak.m }]}>Kec. {fasilitas.wilayah}</Text>
        <PetaTampil
          titik={[{ id: fasilitas.id, latitude: fasilitas.latitude, longitude: fasilitas.longitude, judul: fasilitas.nama }]}
          tinggi={160}
        />
        <View style={[s.ringkasan, fasilitas.kandidatEvaluasi && s.ringkasanBerulang]}>
          <Text style={[s.angka, fasilitas.kandidatEvaluasi && { color: warna.bahaya }]}>
            {fasilitas.jumlahKerusakanBerulang}
          </Text>
          <Text style={[huruf.kecil, { flex: 1 }]}>
            laporan kerusakan dalam 90 hari terakhir
            {fasilitas.kandidatEvaluasi ? ' · kandidat evaluasi (kerusakan berulang)' : ''}
          </Text>
        </View>
      </Kartu>

      <Text style={[huruf.subjudul, s.judulBagian]}>Laporan pada fasilitas ini ({laporan.length})</Text>
      {laporan.length === 0 ? (
        <Text style={huruf.kecil}>{PESAN.BELUM_ADA_LAPORAN}</Text>
      ) : (
        laporan.map((l) => (
          <KartuLaporanPrioritas key={l.id} laporan={l} bisaUbahStatus={bisaUbahStatus} onStatusBerubah={muatUlang} />
        ))
      )}

      <Text style={[huruf.subjudul, s.judulBagian]}>Riwayat perbaikan</Text>
      {riwayat.length === 0 ? (
        <Text style={huruf.kecil}>Belum ada riwayat</Text>
      ) : (
        riwayat.map((r, i) => (
          <View key={r.id} style={s.riwayat}>
            <View style={s.garisWaktu}>
              <View style={[s.titik, i === 0 && { backgroundColor: warna.primer }]} />
              {i < riwayat.length - 1 ? <View style={s.garis} /> : null}
            </View>
            <View style={s.isiRiwayat}>
              <Text style={huruf.label}>
                {formatTanggal(r.tanggal)} · {kodeLaporan(r.idLaporan)}
              </Text>
              <Text style={[huruf.isi, { fontWeight: '700', marginTop: 2 }]}>
                {r.statusLama ? `${r.statusLama} → ${r.statusBaru}` : r.statusBaru}
              </Text>
              <Text style={[huruf.kecil, { marginTop: 2 }]}>{r.deskripsi}</Text>
              {!r.statusLama && fotoLaporan[r.idLaporan] ? (
                <Image source={{ uri: urlLengkap(fotoLaporan[r.idLaporan]) }} style={s.foto} />
              ) : null}
            </View>
          </View>
        ))
      )}
    </Layar>
  );
}

const s = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'center', gap: jarak.xs, marginTop: jarak.s },
  ringkasan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: jarak.m,
    marginTop: jarak.m,
    padding: jarak.m,
    borderRadius: radius.m,
    backgroundColor: warna.permukaanLembut,
  },
  ringkasanBerulang: { backgroundColor: warna.bahayaMuda },
  angka: { fontSize: 24, fontWeight: '800', color: warna.teks },
  judulBagian: { marginTop: jarak.l, marginBottom: jarak.s },
  riwayat: { flexDirection: 'row' },
  garisWaktu: { width: 20, alignItems: 'center' },
  titik: { width: 10, height: 10, borderRadius: 5, backgroundColor: warna.garis, marginTop: 6 },
  garis: { flex: 1, width: 2, backgroundColor: warna.garis },
  isiRiwayat: { flex: 1, paddingBottom: jarak.l, paddingLeft: jarak.s },
  foto: { width: 120, height: 80, borderRadius: radius.s, marginTop: jarak.s, backgroundColor: warna.permukaanLembut },
});
