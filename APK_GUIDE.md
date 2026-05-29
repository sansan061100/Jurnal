# Panduan Ekspor & Build APK Jurnal Trading Pro 📱

Aplikasi Jurnal Trading ini telah sepenuhnya dikonfigurasi dengan **Capacitor SDK** sehingga Anda dapat mengubahnya menjadi aplikasi Android (.apk) asli dengan sangat mudah menggunakan komputer Anda.

Berikut adalah langkah-langkah praktis dan runtut untuk melakukan build APK:

---

## Prasyarat Alat (Prerequisites)
Sebelum melakukan build, pastikan komputer Anda telah menginstal:
1. **Node.js** (Versi 18 ke atas)
2. **Android Studio** (Versi terbaru untuk kompilasi SDK-nya)
3. **Java Development Kit (JDK 17)**

---

## 🛠️ Langkah-Langkah Kompilasi APK

### Langkah 1: Ekspor Project dari AI Studio
1. Buka menu pengaturan (gigi roda / settings ekspor) di AI Studio Anda.
2. Cari opsi **Export to ZIP** atau **Download Project** untuk mengunduh seluruh file kode aplikasi ini ke komputer Anda.
3. Ekstrak file ZIP tersebut ke folder kerja di komputer Anda.

### Langkah 2: Instalasi Dependensi & Build Aset Web
Buka terminal (Command Prompt / Powershell / Git Bash) di dalam folder project hasil ekstrak tadi, lalu jalankan perintah berikut:
```bash
# 1. Pastikan semua library node_modules terinstal dengan lengkap
npm install

# 2. Compile semua kode React menjadi single bundle asset di folder dist
npm run build
```

### Langkah 3: Sinkronisasi Aset Ke Folder Android Native
Setelah aset web berhasil ter-compile di folder `dist/`, jalankan perintah sinkronisasi dari Capacitor untuk menyalin aset terbaru ke sub-folder Android asli:
```bash
# Menyinkronkan file web dan konfigurasi plugin ke sistem Android
npx cap sync
```

### Langkah 4: Buka Folder `/android` Di Android Studio
1. Jalankan aplikasi **Android Studio** di komputer Anda.
2. Pilih opsi **Open** (Buka Project) dan arahkan ke sub-folder bernama `android` yang ada di dalam direktori project Anda.
3. Tunggu hingga proses **Gradle Sync** selesai secara otomatis (Android Studio akan mengunduh file SDK pendukung yang dibutuhkan).

### Langkah 5: Run Aplikasi / Build APK
* **Untuk mencoba langsung di HP Android Anda:**
  1. Aktifkan **Developer Option** dan **USB Debugging** di HP Android Anda.
  2. Hubungkan HP ke laptop dengan kabel data.
  3. Klik tombol **Run (Segitiga Hijau)** di bagian atas Android Studio untuk menginstalnya langsung di HP Anda.

* **Untuk menghasilkan file Instalan (.apk / .aab) mandiri:**
  1. Pada menu atas Android Studio, pilih **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
  2. Tunggu proses kompilasi selesai (biasanya sekitar 1-2 menit).
  3. Setelah selesai, popup notifikasi akan muncul. Klik **Locate** untuk langsung membuka folder letak file `.apk` instalan debug (biasanya di `/android/app/build/outputs/apk/debug/app-debug.apk`).
  4. Kirim file `.apk` tersebut ke HP Anda dan instal dengan menyetujui izin pemasangan sumber tidak dikenal.

---

## 💡 Keunggulan Integrasi Capacitor di Jurnal Ini:
- **Tampilan Sangat Responsif**: UI telah dirancang menyerupai rancang bangun seluler profesional, sehingga tidak akan terpotong pada layar HP yang ramping.
- **Pemuatan Super Cepat**: Capacitor me-load aset web secara lokal di dalam native WebView sehingga tidak boros kuota data.
- **Konektivitas Cloud Aman**: Autentikasi dan data tersinkronisasi mulus ke Firebase Firestore sehingga data transaksi trading Anda di HP tidak akan hilang meski HP diganti.
