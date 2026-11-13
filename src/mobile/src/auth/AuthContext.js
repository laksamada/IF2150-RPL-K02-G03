/**
 * Status login aplikasi (komponen pendukung Autentikasi di sisi View).
 * Token disimpan lewat penyimpananToken.js (SecureStore di HP, localStorage di mode web).
 * Pemilik: P1.
 *
 *   const { pengguna, masuk, masukDenganGoogle, keluar, memuat, segarkanPengguna, gagalMemuat, cobaMuatSesi } = useAuth();
 *
 * Saat aplikasi dibuka, token tersimpan diperiksa lewat GET /auth/me:
 *  - 401/403 -> token tidak berlaku lagi, dihapus, pengguna diarahkan ke login.
 *  - error lain (timeout, jaringan putus, server error) -> token DIPERTAHANKAN dan `gagalMemuat` diisi agar
 *    layar akar menampilkan "Tolong muat ulang halaman" + tombol coba lagi (KNF01, skenario alternatif UC04/05/06).
 * Di tengah sesi, 401 dari permintaan bertoken (lihat setPenanganSesiBerakhir di api/client.js) memanggil keluar().
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setPenanganSesiBerakhir, setTokenApi } from '../api/client';
import { ambilToken, hapusToken, simpanToken } from './penyimpananToken';

const KUNCI_TOKEN = 'silembur.token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [pengguna, setPengguna] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [gagalMemuat, setGagalMemuat] = useState(null);

  /** Pulihkan sesi dari token tersimpan. Dipanggil saat aplikasi dibuka dan dari tombol "Muat ulang". */
  const cobaMuatSesi = useCallback(async () => {
    setMemuat(true);
    setGagalMemuat(null);
    try {
      const tersimpan = await ambilToken(KUNCI_TOKEN);
      if (tersimpan) {
        setTokenApi(tersimpan);
        const { pengguna: p } = await api.get('/auth/me');
        setPengguna(p);
      }
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        setTokenApi(null);
        await hapusToken(KUNCI_TOKEN).catch(() => {});
      } else {
        // Jaringan/timeout/server bermasalah: jangan keluarkan pengguna, tampilkan opsi muat ulang.
        setGagalMemuat(err ?? new Error());
      }
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    cobaMuatSesi();
  }, [cobaMuatSesi]);

  const terapkanSesi = useCallback(async ({ token, pengguna: p }) => {
    setTokenApi(token);
    await simpanToken(KUNCI_TOKEN, token);
    setPengguna(p);
    return p;
  }, []);

  const masuk = useCallback(
    async (email, password) => terapkanSesi(await api.post('/auth/login', { email, password })),
    [terapkanSesi],
  );

  /** Login Google: kirim ID token ke server untuk diverifikasi (POST /auth/google). */
  const masukDenganGoogle = useCallback(
    async (idToken) => terapkanSesi(await api.post('/auth/google', { idToken })),
    [terapkanSesi],
  );

  /** Muat ulang profil dari server (mis. jumlahLaporan bertambah setelah membuat laporan). Gagal -> data lama dipakai. */
  const segarkanPengguna = useCallback(async () => {
    try {
      const { pengguna: p } = await api.get('/auth/me');
      setPengguna(p);
    } catch {
      // Biarkan data profil yang sudah ada; layar lain menangani error koneksi.
    }
  }, []);

  const keluar = useCallback(async () => {
    setTokenApi(null);
    await hapusToken(KUNCI_TOKEN).catch(() => {});
    setPengguna(null);
  }, []);

  // Token ditolak server di tengah sesi (kedaluwarsa/dicabut) -> kembali ke login dengan bersih.
  useEffect(() => {
    setPenanganSesiBerakhir(() => {
      keluar();
    });
    return () => setPenanganSesiBerakhir(null);
  }, [keluar]);

  const nilai = useMemo(
    () => ({ pengguna, memuat, masuk, masukDenganGoogle, keluar, segarkanPengguna, gagalMemuat, cobaMuatSesi }),
    [pengguna, memuat, masuk, masukDenganGoogle, keluar, segarkanPengguna, gagalMemuat, cobaMuatSesi],
  );
  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>');
  return ctx;
}
