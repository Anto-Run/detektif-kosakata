/**
 * SCORE STORE - PETUALANGAN DETEKTIF KOSAKATA
 * Penyimpanan skor & refleksi bersifat HYBRID:
 *  - Selalu disimpan ke localStorage (per perangkat) lebih dulu, sehingga
 *    game tetap berfungsi penuh secara offline dan tanpa konfigurasi apa pun.
 *  - Jika firebase-config.js sudah diisi guru (lihat SETUP_FIREBASE.md), skor
 *    JUGA dikirim ke Firestore, sehingga Papan Peringkat bisa menampilkan
 *    gabungan skor dari seluruh HP siswa di kelas, bukan cuma satu perangkat.
 *  - Jika Firestore gagal/tidak dikonfigurasi, semua fungsi otomatis jatuh
 *    kembali ke data lokal saja - tidak ada error yang muncul ke siswa.
 */
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';

const STORAGE_KEY = 'detektif_kosakata_scores_v1';
const SCORES_COLLECTION = 'skor_deteksi_kosakata';

let dbPromise = null;

function readLocalScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Gagal membaca skor lokal:', e);
    return [];
  }
}

function writeLocalScores(scores) {
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

function getDb() {
  if (!isFirebaseConfigured) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = (async () => {
      try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js');
        const firestore = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
        const app = initializeApp(firebaseConfig);
        const db = firestore.getFirestore(app);
        return { db, firestore };
      } catch (e) {
        console.warn('Firebase gagal dimuat, leaderboard hanya lokal:', e);
        return null;
      }
    })();
  }
  return dbPromise;
}

/**
 * Menyimpan skor baru. Selalu tersimpan lokal; jika Firestore terkonfigurasi,
 * juga dikirim ke cloud agar terlihat oleh perangkat lain. Mengembalikan id
 * catatan (id cloud jika berhasil terkirim, atau id lokal jika tidak).
 */
async function submitScore(scoreData) {
  const scores = readLocalScores();
  const id = makeId();
  const record = { ...scoreData, id, createdAt: new Date().toISOString() };
  scores.push(record);
  writeLocalScores(scores);

  const ctx = await getDb();
  if (ctx) {
    try {
      const { db, firestore } = ctx;
      const ref = await firestore.addDoc(firestore.collection(db, SCORES_COLLECTION), {
        ...scoreData,
        createdAt: firestore.serverTimestamp()
      });
      record.cloudId = ref.id;
      writeLocalScores(scores);
      return ref.id;
    } catch (e) {
      console.warn('Gagal mengirim skor ke cloud, tersimpan lokal saja:', e);
    }
  }
  return id;
}

/**
 * Menambahkan field refleksi ke catatan skor yang sudah ada (lokal & cloud).
 */
async function attachReflection(docId, reflection) {
  if (!docId) return false;
  let cloudOk = false;

  const ctx = await getDb();
  if (ctx) {
    try {
      const { db, firestore } = ctx;
      await firestore.updateDoc(firestore.doc(db, SCORES_COLLECTION, docId), { reflection });
      cloudOk = true;
    } catch (e) {
      console.warn('Gagal menyimpan refleksi ke cloud:', e);
    }
  }

  const scores = readLocalScores();
  const idx = scores.findIndex((s) => s.id === docId || s.cloudId === docId);
  if (idx !== -1) {
    scores[idx].reflection = reflection;
    writeLocalScores(scores);
  }
  return cloudOk || idx !== -1;
}

/**
 * Mengambil daftar skor tertinggi (default 20) untuk Papan Peringkat.
 * Memakai data cloud (gabungan seluruh siswa) jika tersedia, jika tidak
 * jatuh kembali ke data lokal perangkat ini saja.
 */
async function fetchTopScores(limitCount = 20) {
  const ctx = await getDb();
  if (ctx) {
    try {
      const { db, firestore } = ctx;
      const q = firestore.query(
        firestore.collection(db, SCORES_COLLECTION),
        firestore.orderBy('xp', 'desc'),
        firestore.limit(limitCount)
      );
      const snap = await firestore.getDocs(q);
      if (!snap.empty) {
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    } catch (e) {
      console.warn('Gagal memuat leaderboard cloud, memakai data lokal:', e);
    }
  }

  const scores = readLocalScores();
  return [...scores]
    .sort((a, b) => (b.xp || 0) - (a.xp || 0))
    .slice(0, limitCount);
}

export { isFirebaseConfigured, submitScore, attachReflection, fetchTopScores };
