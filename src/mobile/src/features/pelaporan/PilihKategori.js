import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { KATEGORI, SEMUA_KATEGORI } from '@silembur/shared';
import { jarak, radius, warna } from '../../theme/tokens';

const IKON = {
  [KATEGORI.JALAN_BERLUBANG]: 'car-outline',
  [KATEGORI.LAMPU_JALAN_MATI]: 'bulb-outline',
  [KATEGORI.POHON_TUMBANG]: 'leaf-outline',
  [KATEGORI.LAINNYA]: 'ellipsis-horizontal-circle-outline',
};

export default function PilihKategori({ nilai, onUbah }) {
  return (
    <View style={s.grid} accessibilityRole="radiogroup">
      {SEMUA_KATEGORI.map((k) => {
        const aktif = k === nilai;
        return (
          <Pressable
            key={k}
            onPress={() => onUbah(k)}
            accessibilityRole="radio"
            accessibilityState={{ checked: aktif }}
            style={({ pressed }) => [s.pilihan, aktif && s.aktif, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name={IKON[k]} size={20} color={aktif ? warna.primer : warna.teksLembut} />
            <Text style={[s.teks, aktif && s.teksAktif]}>{k}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: jarak.s },
  pilihan: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: jarak.s,
    paddingVertical: jarak.m,
    paddingHorizontal: jarak.m,
    borderRadius: radius.m,
    backgroundColor: warna.permukaanLembut,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  aktif: { backgroundColor: warna.primerMuda, borderColor: warna.primer },
  teks: { flex: 1, fontSize: 14, color: warna.teks },
  teksAktif: { color: warna.primer, fontWeight: '700' },
});