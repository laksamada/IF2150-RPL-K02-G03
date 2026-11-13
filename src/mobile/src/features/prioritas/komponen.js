/**
 * Komponen lokal fitur prioritas/fasilitas (I-08, I-09, I-10). Pemilik: P5.
 *  - PilihanChip      : chip filter (O-0802, filter I-09)
 *  - PilihWilayah     : dropdown wilayah berbentuk modal (O-0801)
 *  - AksiStatusLaporan: isian keterangan + tombol Mulai Tangani / Tandai Selesai (O-0804, O-1005, gap G8)
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { STATUS } from '@silembur/shared';
import { pemdaApi } from '../../api/pemda';
import { beritahu, konfirmasi } from '../../components/dialog/konfirmasi';
import { Isian, Tombol } from '../../components/ui';
import { huruf, jarak, radius, warna } from '../../theme/tokens';
import { kodeLaporan } from '../../utils/format';

export function PilihanChip({ label, aktif, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: aktif }}
      onPress={onPress}
      style={[s.chip, aktif && s.chipAktif]}
    >
      <Text style={[s.chipTeks, aktif && s.chipTeksAktif]}>{label}</Text>
    </Pressable>
  );
}

/** Dropdown wilayah: `nilai` '' = semua wilayah. */
export function PilihWilayah({ nilai, daftar = [], onUbah }) {
  const [terbuka, setTerbuka] = useState(false);
  const pilihan = ['', ...daftar];
  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => setTerbuka(true)} style={s.dropdown}>
        <Ionicons name="location-outline" size={18} color={warna.primer} />
        <Text style={[huruf.isi, { flex: 1, marginHorizontal: jarak.s }]} numberOfLines={1}>
          {nilai || 'Semua wilayah'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={warna.teksLembut} />
      </Pressable>
      <Modal visible={terbuka} animationType="slide" transparent onRequestClose={() => setTerbuka(false)}>
        <Pressable style={s.latarModal} onPress={() => setTerbuka(false)} />
        <SafeAreaView edges={['bottom']} style={s.lembar}>
          <Text style={[huruf.subjudul, { marginBottom: jarak.m }]}>Pilih wilayah</Text>
          <FlatList
            data={pilihan}
            keyExtractor={(w) => w || 'semua'}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onUbah(item);
                  setTerbuka(false);
                }}
                style={s.barisWilayah}
              >
                <Text style={[huruf.isi, item === nilai && { color: warna.primer, fontWeight: '700' }]}>
                  {item || 'Semua wilayah'}
                </Text>
                {item === nilai ? <Ionicons name="checkmark" size={18} color={warna.primer} /> : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const AKSI = {
  [STATUS.TERVERIFIKASI]: { ke: STATUS.DIPROSES, judul: 'Mulai Tangani', ikon: 'construct-outline' },
  [STATUS.DIPROSES]: { ke: STATUS.SELESAI, judul: 'Tandai Selesai', ikon: 'checkmark-done-outline' },
};

/**
 * Aksi pembaruan status oleh pemda. Tidak tampil untuk status lain (transisi tetap diperiksa server).
 * onBerhasil(laporanBaru) dipanggil setelah server menerima perubahan.
 */
export function AksiStatusLaporan({ laporan, onBerhasil }) {
  const [keterangan, setKeterangan] = useState('');
  const [error, setError] = useState(null);
  const [mengirim, setMengirim] = useState(false);
  const aksi = AKSI[laporan.status];
  if (!aksi) return null;

  async function kirim() {
    if (!keterangan.trim()) {
      setError('Keterangan penanganan wajib diisi');
      return;
    }
    setError(null);
    const yakin = await konfirmasi({
      judul: `${aksi.judul}?`,
      pesan: `Status ${kodeLaporan(laporan.id)} akan diubah menjadi "${aksi.ke}".`,
      tombolYa: 'Ya, ubah',
    });
    if (!yakin) return;
    setMengirim(true);
    try {
      const res = await pemdaApi.ubahStatus(laporan.id, { status: aksi.ke, keterangan: keterangan.trim() });
      setKeterangan('');
      // KF12 / G8: konfirmasi singkat, karena kartu bisa langsung hilang dari daftar setelah dimuat ulang.
      beritahu('Status diperbarui', `${kodeLaporan(laporan.id)} kini berstatus "${res.laporan?.status ?? aksi.ke}".`);
      onBerhasil?.(res.laporan);
    } catch (err) {
      beritahu('Gagal memperbarui status', err.message);
    } finally {
      setMengirim(false);
    }
  }

  return (
    <View style={s.aksi}>
      <Isian
        label="Keterangan penanganan"
        wajib
        value={keterangan}
        onChangeText={(teks) => {
          setKeterangan(teks);
          if (error && teks.trim()) setError(null);
        }}
        placeholder={aksi.ke === STATUS.DIPROSES ? 'mis. Tim lapangan dijadwalkan besok' : 'mis. Lubang sudah ditambal'}
        maxLength={300}
        error={error}
        style={{ paddingVertical: jarak.s }}
      />
      <Tombol judul={aksi.judul} ikon={aksi.ikon} onPress={kirim} memuat={mengirim} />
    </View>
  );
}

const s = StyleSheet.create({
  chip: {
    paddingHorizontal: jarak.m,
    paddingVertical: jarak.s,
    borderRadius: radius.pil,
    backgroundColor: warna.permukaan,
    borderWidth: 1,
    borderColor: warna.garis,
    marginRight: jarak.s,
  },
  chipAktif: { backgroundColor: warna.primer, borderColor: warna.primer },
  chipTeks: { fontSize: 13, color: warna.teks, fontWeight: '600' },
  chipTeksAktif: { color: warna.putih },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: warna.permukaan,
    borderRadius: radius.m,
    paddingHorizontal: jarak.l,
    paddingVertical: jarak.m,
    borderWidth: 1,
    borderColor: warna.garis,
  },
  latarModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  lembar: {
    maxHeight: '70%',
    backgroundColor: warna.permukaan,
    borderTopLeftRadius: radius.l,
    borderTopRightRadius: radius.l,
    padding: jarak.l,
  },
  barisWilayah: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: jarak.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: warna.garis,
  },
  aksi: { marginTop: jarak.m, paddingTop: jarak.m, borderTopWidth: 1, borderTopColor: warna.garis },
});
