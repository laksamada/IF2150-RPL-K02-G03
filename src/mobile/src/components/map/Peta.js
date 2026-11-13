/**
 * GoogleMapsAdapter sisi View (DPPL Tabel 2.3): peta interaktif untuk memilih/menampilkan lokasi (KF03).
 * Pemilik: P1. Dipakai P2 (I-04), P3 (I-03), P5 (I-08, I-10).
 *
 * Provider:
 *  - Android: Google Maps (Expo Go sudah menyertakan kunci; untuk build sendiri isi kunci di app config - tugas P1).
 *  - iOS: Apple Maps bawaan (fallback tanpa kunci).
 *  - Web (uji di browser PC): Peta.web.js, peta OpenStreetMap + isian koordinat. Props sama persis.
 *
 *   <PetaPilih nilai={{ latitude, longitude }} onUbah={(koord) => ...} />   // pin bisa digeser/ketuk
 *   <PetaTampil titik={[{ id, latitude, longitude, judul }]} />             // hanya tampil
 */
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { radius } from '../../theme/tokens';
import { PUSAT_KOTA } from './konstanta';

export { PUSAT_KOTA };
const provider = Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

// Ketukan pada ikon tempat (POI) Google Maps tidak memicu onPress, sehingga pin tidak terpasang.
// Peta pemilih lokasi menyembunyikan POI agar setiap ketukan menandai titik kerusakan (KF03).
const GAYA_TANPA_POI = [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }];

function wilayahAwal(titik, delta = 0.01) {
  return { ...(titik ?? PUSAT_KOTA), latitudeDelta: delta, longitudeDelta: delta };
}

export function PetaPilih({ nilai, onUbah, tinggi = 220 }) {
  return (
    <View style={[s.wadah, { height: tinggi }]}>
      <MapView
        provider={provider}
        style={StyleSheet.absoluteFill}
        initialRegion={wilayahAwal(nilai, nilai ? 0.005 : 0.08)}
        onPress={(e) => onUbah?.(e.nativeEvent.coordinate)}
        customMapStyle={GAYA_TANPA_POI}
      >
        {nilai ? (
          <Marker draggable coordinate={nilai} onDragEnd={(e) => onUbah?.(e.nativeEvent.coordinate)} />
        ) : null}
      </MapView>
    </View>
  );
}

export function PetaTampil({ titik = [], tinggi = 180, onPilih }) {
  const pusat = titik[0] ? { latitude: titik[0].latitude, longitude: titik[0].longitude } : PUSAT_KOTA;
  return (
    <View style={[s.wadah, { height: tinggi }]}>
      <MapView
        provider={provider}
        style={StyleSheet.absoluteFill}
        initialRegion={wilayahAwal(pusat, titik.length > 1 ? 0.08 : 0.006)}
        scrollEnabled={titik.length > 1}
        zoomEnabled={titik.length > 1}
      >
        {titik.map((t) => (
          <Marker
            key={t.id ?? `${t.latitude},${t.longitude}`}
            coordinate={{ latitude: t.latitude, longitude: t.longitude }}
            title={t.judul}
            onCalloutPress={() => onPilih?.(t)}
          />
        ))}
      </MapView>
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { borderRadius: radius.m, overflow: 'hidden', backgroundColor: '#dfe6e9' },
});
