/**
 * UI kit dasar SILEMBUR. Pemilik: P3.
 * Anggota lain MEMAKAI komponen ini; butuh varian baru -> buat komponen lokal di features/<fitur>/
 * atau ajukan PR kecil ke P3. Jangan menyalin-tempel gaya.
 */
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bayangan, huruf, jarak, radius, warna, warnaStatus } from '../../theme/tokens';
import { PESAN } from '@silembur/shared';

/**
 * Kerangka layar: area aman + latar + (opsional) scroll.
 * Tarik-untuk-muat-ulang (hanya saat gulir): isi `onSegarkan` (fungsi) dan `menyegarkan` (boolean).
 */
export function Layar({ children, gulir = true, style, tepi = ['top'], onSegarkan, menyegarkan = false }) {
  const Isi = gulir ? ScrollView : View;
  const segarkan =
    gulir && onSegarkan ? (
      <RefreshControl refreshing={menyegarkan} onRefresh={onSegarkan} colors={[warna.primer]} tintColor={warna.primer} />
    ) : undefined;
  return (
    <SafeAreaView style={s.layar} edges={tepi}>
      <Isi
        style={gulir ? undefined : [s.isi, style]}
        contentContainerStyle={gulir ? [s.isi, style] : undefined}
        keyboardShouldPersistTaps="handled"
        refreshControl={segarkan}
      >
        {children}
      </Isi>
    </SafeAreaView>
  );
}

/** Tombol. varian: 'primer' | 'sekunder' | 'bahaya' | 'teks' */
export function Tombol({ judul, onPress, varian = 'primer', nonaktif, memuat, ikon, style }) {
  const mati = nonaktif || memuat;
  const v = gayaTombol[varian];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!mati }}
      onPress={onPress}
      disabled={mati}
      style={({ pressed }) => [s.tombol, v.wadah, mati && s.tombolMati, pressed && { opacity: 0.85 }, style]}
    >
      {memuat ? (
        <ActivityIndicator color={v.teks.color} />
      ) : (
        <View style={s.baris}>
          {ikon ? <Ionicons name={ikon} size={18} color={v.teks.color} style={{ marginRight: jarak.s }} /> : null}
          <Text style={[s.tombolTeks, v.teks]}>{judul}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Kartu({ children, style, onPress }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.kartu, pressed && { opacity: 0.9 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.kartu, style]}>{children}</View>;
}

/** Pil pilihan untuk tab/filter (mis. O-0203 tab status, filter wilayah). */
export function Chip({ label, aktif, onPress, ikon, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!aktif }}
      onPress={onPress}
      style={({ pressed }) => [s.chip, aktif && s.chipAktif, pressed && { opacity: 0.85 }, style]}
    >
      {ikon ? (
        <Ionicons name={ikon} size={14} color={aktif ? warna.putih : warna.teksLembut} style={{ marginRight: jarak.xs }} />
      ) : null}
      <Text style={[s.chipTeks, aktif && { color: warna.putih }]}>{label}</Text>
    </Pressable>
  );
}

export function LencanaStatus({ status }) {
  const w = warnaStatus[status] ?? { latar: warna.permukaanLembut, teks: warna.teksLembut };
  return (
    <View style={[s.lencana, { backgroundColor: w.latar }]}>
      <Text style={[s.lencanaTeks, { color: w.teks }]}>{status}</Text>
    </View>
  );
}

export function Isian({ label, wajib, error, style, ...props }) {
  return (
    <View style={{ marginBottom: jarak.l }}>
      {label ? (
        <Text style={s.label}>
          {label}
          {wajib ? <Text style={{ color: warna.bahaya }}> *</Text> : null}
        </Text>
      ) : null}
      <TextInput placeholderTextColor={warna.teksLembut} style={[s.isian, error && s.isianError, style]} {...props} />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

/** Skenario alternatif "belum ada laporan" dsb. */
export function TampilanKosong({ pesan = PESAN.BELUM_ADA_LAPORAN, ikon = 'document-text-outline' }) {
  return (
    <View style={s.tengah}>
      <Ionicons name={ikon} size={40} color={warna.teksLembut} />
      <Text style={[huruf.kecil, { marginTop: jarak.s, textAlign: 'center' }]}>{pesan}</Text>
    </View>
  );
}

export function TampilanMemuat() {
  return (
    <View style={s.tengah}>
      <ActivityIndicator color={warna.primer} size="large" />
    </View>
  );
}

/** Skenario alternatif "loading terlalu lama" -> "Tolong muat ulang halaman" + tombol coba lagi. */
export function TampilanGagal({ pesan = PESAN.MUAT_ULANG, onCobaLagi }) {
  return (
    <View style={s.tengah}>
      <Ionicons name="cloud-offline-outline" size={40} color={warna.bahaya} />
      <Text style={[huruf.isi, { marginVertical: jarak.m, textAlign: 'center' }]}>{pesan}</Text>
      {onCobaLagi ? <Tombol judul="Muat ulang" varian="sekunder" onPress={onCobaLagi} /> : null}
    </View>
  );
}

/**
 * Penanda layar yang belum dikerjakan (starter). Hapus pemakaiannya saat layar selesai.
 */
export function LayarBelumJadi({ idLayar, judul, pemilik, useCase, tugas = [] }) {
  return (
    <Layar>
      <Text style={huruf.judul}>{judul}</Text>
      <Text style={[huruf.kecil, { marginBottom: jarak.l }]}>
        {idLayar} · {useCase} · dikerjakan {pemilik}
      </Text>
      <Kartu>
        <Text style={huruf.subjudul}>Belum diimplementasi</Text>
        {tugas.map((t) => (
          <Text key={t} style={[huruf.isi, { marginTop: jarak.s }]}>
            • {t}
          </Text>
        ))}
        <Text style={[huruf.kecil, { marginTop: jarak.l }]}>Lihat src/docs/tasks/{pemilik}.md</Text>
      </Kartu>
    </Layar>
  );
}

const gayaTombol = {
  primer: { wadah: { backgroundColor: warna.primer }, teks: { color: warna.putih } },
  sekunder: { wadah: { backgroundColor: warna.primerMuda }, teks: { color: warna.primer } },
  bahaya: { wadah: { backgroundColor: warna.bahaya }, teks: { color: warna.putih } },
  teks: { wadah: { backgroundColor: 'transparent' }, teks: { color: warna.primer } },
};

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: warna.latar },
  isi: { padding: jarak.l, flexGrow: 1 },
  baris: { flexDirection: 'row', alignItems: 'center' },
  tombol: {
    minHeight: 48,
    borderRadius: radius.m,
    paddingHorizontal: jarak.l,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tombolMati: { opacity: 0.45 },
  tombolTeks: { fontSize: 16, fontWeight: '700' },
  kartu: {
    backgroundColor: warna.permukaan,
    borderRadius: radius.l,
    padding: jarak.l,
    marginBottom: jarak.m,
    ...bayangan,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: jarak.m,
    paddingVertical: 6,
    borderRadius: radius.pil,
    backgroundColor: warna.permukaan,
    borderWidth: 1,
    borderColor: warna.garis,
    marginRight: jarak.s,
  },
  chipAktif: { backgroundColor: warna.primer, borderColor: warna.primer },
  chipTeks: { fontSize: 13, fontWeight: '600', color: warna.teks },
  lencana: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pil },
  lencanaTeks: { fontSize: 12, fontWeight: '700' },
  label: { ...huruf.label, marginBottom: jarak.xs, fontSize: 14, color: warna.teks },
  isian: {
    backgroundColor: warna.permukaanLembut,
    borderRadius: radius.m,
    paddingHorizontal: jarak.l,
    paddingVertical: jarak.m,
    fontSize: 15,
    color: warna.teks,
  },
  isianError: { borderWidth: 1, borderColor: warna.bahaya },
  error: { color: warna.bahaya, fontSize: 12, marginTop: jarak.xs },
  tengah: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: jarak.xl, minHeight: 200 },
});
