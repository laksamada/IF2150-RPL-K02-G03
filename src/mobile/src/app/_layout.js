/**
 * Layout akar: penyedia login + gerbang peran. Pengguna diarahkan ke folder rute sesuai perannya:
 *   PELAPOR -> /warga, ADMIN -> /admin, PEMDA -> /pemda. Belum login -> /login.
 * Sesi tersimpan gagal diperiksa karena jaringan/timeout -> "Tolong muat ulang halaman" + tombol coba lagi
 * (token tidak dihapus, pengguna tidak dilempar ke login).
 * Pemilik: P1.
 */
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PERAN, PESAN } from '@silembur/shared';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { TampilanGagal, TampilanMemuat } from '../components/ui';
import { warna } from '../theme/tokens';

const GRUP_PERAN = {
  [PERAN.PELAPOR]: 'warga',
  [PERAN.ADMIN]: 'admin',
  [PERAN.PEMDA]: 'pemda',
};

function GerbangPeran() {
  const { pengguna, memuat, gagalMemuat, cobaMuatSesi } = useAuth();
  const segmen = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (memuat || gagalMemuat) return;
    const grupSekarang = segmen[0];
    if (!pengguna) {
      if (grupSekarang !== 'login') router.replace('/login');
      return;
    }
    const grupBenar = GRUP_PERAN[pengguna.peran];
    if (grupSekarang !== grupBenar) router.replace(`/${grupBenar}`);
  }, [pengguna, memuat, gagalMemuat, segmen, router]);

  if (memuat) return <TampilanMemuat />;
  if (gagalMemuat)
    return (
      <View style={s.gagal}>
        <TampilanGagal pesan={PESAN.MUAT_ULANG} onCobaLagi={cobaMuatSesi} />
      </View>
    );
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <GerbangPeran />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  gagal: { flex: 1, justifyContent: 'center', backgroundColor: warna.latar },
});
