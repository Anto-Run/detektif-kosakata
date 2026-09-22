/**
 * KONFIGURASI FIREBASE - PETUALANGAN DETEKTIF KOSAKATA
 *
 * Ganti seluruh nilai di bawah ini dengan config project Firebase Anda sendiri.
 * Cara mendapatkannya: lihat panduan langkah-demi-langkah di SETUP_FIREBASE.md
 *
 * Selama nilai di bawah masih "GANTI_...", leaderboard tetap berfungsi secara
 * LOKAL (per HP/perangkat) seperti biasa - hanya fitur leaderboard GABUNGAN
 * seluruh kelas yang nonaktif otomatis (tidak ada error yang muncul ke siswa).
 */
const firebaseConfig = {
  apiKey: "AIzaSyAuzrL_K-kA3FRaGUZCmDgENKeM-NMmFJk",
  authDomain: "deteksi-kosakata.firebaseapp.com",
  projectId: "deteksi-kosakata",
  storageBucket: "deteksi-kosakata.firebasestorage.app",
  messagingSenderId: "861048194618",
  appId: "1:861048194618:web:7a1f67b3ff59c797881703"
};

const isFirebaseConfigured = !Object.values(firebaseConfig).some((v) => v.startsWith('GANTI'));

export { firebaseConfig, isFirebaseConfigured };
