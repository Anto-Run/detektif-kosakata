# DOKUMEN PERSYARATAN SISTEM & ARSITEKTUR TEKNIS (SRS)
# "PETUALANGAN DETEKTIF KOSAKATA"
### Spesifikasi Teknis Web Mobile, Integrasi Canva, dan Panduan Implementasi Kelas

---

## 1. IKHTISAR SISTEM

Game edukasi **"Petualangan Detektif Kosakata"** dibangun dengan pendekatan multi-platform terpadu:
1. **Format Web Interaktif (HTML5/CSS3/Vanilla JS):** Aplikasi web *zero-dependency* yang ringan, dapat diakses langsung oleh siswa melalui peramban ponsel pintar (*mobile browser* seperti Google Chrome, Safari, Samsung Internet) tanpa perlu mengunduh aplikasi dari Play Store / App Store.
2. **Format Canva Presentation (Hyperlink Matrix):** Presentasi interaktif yang cocok untuk guru saat mengajar di depan kelas dengan proyektor interaktif atau papan tulis pintar (*interactive flat panel*).

---

## 2. KEBUTUHAN FUNGSIONAL (FUNCTIONAL REQUIREMENTS)

| Kode FR | Modul / Fitur | Deskripsi Kebutuhan |
| :--- | :--- | :--- |
| **FR-01** | **Profil & Pemilihan Avatar** | Pemain dapat memasukkan Nama, Kelas, Kelompok, serta memilih 1 dari 4 avatar detektif. Data tersimpan di `localStorage` peramban. |
| **FR-02** | **Peta Petualangan (Unlock Map)** | Level 1 terbuka di awal. Level 2 hingga 5 dalam status terkunci (*locked*) dan hanya akan terbuka otomatis setelah level sebelumnya berhasil diselesaikan dengan skor minimal. |
| **FR-03** | **Kalkulasi Skor & XP** | Sistem menambahkan XP secara dinamis (+10 XP per jawaban benar, +20 XP per kelulusan level, bonus Boss Final +50 XP). Bilah kemajuan (*progress bar*) ter-update seketika (*real-time*). |
| **FR-04** | **Level 1: Deteksi Kata dalam Teks** | Menampilkan teks cerita berformat paragraf naratif. Kata kunci dapat diklik atau dipilih oleh siswa untuk diarsipkan ke dalam kartu kosakata. |
| **FR-05** | **Level 2: Soal Konteks Kalimat** | Menampilkan kalimat cuplikan dengan kata tebal, opsi pilihan ganda A/B/C/D, serta umpan balik instan (hijau untuk benar, merah untuk salah) lengkap dengan penjelasan pedagogis. |
| **FR-06** | **Level 3: Sortir Gerbang Kata** | Mekanisme pengelompokan kata ke dalam 3 kategori (Kata Umum, Kata Khusus, Makna Konotatif) melalui antarmuka sentuh ramah jempol (*tap-to-assign* atau *drag-and-drop*). |
| **FR-07** | **Level 4: Bengkel Kalimat** | Formulir penulisan kalimat mandiri untuk 3 kosakata pilihan dengan validasi panjang teks dan panduan rubrik asesmen. |
| **FR-08** | **Level 5: Boss Final (10 Soal)** | Evaluasi komprehensif 10 butir soal bertipe acak/berurutan yang mencakup seluruh capaian pembelajaran dengan skor akhir terakumulasi. |
| **FR-09** | **Penganugerahan Lencana (Badges)** | Menampilkan status 5 lencana (aktif/nonaktif) berdasarkan pencapaian level siswa. |
| **FR-10** | **Refleksi Metakognitif & Ekspor Hasil** | Formulir 5 pertanyaan refleksi serta tombol unduh/tangkapan layar (*screenshot*) kartu hasil petualangan detektif. |

---

## 3. KEBUTUHAN NON-FUNGSIONAL (NON-FUNCTIONAL REQUIREMENTS)

### 3.1 Kinerja & Aksesibilitas Mobile (Mobile-First Ergonomics)
- **Ukuran Beban Muat (Payload):** Bobot total HTML, CSS, dan JS di bawah `1.5 MB` (aset gambar dikompresi WebP/JPG optimal) agar dapat dimuat dalam waktu `< 2 detik` di jaringan 4G sekolah.
- **Responsif Multi-Layar:**
  - *Smartphone Portrait:* Lebar layar `360px` hingga `430px` (iPhone SE, Galaxy A-series, Xiaomi Redmi).
  - *Tablet & Chromebook:* Lebar layar `768px` hingga `1024px`.
  - *Laptop & Proyektor Kelas:* Lebar layar `1366px` hingga `1920px` (16:9).
- **Touch Targets:** Seluruh tombol dan kartu pilihan memiliki area sentuh minimal `48 x 48 piksel` dengan batas jeda (*padding/margin*) yang aman dari sentuhan tidak sengaja.
- **Kenyamanan Visual:** Menggunakan ukuran font minimum `15px` untuk teks bodi dan `18px - 24px` untuk judul, menjaga rasio kontras warna terhadap latar minimal `4.5:1` sesuai standar WCAG 2.1 AA.

### 3.2 Audio Sintetis Web Audio API (Tanpa Dependensi File Audio Eksternal)
- Efek suara (*SFX*) tombol klik, jawaban benar (*success chime*), jawaban salah (*buzz error*), dan naik level (*fanfare fanfare*) dihasilkan secara prosedural menggunakan **Web Audio API** peramban. Hal ini menjamin suara tidak akan mengalami kegagalan muat (*failed to fetch audio*) saat kuota siswa terbatas.

---

## 4. SKENARIO IMPLEMENTASI DI KELAS OLEH GURU

### Skenario A: Pembelajaran Mandiri / Berkelompok via HP Siswa (Web Mobile)
1. Guru membagikan URL web game (atau kode QR di papan tulis).
2. Siswa membuka peramban di HP masing-masing (dapat berpasangan 2 orang per gawai untuk meningkatkan kolaborasi).
3. Siswa memasukkan Nama dan Kelompok, lalu berpetualang menyelesaikan Level 1 sampai 5.
4. Pada akhir petualangan, siswa menunjukkan kartu lencana dan hasil refleksi kepada guru.

### Skenario B: Pembelajaran Klasikal dengan Laptop & Proyektor (Canva / Web Fullscreen)
1. Guru menampilkan web game atau slide Canva di layar proyektor.
2. Kelas dibagi menjadi 4 tim detektif sesuai 4 avatar: Tim Pembaca, Tim Penjelajah, Tim Pemikir, dan Tim Kreatif.
3. Tiap tim bermusyawarah mendiskusikan petunjuk konteks untuk menjawab tantangan tiap level.
4. Perwakilan tim maju untuk menekan pilihan jawaban di laptop guru.

---

## 5. PANDUAN PENGATURAN HYPERLINK PADA CANVA PRESENTATION

Jika guru ingin mengimplementasikan materi ini pada slide presentasi Canva:
1. Buka akun Canva (disarankan Canva for Education).
2. Buat kanvas presentasi rasio **16:9** (untuk proyektor) atau **Mobile Presentation (1080 x 1920 px)** untuk HP.
3. Terapkan desain sesuai urutan pada file [GAME_DESIGN_DOCUMENT.md](file:///c:/Users/User/Downloads/game-edukasi/GAME_DESIGN_DOCUMENT.md) (Bab 6: Storyboard 30 Scene).
4. **Memberi Hyperlink Tombol:**
   - Klik elemen tombol.
   - Tekan `Ctrl + K` (Windows) atau klik ikon rantai link di toolbar atas Canva.
   - Pada dropdown, pilih nomor slide target (misal: tombol *"Mulai"* diarahkan ke Slide 2).
   - Pada slide soal pilihan ganda, arahkan pilihan yang benar ke Slide Umpan Balik Benar, dan pilihan yang salah ke Slide Umpan Balik Coba Lagi.
5. **Membagikan Link Interaktif:**
   - Klik menu **Bagikan (Share)** -> **Tautan Khusus Lihat (View-Only Link)**.
   - Salin tautan tersebut dan bagikan ke siswa (siswa dapat memencet tombol tanpa merusak susunan slide guru).
