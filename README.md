# GoDesk — IT Service Management System

GoDesk merupakan aplikasi manajemen layanan teknologi informasi (IT Service Management/ITSM) berbasis web yang dirancang untuk mengelola permintaan bantuan, tiket layanan, pengguna, kategori permasalahan, pemantauan SLA, basis pengetahuan, notifikasi, dan pelaporan dalam satu sistem terintegrasi.

Aplikasi dikembangkan dengan arsitektur full-stack menggunakan Next.js sebagai frontend, Go dengan framework Gin sebagai backend REST API, serta PostgreSQL sebagai basis data.

## 1. Gambaran Umum

GoDesk bertujuan membantu tim dukungan teknologi informasi dalam menangani permintaan layanan secara lebih terstruktur, terdokumentasi, dan mudah dipantau.

Sistem menyediakan pengelolaan tiket dari pembuatan hingga penyelesaian, pengaturan penanggung jawab, pencatatan aktivitas, pemantauan target waktu layanan, serta penyajian informasi operasional.

### Tujuan Pengembangan

- Memusatkan pengelolaan permintaan layanan TI.
- Mempermudah pencatatan dan pemantauan tiket.
- Mengelola hak akses berdasarkan peran pengguna.
- Mendukung pemantauan Service Level Agreement (SLA).
- Menyediakan dokumentasi solusi melalui Knowledge Base.
- Menyediakan laporan untuk evaluasi layanan.
- Mendukung proses kerja tim helpdesk yang lebih terstruktur.

## 2. Teknologi yang Digunakan

| Komponen | Teknologi |
|---|---|
| Frontend | Next.js 16, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Go, Gin Framework |
| Database | PostgreSQL 18 |
| Database Driver | pgx |
| Authentication | JWT dan HTTP Cookie |
| API | REST API |
| Container | Docker Compose |
| Version Control | Git dan GitHub |
| Development | macOS, MacBook, VS Code |

## 3. Fitur Utama

### 3.1 Authentication

- Login pengguna.
- Registrasi akun.
- Logout.
- Pengelolaan sesi autentikasi.
- Pembatasan akses berdasarkan role.
- Validasi akses terhadap endpoint API.

### 3.2 Dashboard

- Ringkasan informasi operasional.
- Informasi statistik tiket.
- Pemantauan aktivitas layanan.
- Navigasi menuju modul utama.

### 3.3 Ticket Management

- Membuat tiket bantuan.
- Menampilkan daftar tiket.
- Melihat detail tiket.
- Memperbarui informasi tiket.
- Mengelola status dan prioritas.
- Mengelompokkan tiket berdasarkan kategori.
- Menetapkan agen penanggung jawab.
- Melihat aktivitas dan riwayat tiket.
- Menambahkan komentar.
- Mengelola lampiran tiket.

### 3.4 User Management

- Menampilkan daftar pengguna.
- Menambahkan pengguna.
- Memperbarui informasi pengguna.
- Mengaktifkan atau menonaktifkan akun.
- Mengelola peran dan hak akses.
- Mendukung pengelolaan agen dan pelanggan.

### 3.5 Category Management

- Menampilkan kategori layanan.
- Menambahkan kategori baru.
- Mengedit kategori.
- Mengaktifkan dan menonaktifkan kategori.
- Menghapus kategori sesuai aturan.
- Mencegah kategori duplikat.
- Melindungi kategori yang masih digunakan artikel.

### 3.6 Knowledge Base

- Menampilkan artikel pengetahuan.
- Membuat artikel.
- Memperbarui artikel.
- Menghapus artikel sesuai hak akses.
- Menghubungkan artikel dengan kategori.
- Menyimpan artikel sebagai Draft.
- Menerbitkan artikel sebagai Published.
- Mengatur akses artikel berdasarkan role.

### 3.7 SLA Management

- Memantau target waktu respons.
- Memantau target waktu penyelesaian.
- Melihat kondisi SLA tiket.
- Mengelola kebijakan SLA berdasarkan prioritas.
- Mendukung pemantauan layanan berdasarkan ketentuan SLA.

### 3.8 Notification

- Menampilkan notifikasi pengguna.
- Menampilkan jumlah notifikasi belum dibaca.
- Mendukung pemberitahuan aktivitas layanan.

### 3.9 Reporting

- Menampilkan informasi laporan operasional.
- Mendukung filter laporan.
- Menyediakan ekspor laporan CSV.
- Menyediakan halaman tampilan cetak laporan.

### 3.10 Halaman Pendukung

- Help.
- Settings.
- Tampilan Login dan Register responsif.
- Dukungan tampilan aplikasi dengan tema modern.

## 4. Hak Akses Pengguna

GoDesk menggunakan Role-Based Access Control (RBAC).

| Role | Tanggung Jawab Utama |
|---|---|
| SUPER_ADMIN | Administrasi sistem dan manajemen pengguna |
| MANAGER | Pemantauan serta pengelolaan layanan dan tim |
| AGENT | Penanganan tiket dan pekerjaan dukungan |
| CUSTOMER | Pembuatan serta pemantauan tiket milik sendiri |

Akses setiap fitur dan endpoint mengikuti pemeriksaan otorisasi pada backend.

## 5. Arsitektur Sistem

```text
                  PENGGUNA
                     |
                     v
          FRONTEND NEXT.JS
            localhost:3000
                     |
                     | HTTP / REST API
                     v
              BACKEND GO
             Gin Framework
            localhost:8082
                     |
                     | SQL
                     v
              POSTGRESQL
                Docker
             localhost:5434
```

Frontend berperan sebagai antarmuka pengguna.

Backend menangani autentikasi, validasi, aturan bisnis, kontrol akses, pemrosesan permintaan, dan komunikasi dengan basis data.

PostgreSQL digunakan untuk menyimpan informasi pengguna, tiket, kategori, artikel pengetahuan, aktivitas, notifikasi, dan data layanan lainnya.

## 6. Struktur Direktori

```text
godesk/
├── backend/
│   ├── cmd/
│   │   ├── api/
│   │   ├── bootstrap-admin/
│   │   └── bootstrap-users/
│   ├── internal/
│   │   ├── activity/
│   │   ├── attachment/
│   │   ├── auth/
│   │   ├── category/
│   │   ├── config/
│   │   ├── dashboard/
│   │   ├── database/
│   │   ├── knowledge/
│   │   ├── middleware/
│   │   ├── notification/
│   │   ├── reports/
│   │   ├── router/
│   │   ├── security/
│   │   ├── sla/
│   │   ├── ticket/
│   │   └── user/
│   ├── migrations/
│   ├── scripts/
│   ├── storage/
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── i18n/
│   │   └── lib/
│   ├── package.json
│   └── next.config.ts
├── docker-compose.yml
├── .gitignore
└── README.md
```

Beberapa direktori fitur dapat berbeda sesuai versi pengembangan yang digunakan.

## 7. Persyaratan Sistem

Sebelum menjalankan aplikasi, siapkan:

- Go sesuai kebutuhan versi pada `backend/go.mod`.
- Node.js yang kompatibel dengan Next.js.
- npm.
- Docker Desktop dan Docker Compose.
- Git.
- Browser modern.
- Ruang penyimpanan yang cukup.

Pengembangan lokal proyek ini menggunakan macOS.

## 8. Instalasi Proyek

### 8.1 Clone Repository

```bash
git clone https://github.com/royandixix/godesk-itsm.git
cd godesk-itsm
```

Repository Private hanya dapat di-clone oleh akun yang memiliki izin akses.

### 8.2 Menjalankan PostgreSQL

Dari direktori utama:

```bash
docker compose up -d postgres
docker compose ps
```

Pada konfigurasi pengembangan yang digunakan, PostgreSQL tersedia melalui port host `5434`.

Periksa informasi database dan kredensial melalui `docker-compose.yml`.

### 8.3 Konfigurasi Backend

Masuk ke direktori backend:

```bash
cd backend
cp .env.example .env
```

Sesuaikan konfigurasi `.env` berdasarkan lingkungan lokal.

Konfigurasi backend mencakup:

- APP_NAME
- APP_ENV
- APP_PORT
- DATABASE_URL
- FRONTEND_URL
- JWT_SECRET
- JWT_ISSUER
- JWT_TTL_HOURS
- COOKIE_NAME
- ATTACHMENT_STORAGE_PATH
- ATTACHMENT_MAX_SIZE_MB

Gunakan JWT secret yang kuat dan jangan pernah menyimpan kredensial asli di Git.

### 8.4 Migrasi Database

File SQL tersedia pada:

```text
backend/migrations/
```

Migrasi disusun secara berurutan, mulai dari pembuatan role dan pengguna hingga modul SLA.

Untuk database baru, terapkan migrasi sesuai urutan nomor dan dependensinya menggunakan PostgreSQL.

**Penting:** Jangan menjalankan ulang seluruh migrasi pada database yang sudah berisi data tanpa memeriksa riwayat migrasi dan melakukan backup terlebih dahulu.

File seed hanya dijalankan apabila memang diperlukan.

### 8.5 Menjalankan Backend

Dari direktori `backend`:

```bash
go mod download
go run ./cmd/api
```

Alamat API lokal:

```text
http://localhost:8082
```

Pemeriksaan kesehatan API:

```bash
curl http://127.0.0.1:8082/api/v1/health
```

### 8.6 Konfigurasi Frontend

Buka Terminal lain:

```bash
cd frontend
npm ci
```

Sesuaikan konfigurasi frontend pada `.env.local` dengan alamat backend yang digunakan. Periksa kebutuhan environment pada implementasi API client frontend.

### 8.7 Menjalankan Frontend

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

Aplikasi frontend dan backend perlu berjalan secara bersamaan.

## 9. Halaman Aplikasi

| Halaman | URL Lokal |
|---|---|
| Login | `/login` |
| Register | `/register` |
| Dashboard | `/dashboard` |
| Tickets | `/tickets` |
| Agents | `/agents` |
| Customers | `/customers` |
| Categories | `/categories` |
| Knowledge Base | `/knowledge` |
| SLA Management | `/sla` |
| Reports | `/reports` |
| Help | `/help` |
| Settings | `/settings` |

Sebagian halaman membutuhkan autentikasi dan hak akses sesuai role pengguna.

## 10. REST API

Backend menyediakan endpoint dengan prefix:

```text
/api/v1
```

Contoh kelompok API:

| Modul | Endpoint |
|---|---|
| Health | `/api/v1/health` |
| Authentication | `/api/v1/auth` |
| Dashboard | `/api/v1/dashboard` |
| Tickets | `/api/v1/tickets` |
| Categories | `/api/v1/categories` |
| Knowledge Base | `/api/v1/knowledge` |
| SLA | `/api/v1/sla` |
| Reports | `/api/v1/reports` |
| Notifications | `/api/v1/notifications` |
| User Management | `/api/v1/admin/users` |

Setiap endpoint memiliki metode HTTP dan aturan hak akses yang ditentukan pada router serta handler backend.

## 11. Pengujian

### Backend

```bash
cd backend
go test ./...
go vet ./...
go build ./...
```

### Frontend

```bash
cd frontend
npx tsc --noEmit
npx eslint .
npm run build
```

### Pengujian CRUD

Pengujian otomatis lokal pada modul Category Management dan Knowledge Base sebelumnya menghasilkan:

| Hasil | Jumlah |
|---|---:|
| PASS | 20 |
| FAIL | 0 |
| SKIP | 3 |

Tiga pengujian role tambahan masih perlu diverifikasi.

Hasil tersebut merupakan pengujian pada lingkungan pengembangan lokal, bukan jaminan bahwa seluruh aplikasi telah lulus pengujian produksi.

## 12. Keamanan Aplikasi

GoDesk menerapkan beberapa mekanisme keamanan aplikasi:

- Autentikasi pengguna.
- Pembatasan akses berdasarkan peran.
- Middleware untuk endpoint terlindungi.
- Validasi data yang diterima API.
- Pengelolaan sesi autentikasi.
- Proteksi operasi tertentu sesuai aturan bisnis.

File berikut tidak boleh diunggah ke Git:

```text
.env
.env.local
node_modules/
.next/
cookies.txt
```

Jangan menyimpan password, token aktif, rahasia JWT, atau backup database berisi data sensitif pada repository.

Pastikan konfigurasi keamanan diperiksa kembali sebelum aplikasi digunakan pada lingkungan produksi.

## 13. Status Pengembangan

Modul utama telah dikembangkan dan dapat dijalankan pada lingkungan lokal.

Pekerjaan lanjutan meliputi:

- Melengkapi pengujian hak akses seluruh role.
- Melakukan pengujian alur aplikasi secara menyeluruh.
- Meninjau keamanan dan konfigurasi produksi.
- Melakukan pengujian responsivitas antarmuka.
- Menyiapkan deployment apabila aplikasi akan dipublikasikan.

Repository ini berisi source code aplikasi. Database PostgreSQL yang berjalan secara lokal tidak otomatis disertakan dalam GitHub.

## 14. Pemecahan Masalah

### Backend Tidak Terhubung ke Database

Periksa Docker dan konfigurasi `DATABASE_URL`.

```bash
docker compose ps
```

### Frontend Tidak Bisa Mengakses API

Pastikan backend berjalan, lalu periksa konfigurasi alamat API dan pengaturan CORS.

### Port Sudah Digunakan

Pastikan tidak ada proses aplikasi lama yang menggunakan port yang sama.

### Build Frontend Gagal

Jalankan pemeriksaan TypeScript, ESLint, dan build secara terpisah.

Pastikan ruang penyimpanan perangkat mencukupi.

## 15. Pengembang

**Royandi Randi**

Software Engineer / Web Developer

GitHub: [@royandixix](https://github.com/royandixix)

## 16. Repository

[GoDesk ITSM — GitHub](https://github.com/royandixix/godesk-itsm)

---

**GoDesk — Sistem Manajemen Layanan Teknologi Informasi Berbasis Web.**
