/**
 * API UC01 - membuat & merevisi laporan. Pemilik: P2. Kontrak: src/docs/API.md#uc01
 */
import { api } from './client';

/**
 * @param {{ foto: { uri: string, mimeType?: string, fileName?: string }, kategori: string, deskripsi: string,
 *           latitude: number, longitude: number, sumberLokasi: 'GPS'|'MANUAL' }} data
 */
function keForm({ foto, ...isian }) {
  const form = new FormData();
  if (foto) {
    form.append('foto', { uri: foto.uri, type: foto.mimeType ?? 'image/jpeg', name: foto.fileName ?? 'foto.jpg' });
  }
  for (const [k, v] of Object.entries(isian)) if (v !== undefined && v !== null) form.append(k, String(v));
  return form;
}

export const laporanApi = {
  /** POST /laporan -> { laporan: LaporanSaya } (status "Menunggu Verifikasi"). */
  buat: (data) => api.kirimForm('POST', '/laporan', keForm(data)),
  /**
   * PUT /laporan/:id/revisi -> { laporan: LaporanSaya }. Semua field opsional; kirim hanya yang berubah
   * (foto baru, kategori, deskripsi, latitude+longitude+sumberLokasi). 409 bila status bukan "Perlu Revisi".
   */
  revisi: (id, data) => api.kirimForm('PUT', `/laporan/${id}/revisi`, keForm(data)),
};
