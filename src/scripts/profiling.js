/**
 * Script Profiling Performa Query Modul P5 (Pemda).
 */
process.env.NODE_ENV = 'test';

import { pool } from '../server/src/db/pool.js';
import { getLaporanTerverifikasi } from '../server/src/models/laporan/prioritas.js';
import { getFasilitasBerulang } from '../server/src/models/fasilitas/berulang.js';

async function jalankanProfiling() {
  console.log('==================================================');
  console.log('       MEMULAI PROFILING QUERY MODUL P5           ');
  console.log('==================================================\n');

  try {
    console.time(' Waktu Eksekusi getLaporanTerverifikasi');
    const prioritas = await getLaporanTerverifikasi(pool, {});
    console.timeEnd(' Waktu Eksekusi getLaporanTerverifikasi');
    console.log(` Hasil: Memuat ${prioritas?.length || 0} laporan terverifikasi.\n`);

    console.time(' Waktu Eksekusi getFasilitasBerulang');
    const fasilitasBerulang = await getFasilitasBerulang(pool, { limit: 100 });
    console.timeEnd(' Waktu Eksekusi getFasilitasBerulang');
    console.log(` Hasil: Memuat ${fasilitasBerulang?.length || 0} fasilitas rusak berulang.\n`);


    console.log('--------------------------------------------------');
    console.log('  EXPLAIN ANALYZE: Query Fasilitas Berulang');
    console.log('--------------------------------------------------');
    
    const queryExplain = `
      EXPLAIN ANALYZE 
      SELECT id_fasilitas, nama_fasilitas, jumlah_kerusakan_berulang 
      FROM fasilitas 
      WHERE kandidat_evaluasi = true 
      ORDER BY jumlah_kerusakan_berulang DESC 
      LIMIT 10
    `;
    
    const { rows } = await pool.query(queryExplain);
    rows.forEach((row) => console.log(row['QUERY PLAN']));

    console.log('\n==================================================');
    console.log('             PROFILING SELESAI                    ');
    console.log('==================================================');
  } catch (err) {
    console.error(' Terjadi kesalahan saat profiling:', err);
  } finally {
    await pool.end();
  }
}

jalankanProfiling();