/**
 * I-07 Penggabungan Laporan Duplikat — UC07. Pemilik: P1.
 * Spesifikasi objek antarmuka: docs/M8/K02_G03_DPPL2.md (BAB 6, I-07).
 *
 * Alur (SKPL 4.4.7):
 *  1. Admin membuka daftar laporan aktif (dikelompokkan per fasilitas; kelompok kandidat duplikat ditandai, KF21).
 *  2. Tekan "Gabungkan Laporan" -> mode pilih.
 *  3. Pilih laporan duplikat (simpanKandidat).
 *  4. Tekan "Gabung" -> peringatan konfirmasi (warning).
 *  5a. Yakin -> server menggabungkan & menghitung ulang skor (gabungLaporan).
 *  5b. Tidak yakin -> kembali ke pilihan, admin bisa mengubahnya (skenario alternatif 1).
 */
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminApi } from '../../api/admin';
import { beritahu, konfirmasi } from '../../components/dialog/konfirmasi';
import { Kartu, TampilanGagal, TampilanKosong, TampilanMemuat, Tombol } from '../../components/ui';
import { useApi } from '../../hooks/useApi';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { kodeLaporan } from '../../utils/format';
import { useMuatSaatFokus } from '../warga/useMuatSaatFokus';
import KartuLaporanAktif from './KartuLaporanAktif';

function cocok(kelompok, kataKunci) {
  if (!kataKunci) return true;
  const k = kataKunci.toLowerCase();
  const teks = [
    kelompok.fasilitas?.nama,
    kelompok.fasilitas?.lokasi,
    ...kelompok.laporan.flatMap((l) => [kodeLaporan(l.id), l.kategori, l.deskripsi, l.lokasi?.alamat, l.lokasi?.wilayah]),
  ];
  return teks.some((t) => t?.toLowerCase().includes(k));
}

export default function DuplikatScreen() {
  const { data, memuat, error, muatUlang } = useApi(() => adminApi.kandidatDuplikat(), []);
  // Kembali dari tab/layar lain (mis. laporan baru ditolak di verifikasi): daftar laporan aktif dimuat ulang.
  useMuatSaatFokus(muatUlang);
  const [modePilih, setModePilih] = useState(false);
  const [dipilih, setDipilih] = useState([]);
  const [kataKunci, setKataKunci] = useState('');
  const [menggabung, setMenggabung] = useState(false);
  const [hasil, setHasil] = useState(null);

  const kelompok = useMemo(() => (data?.data ?? []).filter((k) => cocok(k, kataKunci.trim())), [data, kataKunci]);
  const semuaLaporan = useMemo(() => (data?.data ?? []).flatMap((k) => k.laporan), [data]);
  const jumlahKandidat = (data?.data ?? []).filter((k) => k.kandidat).length;

  function alihkanPilihan(id) {
    setDipilih((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  }

  function batal() {
    setModePilih(false);
    setDipilih([]);
  }

  async function gabung() {
    if (dipilih.length < 2) {
      beritahu('Pilih laporan', 'Pilih minimal dua laporan yang duplikat.');
      return;
    }
    const terpilih = semuaLaporan.filter((l) => dipilih.includes(l.id));
    if (new Set(terpilih.map((l) => l.kategori)).size > 1) {
      beritahu('Kategori berbeda', 'Laporan yang digabung harus memiliki kategori kerusakan yang sama.');
      return;
    }
    const yakin = await konfirmasi({
      judul: 'Gabungkan laporan?',
      pesan: `Apakah Anda yakin ${terpilih.map((l) => kodeLaporan(l.id)).join(', ')} merupakan laporan duplikat? ` +
        'Laporan paling awal menjadi laporan induk dan skor prioritasnya dihitung ulang.',
      tombolYa: 'Yakin',
      tombolTidak: 'Tidak yakin',
    });
    if (!yakin) return; // skenario alternatif 1: pilihan tetap, admin bisa mengubahnya

    setMenggabung(true);
    try {
      const res = await adminApi.gabung(dipilih);
      setHasil(res);
      batal();
      await muatUlang();
    } catch (err) {
      beritahu('Gagal menggabungkan', err.message);
    } finally {
      setMenggabung(false);
    }
  }

  let isi;
  if (memuat && !data) isi = <TampilanMemuat />;
  else if (error) isi = <TampilanGagal pesan={error.message} onCobaLagi={muatUlang} />;
  else if (kelompok.length === 0)
    isi = <TampilanKosong pesan={kataKunci ? 'Laporan yang dicari tidak ditemukan' : 'Belum ada laporan aktif'} />;
  else
    isi = kelompok.map((k) => (
      <View key={k.fasilitas?.id ?? `tanpa-${k.laporan[0].id}`} style={{ marginBottom: jarak.l }}>
        <View style={s.kepalaKelompok}>
          <View style={{ flex: 1 }}>
            <Text style={huruf.subjudul} numberOfLines={1}>{k.fasilitas?.nama ?? 'Tanpa fasilitas'}</Text>
            {k.fasilitas ? <Text style={huruf.kecil}>{k.fasilitas.lokasi}</Text> : null}
          </View>
          {k.kandidat ? (
            <View style={s.lencanaKandidat}>
              <Text style={s.lencanaKandidatTeks}>Kandidat duplikat · {k.laporan.length}</Text>
            </View>
          ) : null}
        </View>
        {k.laporan.map((l) => (
          <KartuLaporanAktif
            key={l.id}
            laporan={l}
            modePilih={modePilih}
            dipilih={dipilih.includes(l.id)}
            onTekan={() => alihkanPilihan(l.id)}
          />
        ))}
      </View>
    ));

  return (
    <SafeAreaView style={s.layar} edges={['top']}>
      <View style={s.atas}>
        <Text style={s.judulAtas}>Laporan Aktif</Text>
        <View style={s.cari}>
          <Ionicons name="search" size={18} color={warna.teksLembut} />
          <TextInput
            value={kataKunci}
            onChangeText={setKataKunci}
            placeholder="Cari fasilitas, lokasi, atau kode laporan"
            placeholderTextColor={warna.teksLembut}
            style={s.cariInput}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.isi}
        refreshControl={<RefreshControl refreshing={memuat && !!data} onRefresh={muatUlang} colors={[warna.primer]} />}
      >
        {hasil ? (
          <Kartu style={s.hasil}>
            <Text style={[huruf.isi, { fontWeight: '700' }]}>Penggabungan berhasil</Text>
            <Text style={huruf.isi}>
              {hasil.digabung.map(kodeLaporan).join(', ')} digabung ke {kodeLaporan(hasil.idLaporanInduk)}.
            </Text>
            <Text style={huruf.kecil}>
              {hasil.skor === null ? 'Skor dihitung setelah laporan induk diverifikasi.' : `Skor prioritas baru: ${hasil.skor}`}
            </Text>
            <Tombol judul="Tutup" varian="teks" onPress={() => setHasil(null)} />
          </Kartu>
        ) : null}

        {!modePilih && data && !error ? (
          <>
            <Text style={[huruf.kecil, { marginBottom: jarak.m }]}>
              {jumlahKandidat > 0
                ? `${jumlahKandidat} fasilitas memiliki lebih dari satu laporan aktif (kandidat duplikat).`
                : 'Tidak ada kandidat duplikat otomatis. Anda tetap bisa memilih laporan secara manual.'}
            </Text>
            <Tombol
              judul="Gabungkan Laporan"
              ikon="git-merge-outline"
              onPress={() => setModePilih(true)}
              nonaktif={semuaLaporan.length < 2}
              style={{ marginBottom: jarak.l }}
            />
          </>
        ) : null}
        {modePilih ? (
          <Text style={[huruf.kecil, { marginBottom: jarak.m }]}>Ketuk laporan yang duplikat untuk memilihnya.</Text>
        ) : null}

        {isi}
      </ScrollView>

      {modePilih ? (
        <View style={s.bawah}>
          <Tombol
            judul={`Gabung (${dipilih.length})`}
            onPress={gabung}
            memuat={menggabung}
            nonaktif={dipilih.length < 2}
            style={{ flex: 1 }}
          />
          <Tombol judul="Batal" varian="sekunder" onPress={batal} nonaktif={menggabung} style={{ flex: 1 }} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: warna.latar },
  atas: {
    backgroundColor: warna.primer,
    paddingHorizontal: jarak.l,
    paddingTop: jarak.m,
    paddingBottom: jarak.l,
    borderBottomLeftRadius: radius.l,
    borderBottomRightRadius: radius.l,
  },
  judulAtas: { fontSize: 22, fontWeight: '800', color: warna.putih, marginBottom: jarak.m },
  cari: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: warna.permukaan,
    borderRadius: radius.pil,
    paddingHorizontal: jarak.l,
  },
  cariInput: { flex: 1, paddingVertical: 10, paddingHorizontal: jarak.s, fontSize: 15, color: warna.teks },
  isi: { padding: jarak.l, paddingBottom: 120, flexGrow: 1 },
  kepalaKelompok: { flexDirection: 'row', alignItems: 'center', marginBottom: jarak.s, gap: jarak.s },
  lencanaKandidat: { backgroundColor: warna.peringatanMuda, borderRadius: radius.pil, paddingHorizontal: 10, paddingVertical: 4 },
  lencanaKandidatTeks: { color: warna.peringatan, fontWeight: '700', fontSize: 12 },
  hasil: { backgroundColor: warna.primerMuda },
  bawah: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: jarak.m,
    padding: jarak.l,
    backgroundColor: warna.permukaan,
    borderTopWidth: 1,
    borderTopColor: warna.garis,
  },
});
