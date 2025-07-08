# LangBot

![Vercel Deploy Status](https://vercel.com/api/your-vercel-username/telegram-langbot/deployments?style=flat)
LangBot adalah bot latihan bahasa Inggris interaktif yang dirancang untuk membantu kamu meningkatkan kemampuan bahasa Inggris kamu dengan cara yang menyenangkan dan efektif langsung di Telegram.

## Fitur Utama

- **Latihan Acak (`/latihan`)**: Dapatkan soal latihan acak dari berbagai topik untuk menguji kemampuan umum kamu.
- **Latihan Bertema (`/tema [nama_tema]`)**: Fokus pada area tertentu. Pilih latihan soal berdasarkan tema spesifik seperti 'makanan', 'travel', 'dasar', 'emosi', 'teknologi', 'lingkungan', dan banyak lagi.
- **Tantangan Harian (`/daily`)**: Ikuti tantangan harian 5 soal berurutan untuk menguji progres belajar kamu setiap hari. Tantangan ini dapat diikuti sekali sehari.
- **Cek Progres (`/status`)**: Lihat perkembangan belajar kamu, termasuk total XP, level, jumlah jawaban benar, dan salah.
- **Bantuan (`/help`)**: Menampilkan daftar semua perintah yang tersedia.
- **Tentang Bot (`/about`)**: Menampilkan informasi mengenai bot, teknologi yang digunakan, dan detail pengembang.

## Tech Stack

Bot ini dibangun menggunakan kombinasi teknologi modern untuk kinerja optimal dan skalabilitas:

- **Backend / Logika Bot**: [Node.js](https://nodejs.org/en/) (JavaScript)
- **Serverless Platform**: [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/overview) (untuk menghosting logika bot sebagai webhook Telegram).
- **Database**: [PostgreSQL](https://www.postgresql.org/) (dikelola melalui [Supabase](https://supabase.com/) sebagai Backend-as-a-Service).
- **Version Control**: [Git](https://git-scm.com/) & [GitHub](https://github.com/)

## Persyaratan Sistem

- [Node.js](https://nodejs.org/en/) (v18 atau lebih baru)
- [npm](https://www.npmjs.com/) (Node Package Manager)
- [Git](https://git-scm.com/)
- Akun [Telegram](https://telegram.org/)
- Akun [GitHub](https://github.com/)
- Akun [Vercel](https://vercel.com/)
- Akun [Supabase](https://supabase.com/)

## Setup & Deployment

Ikuti langkah-langkah di bawah ini untuk mengatur dan men-deploy LangBot kamu sendiri:

### 1. Kloning Repositori

Mulai dengan mengkloning repositori ini ke mesin lokal kamu:

```bash
git clone [https://github.com/mubaihaqi/telegram-langbot.git](https://github.com/mubaihaqi/telegram-langbot.git)
cd telegram-langbot
```

### 2\. Instal Dependensi

Instal semua paket Node.js yang diperlukan:

```bash
npm install
```

### 3\. Konfigurasi Supabase

a. **Buat Proyek Supabase**: \* Buka [dashboard Supabase](https://www.google.com/search?q=https://app.supabase.com/). \* Buat "New Project". Catat **Database Password** kamu. \* Pilih region yang terdekat dengan lokasi kamu.

b. **Dapatkan Kredensial API**: \* Di dashboard proyek Supabase kamu, navigasikan ke **Project Settings \> API**. \* Catat **`Project URL`** dan **`anon (public)`** key kamu.

c. **Buat Skema Database**: \* Di dashboard Supabase, navigasikan ke **SQL Editor** (`< >`). \* Jalankan query SQL berikut untuk membuat tabel `users` dan `questions`, serta tipe `ENUM` yang diperlukan:

````
```sql
-- Tambahkan ENUM type
CREATE TYPE question_type AS ENUM ('vocab', 'sentence', 'grammar', 'synonym', 'antonym', 'idiom');
-- Sesuaikan 'idiom' atau tambahkan yang lain jika kamu sudah menambahkannya.

-- Tabel users
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  last_daily DATE,
  current_question_id BIGINT,
  daily_question_ids JSONB,
  daily_current_index INTEGER
);

-- Tabel questions
CREATE TABLE questions (
  id BIGSERIAL PRIMARY KEY,
  type question_type NOT NULL,
  theme TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  answer_idx INTEGER NOT NULL,
  explanation TEXT
);
```

* **Opsional**: Tambahkan beberapa data soal awal ke tabel `questions` kamu melalui SQL Editor atau Table Editor.
````

### 4\. Konfigurasi Environment Variables

a. **Buat File `.env`**: \* Di root proyek kamu, buat file bernama `.env`. \* Isi dengan kredensial kamu:

````
```
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN_HERE
SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL_HERE
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY_HERE
```
* Ganti placeholder dengan token bot Telegram kamu dan kredensial Supabase.
````

b. **Konfigurasi `.gitignore`**: \* Pastikan file `.env` dan folder `node_modules/` ditambahkan ke `.gitignore` kamu agar tidak ter-commit ke GitHub:

````
```
# .gitignore
.env
node_modules/
```
````

### 5\. Deploy ke Vercel

a. **Buat Repositori GitHub**: \* Buat repositori baru di GitHub (misal: `telegram-langbot`). \* Hubungkan proyek lokal kamu ke repositori GitHub tersebut dan push kode kamu:

````
```bash
git add .
git commit -m "Initial LangBot project setup"
git remote add origin [https://github.com/mubaihaqi/telegram-langbot.git](https://github.com/mubaihaqi/telegram-langbot.git) # Ganti dengan URL repo kamu
git branch -M main
git push -u origin main
```
````

b. **Impor Proyek di Vercel**: \* Buka [dashboard Vercel](https://vercel.com/dashboard). \* Klik "Add New..." \> "Project". \* Pilih "Import Git Repository" dan cari repositori `telegram-langbot` kamu. \* **Penting**: Di bagian "Environment Variables" pada pengaturan deployment, tambahkan `TELEGRAM_BOT_TOKEN`, `SUPABASE_URL`, dan `SUPABASE_ANON_KEY` dengan nilai yang sesuai. \* Klik "Deploy".

c. **Dapatkan URL Deployment**: \* Setelah deployment berhasil, Vercel akan memberikan kamu sebuah URL (misal: `https://your-project-name.vercel.app`). Salin URL ini.

### 6\. Atur Webhook Telegram

Beritahu Telegram di mana webhook bot kamu berada:

```bash
curl -F "url=[https://your-project-name.vercel.app/api/telegram](https://your-project-name.vercel.app/api/telegram)" \
  [https://api.telegram.org/bot](https://api.telegram.org/bot)<YOUR_TELEGRAM_BOT_TOKEN>/setWebhook
```

- Ganti `https://your-project-name.vercel.app/api/telegram` dengan URL Vercel kamu (pastikan ada `/api/telegram` di akhirnya).
- Ganti `<YOUR_TELEGRAM_BOT_TOKEN>` dengan token bot Telegram kamu.

Jika berhasil, kamu akan melihat respons `{"ok":true,"result":true,"description":"Webhook was set"}`.

### 7\. Perbarui Info Bot di BotFather

Agar bot kamu lebih informatif dan mudah digunakan, perbarui detailnya melalui @BotFather di Telegram:

- **Botpic**: Gunakan `/setuserpic`
- **About**: Gunakan `/setabout`
  - `Tingkatkan bahasa Inggrismu! Latihan harian interaktif.`
- **Description**: Gunakan `/setdescription`
  - `Selamat datang di LangBot, teman belajar bahasa Inggris interaktif kamu! Tingkatkan kemampuan kosakata, tata bahasa, dan kalimat kamu melalui: 📚 /latihan, 🎯 /tema [nama_tema], 📅 /daily, 📊 /status, ℹ️ /about. Jadikan belajar bahasa Inggris lebih efektif & menyenangkan. Ketik /help untuk daftar perintah!`
- **Commands**: Gunakan `/setcommands`
  - ```
      /start - Mulai interaksi dengan bot dan dapatkan sambutan.
      /help - Tampilkan daftar perintah yang tersedia.
      /latihan - Dapatkan satu soal latihan acak dari semua topik.
      /tema - Mulai latihan soal berdasarkan tema spesifik (contoh: /tema makanan).
      /daily - Ikuti tantangan harian 5 soal untuk menguji diri kamu setiap hari.
      /status - Lihat progres belajar kamu: XP, Level, dan statistik jawaban.
      /about - Informasi tentang bot dan pengembang.
    ```
- **Privacy Policy**: Gunakan `/setprivacypolicy` (tautkan ke URL kebijakan privasi kamu jika ada).

## Penggunaan Bot

Setelah deployment selesai, kamu dapat mulai berinteraksi dengan LangBot di Telegram:

1.  Cari bot dengan username: `@langmylughbot`
2.  Ketik `/start` untuk memulai percakapan.
3.  Coba perintah lain seperti `/latihan`, `/daily`, `/tema makanan`, `/status`, `/help`, dan `/about`.

## Struktur Proyek

```
telegram-langbot/
├── api/
│   └── telegram.js            # Webhook handler utama untuk semua perintah bot
├── lib/
│   └── db.js                  # Setup koneksi Supabase client
├── supabase/
│   └── schema.sql             # Skema database awal (untuk referensi, sudah dijalankan di SQL Editor)
├── data/
│   └── questions.json         # Contoh data soal (bisa diisi langsung ke DB)
├── .env                       # Variabel lingkungan lokal (jangan di-commit!)
├── .gitignore                 # File yang diabaikan Git
├── package.json               # Daftar dependensi dan script proyek Node.js
├── vercel.json                # Konfigurasi deployment Vercel
└── README.md                  # Dokumentasi proyek ini
```
