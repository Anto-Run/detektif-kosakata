# Panduan Setup Papan Peringkat Gabungan (Firebase)

Panduan ini untuk **guru/pengelola**, bukan siswa. Tujuannya: agar skor XP, gelar, dan lencana dari **seluruh siswa** — walau mereka bermain di HP masing-masing yang berbeda-beda — bisa muncul digabung dalam satu Papan Peringkat di dalam game.

**Tanpa mengikuti panduan ini, game tetap bisa dimainkan normal.** Skor akan tetap tersimpan otomatis di tiap HP (localStorage), hanya saja Papan Peringkat hanya menampilkan skor dari perangkat itu sendiri, bukan gabungan sekelas.

Tidak perlu bisa coding — ikuti langkah bernomor di bawah ini. Perkiraan waktu: 10–15 menit.

---

## 1. Buat Project Firebase (gratis)

1. Buka [https://console.firebase.google.com](https://console.firebase.google.com) dan login dengan akun Google.
2. Klik **"Add project" / "Tambahkan project"**.
3. Beri nama project, misalnya `detektif-kosakata`. Lanjutkan sampai project selesai dibuat (Google Analytics boleh dimatikan, tidak diperlukan).

## 2. Aktifkan Firestore Database

1. Di menu kiri Firebase Console, buka **Build → Firestore Database**.
2. Klik **"Create database"**.
3. Pilih lokasi server terdekat (misalnya `asia-southeast2 (Jakarta)`), lalu klik lanjut.
4. Pilih mode **"Start in production mode"**, lalu klik **Enable**.

## 3. Pasang Aturan Keamanan (Security Rules)

1. Masih di halaman Firestore Database, buka tab **Rules** di bagian atas.
2. Hapus isi yang ada, lalu ganti dengan kode berikut:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /skor_deteksi_kosakata/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['name', 'class', 'xp'])
                    && request.resource.data.xp is int
                    && request.resource.data.xp <= 300;
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reflection']);
      allow delete: if false;
    }
  }
}
```

3. Klik **Publish**.

> Aturan ini membolehkan siapa saja *menulis* skor baru (karena siswa tidak login) tapi membatasi bentuk datanya, dan tidak ada yang bisa menghapus data. Cocok untuk kebutuhan kelas, bukan untuk data sensitif/produksi skala besar.

## 4. Ambil Config Web App

1. Di Firebase Console, klik ikon ⚙️ **Project settings** (dekat "Project Overview").
2. Scroll ke bagian **"Your apps"**, klik ikon web **`</>`**.
3. Beri nickname app, misalnya `Detektif Kosakata Web`, lalu klik **Register app** (tidak perlu centang Firebase Hosting di langkah ini, opsional).
4. Firebase akan menampilkan kode `firebaseConfig` seperti ini:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "detektif-kosakata.firebaseapp.com",
  projectId: "detektif-kosakata",
  storageBucket: "detektif-kosakata.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

5. Salin nilai-nilai tersebut, lalu buka file **`firebase-config.js`** di folder project ini, dan ganti semua nilai `"GANTI_..."` dengan nilai asli dari Firebase Anda. Simpan file.

## 5. Publikasikan Perubahan

Karena situs ini sudah terhubung ke GitHub + Cloudflare Pages, cukup:

```
git add firebase-config.js
git commit -m "Aktifkan leaderboard gabungan via Firebase"
git push
```

Cloudflare Pages otomatis akan build ulang dan situs live ikut ter-update dalam waktu singkat.

## 6. Melihat Rekap Skor Siswa

Ada dua cara:
- **Di dalam game:** buka tombol 🏆 di header (Papan Peringkat), akan menampilkan skor gabungan tertinggi dari seluruh siswa (dari HP mana pun), bisa difilter per kelas.
- **Di Firebase Console:** buka **Firestore Database → koleksi `skor_deteksi_kosakata`**, semua dokumen skor (termasuk jawaban refleksi siswa) bisa dilihat, disortir, atau diekspor.

---

### Catatan

- Selama `firebase-config.js` masih berisi nilai `"GANTI_..."`, Papan Peringkat tetap berfungsi tapi hanya menampilkan skor dari perangkat yang sedang dipakai (localStorage) — tidak ada error yang muncul ke siswa.
- Setelah dikonfigurasi, setiap skor **tetap juga tersimpan lokal** di HP masing-masing siswa sebagai cadangan — jadi kalau koneksi internet siswa terputus saat menyelesaikan permainan, skornya tidak hilang begitu saja, hanya saja tidak langsung tersinkron ke leaderboard gabungan sampai halaman dibuka ulang dengan koneksi yang baik.
- Kuota gratis Firestore (Spark plan) lebih dari cukup untuk kebutuhan satu/banyak kelas sekolah.
