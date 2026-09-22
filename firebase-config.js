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
  apiKey: "GANTI_DENGAN_API_KEY",
  authDomain: "GANTI.firebaseapp.com",
  projectId: "GANTI",
  storageBucket: "GANTI.appspot.com",
  messagingSenderId: "GANTI",
  appId: "GANTI"
};

const isFirebaseConfigured = !Object.values(firebaseConfig).some((v) => v.startsWith('GANTI'));

export { firebaseConfig, isFirebaseConfigured };
