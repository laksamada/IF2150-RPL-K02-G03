import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ATURAN, STATUS, SUMBER_LOKASI } from '@silembur/shared';
import { urlLengkap } from '../../api/client';
import { laporanApi } from '../../api/laporan';
import { wargaApi } from '../../api/warga';
import { beritahu, konfirmasi } from '../../components/dialog/konfirmasi';
import { PetaPilih } from '../../components/map/Peta';
import { Isian, Kartu, Layar, TampilanMemuat, Tombol } from '../../components/ui';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import PilihFoto from './PilihFoto';
import PilihKategori from './PilihKategori';
import { bagianBelumLengkap } from './validasi';

const BATAS_TUNGGU_GPS_MS = 10_000;
const FORM_KOSONG = { foto: null, kategori: null, koordinat: null, sumberLokasi: SUMBER_LOKASI.GPS, deskripsi: '' };

function denganBatasWaktu(janji, ms) {
  return Promise.race([janji, new Promise((_, tolak) => setTimeout(() => tolak(new Error('timeout')), ms))]);
}

function dariLaporan(l) {
  return {
    foto: l.foto ? { uri: urlLengkap(l.foto), baru: false } : null,
    kategori: l.kategori,
    koordinat: l.lokasi ? { latitude: l.lokasi.latitude, longitude: l.lokasi.longitude } : null,
    sumberLokasi: SUMBER_LOKASI.GPS,
    deskripsi: l.deskripsi ?? '',
  };
}

function Bagian({ judul, nomor, children, keterangan }) {
  return (
    <Kartu>
      <View style={s.kepalaBagian}>
        <View style={s.nomor}>
          <Text style={s.nomorTeks}>{nomor}</Text>
        </View>
        <Text style={huruf.subjudul}>{judul}</Text>
      </View>
      {keterangan ? <Text style={[huruf.kecil, { marginBottom: jarak.s }]}>{keterangan}</Text> : null}
      {children}
    </Kartu>
  );
}

/**
 * I-04 Buat Laporan (UC01). Dipakai juga untuk revisi lewat /warga/revisi/[id].
 */
export default function BuatLaporanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const modeRevisi = Boolean(id);

  const [isian, setIsian] = useState(FORM_KOSONG);
  const [awal, setAwal] = useState(null);
  const [laporanLama, setLaporanLama] = useState(null);
  const [memuatAwal, setMemuatAwal] = useState(modeRevisi);
  const [gagalMuatAwal, setGagalMuatAwal] = useState(false);
  const [mencariGps, setMencariGps] = useState(false);
  const [kunciPeta, setKunciPeta] = useState(0);
  const [mengirim, setMengirim] = useState(false);
  // Bertambah setiap formulir baru dikosongkan setelah terkirim, agar GPS otomatis berjalan lagi.
  const [putaranForm, setPutaranForm] = useState(0);
  // Titik dari tombol GPS / peta tidak boleh ditimpa hasil GPS otomatis yang datang belakangan.
  const dipilihPengguna = useRef(false);

  const ubah = (bagian) => setIsian((i) => ({ ...i, ...bagian }));

  // KF03: "ketika layanan GPS tersedia, sistem mengambil data lokasi laporan secara otomatis".
  // Hanya untuk laporan baru, hanya bila izin lokasi sudah ada (tanpa memunculkan dialog izin).
  useEffect(() => {
    if (modeRevisi) return undefined;
    dipilihPengguna.current = false;
    let aktif = true;
    (async () => {
      try {
        const izin = await Location.getForegroundPermissionsAsync();
        if (!aktif || !izin.granted || !(await Location.hasServicesEnabledAsync())) return;
        let posisi;
        try {
          posisi = await denganBatasWaktu(
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            BATAS_TUNGGU_GPS_MS,
          );
        } catch {
          posisi = await Location.getLastKnownPositionAsync();
        }
        if (!aktif || !posisi || dipilihPengguna.current) return;
        ubah({
          koordinat: { latitude: posisi.coords.latitude, longitude: posisi.coords.longitude },
          sumberLokasi: SUMBER_LOKASI.GPS,
        });
        setKunciPeta((k) => k + 1);
      } catch {
        // Diam: pengguna tetap bisa menekan "Gunakan Lokasi Saya" atau memilih titik di peta.
      }
    })();
    return () => {
      aktif = false;
    };
  }, [modeRevisi, putaranForm]);

  useEffect(() => {
    if (!modeRevisi) return undefined;
    let aktif = true;
    (async () => {
      try {
        const { laporan } = await wargaApi.detailSaya(id);
        if (!aktif) return;
        const nilai = dariLaporan(laporan);
        setLaporanLama(laporan);
        setAwal(nilai);
        setIsian(nilai);
        setKunciPeta((k) => k + 1);
      } catch {
        if (aktif) setGagalMuatAwal(true);
      } finally {
        if (aktif) setMemuatAwal(false);
      }
    })();
    return () => {
      aktif = false;
    };
  }, [id, modeRevisi]);

  const kurang = bagianBelumLengkap(isian);
  const lengkap = kurang.length === 0;
  const bukanPerluRevisi = modeRevisi && laporanLama && laporanLama.status !== STATUS.PERLU_REVISI;

  async function gunakanLokasiSaya() {
    dipilihPengguna.current = true;
    setMencariGps(true);
    try {
      const izin = await Location.requestForegroundPermissionsAsync();
      if (!izin.granted) {
        beritahu('Izin lokasi ditolak', 'Ketuk peta untuk menandai lokasi kerusakan secara manual.');
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        beritahu('GPS tidak aktif', 'Aktifkan GPS, atau ketuk peta untuk menandai lokasi secara manual.');
        return;
      }
      let posisi;
      try {
        posisi = await denganBatasWaktu(
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          BATAS_TUNGGU_GPS_MS,
        );
      } catch {
        posisi = await Location.getLastKnownPositionAsync();
      }
      if (!posisi) {
        beritahu('Lokasi belum ditemukan', 'Coba lagi di area terbuka, atau ketuk peta untuk menandai lokasi.');
        return;
      }
      ubah({
        koordinat: { latitude: posisi.coords.latitude, longitude: posisi.coords.longitude },
        sumberLokasi: SUMBER_LOKASI.GPS,
      });
      setKunciPeta((k) => k + 1);
    } catch {
      beritahu('Lokasi gagal diambil', 'Ketuk peta untuk menandai lokasi secara manual.');
    } finally {
      setMencariGps(false);
    }
  }

  function dataKirim() {
    const data = {
      kategori: isian.kategori,
      deskripsi: isian.deskripsi.trim(),
      latitude: isian.koordinat.latitude,
      longitude: isian.koordinat.longitude,
      sumberLokasi: isian.sumberLokasi,
      foto: isian.foto?.baru ? isian.foto : undefined,
    };
    if (!modeRevisi || !awal) return data;
    const lokasiSama =
      awal.koordinat &&
      awal.koordinat.latitude === isian.koordinat.latitude &&
      awal.koordinat.longitude === isian.koordinat.longitude;
    return {
      foto: data.foto,
      kategori: data.kategori !== awal.kategori ? data.kategori : undefined,
      deskripsi: data.deskripsi !== awal.deskripsi.trim() ? data.deskripsi : undefined,
      ...(lokasiSama ? {} : { latitude: data.latitude, longitude: data.longitude, sumberLokasi: data.sumberLokasi }),
    };
  }

  async function kirim() {
    if (!lengkap) {
      beritahu('Formulir belum lengkap', `Lengkapi ${kurang.join(', ')} untuk melanjutkan.`);
      return;
    }
    const yakin = await konfirmasi({
      judul: modeRevisi ? 'Kirim revisi laporan?' : 'Kirim laporan?',
      pesan: modeRevisi
        ? 'Laporan akan dikirim ulang untuk diverifikasi admin.'
        : 'Pastikan foto, kategori, lokasi, dan deskripsi sudah sesuai.',
      tombolYa: 'Kirim',
    });
    if (!yakin) return;

    setMengirim(true);
    try {
      const { laporan } = modeRevisi
        ? await laporanApi.revisi(id, dataKirim())
        : await laporanApi.buat(dataKirim());
      if (modeRevisi) {
        router.replace(`/warga/laporan/${laporan.id}?mode=saya`);
      } else {
        setIsian(FORM_KOSONG);
        setKunciPeta((k) => k + 1);
        setPutaranForm((p) => p + 1);
        router.push(`/warga/laporan/${laporan.id}?mode=saya`);
      }
    } catch (err) {
      const rincian = err.details?.map((d) => `• ${d.pesan}`).join('\n');
      beritahu(modeRevisi ? 'Revisi gagal dikirim' : 'Laporan gagal dikirim', rincian ? `${err.message}\n${rincian}` : err.message);
    } finally {
      setMengirim(false);
    }
  }

  if (memuatAwal) return <TampilanMemuat />;

  return (
    <Layar tepi={modeRevisi ? [] : ['top']}>
      {!modeRevisi ? (
        <View style={{ marginBottom: jarak.l }}>
          <Text style={huruf.judul}>Buat Laporan</Text>
          <Text style={huruf.kecil}>Laporkan kerusakan fasilitas umum di sekitar Anda.</Text>
        </View>
      ) : null}

      {modeRevisi && laporanLama?.catatanVerifikasi ? (
        <View style={[s.catatan, { backgroundColor: warna.bahayaMuda }]}>
          <Ionicons name="chatbox-ellipses-outline" size={20} color={warna.bahaya} />
          <View style={{ flex: 1 }}>
            <Text style={[s.catatanJudul, { color: warna.bahaya }]}>Catatan admin</Text>
            <Text style={huruf.isi}>{laporanLama.catatanVerifikasi.catatan || 'Mohon perbaiki laporan Anda.'}</Text>
          </View>
        </View>
      ) : null}
      {gagalMuatAwal ? (
        <View style={[s.catatan, { backgroundColor: warna.peringatanMuda }]}>
          <Ionicons name="alert-circle-outline" size={20} color={warna.peringatan} />
          <Text style={[huruf.isi, { flex: 1 }]}>
            Data laporan lama tidak bisa dimuat. Isi ulang seluruh bagian formulir untuk mengirim revisi.
          </Text>
        </View>
      ) : null}
      {bukanPerluRevisi ? (
        <View style={[s.catatan, { backgroundColor: warna.peringatanMuda }]}>
          <Ionicons name="lock-closed-outline" size={20} color={warna.peringatan} />
          <Text style={[huruf.isi, { flex: 1 }]}>
            Laporan ini berstatus "{laporanLama.status}" sehingga tidak bisa direvisi.
          </Text>
        </View>
      ) : null}

      <Bagian nomor="1" judul="Foto kerusakan">
        <PilihFoto nilai={isian.foto} onUbah={(foto) => ubah({ foto })} />
      </Bagian>

      <Bagian nomor="2" judul="Kategori">
        <PilihKategori nilai={isian.kategori} onUbah={(kategori) => ubah({ kategori })} />
      </Bagian>

      <Bagian
        nomor="3"
        judul="Lokasi"
        keterangan="Gunakan GPS, atau ketuk/geser pin di peta untuk menandai titik kerusakan."
      >
        <Tombol
          judul="Gunakan Lokasi Saya"
          ikon="locate"
          varian="sekunder"
          onPress={gunakanLokasiSaya}
          memuat={mencariGps}
          style={{ marginBottom: jarak.s }}
        />
        <PetaPilih
          key={kunciPeta}
          nilai={isian.koordinat}
          onUbah={(koordinat) => {
            dipilihPengguna.current = true;
            ubah({ koordinat, sumberLokasi: SUMBER_LOKASI.MANUAL });
          }}
        />
        <View style={s.infoLokasi}>
          <Ionicons
            name={isian.koordinat ? 'location' : 'location-outline'}
            size={16}
            color={isian.koordinat ? warna.primer : warna.teksLembut}
          />
          <Text style={[huruf.kecil, { flex: 1 }]}>
            {isian.koordinat
              ? `${isian.koordinat.latitude.toFixed(5)}, ${isian.koordinat.longitude.toFixed(5)} · ${
                  isian.sumberLokasi === SUMBER_LOKASI.GPS ? 'dari GPS' : 'dipilih di peta'
                } · wilayah ditentukan otomatis`
              : 'Belum ada titik lokasi'}
          </Text>
        </View>
      </Bagian>

      <Bagian nomor="4" judul="Deskripsi">
        <Isian
          placeholder="Contoh: lubang berdiameter 50 cm di lajur kiri, dekat halte."
          value={isian.deskripsi}
          onChangeText={(deskripsi) => ubah({ deskripsi })}
          multiline
          maxLength={ATURAN.BATAS_DESKRIPSI}
          textAlignVertical="top"
          style={s.deskripsi}
        />
        <Text style={[huruf.kecil, s.penghitung]}>
          {isian.deskripsi.length}/{ATURAN.BATAS_DESKRIPSI}
        </Text>
      </Bagian>

      <Tombol
        judul={modeRevisi ? 'Kirim Revisi' : 'Kirim Laporan'}
        ikon="send"
        onPress={kirim}
        memuat={mengirim}
        nonaktif={bukanPerluRevisi}
        style={!lengkap && s.terkunci}
      />
      {!lengkap ? (
        <Text style={[huruf.kecil, s.bantu]}>Lengkapi foto, kategori, lokasi, dan deskripsi untuk melanjutkan</Text>
      ) : null}
    </Layar>
  );
}

const s = StyleSheet.create({
  kepalaBagian: { flexDirection: 'row', alignItems: 'center', gap: jarak.s, marginBottom: jarak.m },
  nomor: {
    width: 24,
    height: 24,
    borderRadius: radius.pil,
    backgroundColor: warna.primer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nomorTeks: { color: warna.putih, fontWeight: '700', fontSize: 13 },
  infoLokasi: { flexDirection: 'row', alignItems: 'center', gap: jarak.xs, marginTop: jarak.s },
  deskripsi: { minHeight: 110 },
  penghitung: { textAlign: 'right', marginTop: -jarak.m },
  catatan: {
    flexDirection: 'row',
    gap: jarak.s,
    padding: jarak.m,
    borderRadius: radius.m,
    marginBottom: jarak.m,
  },
  catatanJudul: { fontWeight: '700', marginBottom: 2 },
  terkunci: { opacity: 0.45 },
  bantu: { textAlign: 'center', marginTop: jarak.s, marginBottom: jarak.xl },
});