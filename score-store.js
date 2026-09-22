/**
 * SCORE STORE - PETUALANGAN DETEKTIF KOSAKATA
 * Penyimpanan skor & refleksi 100% lokal di perangkat (localStorage).
 * Tidak ada koneksi internet atau server eksternal - game berjalan sepenuhnya
 * offline dan siap di-deploy sebagai situs statis (mis. Cloudflare Pages).
 *
 * Catatan penting untuk guru: skor tersimpan per BROWSER/PERANGKAT, bukan
 * gabungan semua siswa. Papan Peringkat di dalam game hanya menampilkan
 * riwayat permainan yang pernah diselesaikan di perangkat yang sedang
 * dipakai (cocok untuk 1 laptop/tablet dipakai bergiliran di kelas).
 */

const STORAGE_KEY = 'detektif_kosakata_scores_v1';

function readScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Gagal membaca skor lokal:', e);
    return [];
  }
}

function writeScores(scores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    return true;
  } catch (e) {
    console.warn('Gagal menyimpan skor lokal (localStorage penuh/nonaktif):', e);
    return false;
  }
}

function makeId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Menyimpan skor baru ke localStorage. Mengembalikan id catatan.
 */
async function submitScore(scoreData) {
  const scores = readScores();
  const id = makeId();
  scores.push({ ...scoreData, id, createdAt: new Date().toISOString() });
  writeScores(scores);
  return id;
}

/**
 * Menambahkan field refleksi ke catatan skor yang sudah ada.
 */
async function attachReflection(docId, reflection) {
  if (!docId) return false;
  const scores = readScores();
  const idx = scores.findIndex((s) => s.id === docId);
  if (idx === -1) return false;
  scores[idx].reflection = reflection;
  return writeScores(scores);
}

/**
 * Mengambil daftar skor tertinggi (default 20) untuk Papan Peringkat.
 */
async function fetchTopScores(limitCount = 20) {
  const scores = readScores();
  return [...scores]
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .slice(0, limitCount);
}

export { submitScore, attachReflection, fetchTopScores };
