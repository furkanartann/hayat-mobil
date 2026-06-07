<div align="center">

<img src="HayatMobil.Web/public/hayat-mobil-logo.png" alt="Hayat Mobil" width="120" />

# Hayat Mobil

**Afet ve acil durumlarda ihtiyaç sahipleri ile yardım ekiplerini bir araya getiren koordinasyon platformu**

[![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-Yerel-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![PWA](https://img.shields.io/badge/PWA-Mobil%20uyumlu-5A0FC8)](https://web.dev/progressive-web-apps/)

[Özellikler](#özellikler) · [Kurulum](#kurulum) · [Canlı demo](#canlı-demo) · [Proje yapısı](#proje-yapısı) · [Geliştirici](#geliştirici)

</div>

---

## Hakkında

**Hayat Mobil**, afet ve acil durumlarda afetzede, saha personeli ve kriz komuta merkezinin aynı sistem üzerinden çalışmasını sağlayan tam yığın (full-stack) bir web uygulamasıdır.

Taleplerin takibi, harita üzerinden yönlendirme ve saha operasyonlarının yönetimi tek panelde sunulur. Mobil uyumlu arayüzü sayesinde kriz anında hem merkezden hem sahadan hızlı erişim hedeflenir.

## Özellikler

| Modül | Açıklama |
|-------|----------|
| **SOS & Talep Yönetimi** | Gıda, su, barınma, sağlık, güvenlik ve kurtarma talepleri; triyaj ve durum takibi |
| **Kriz Komuta Merkezi (PM)** | Personel atama, afet ilanı, toplanma noktaları, sensör ve AI uyarıları |
| **Canlı Harita** | Afet bölgesi, rota planlama, ETA tahmini, konum paylaşımı |
| **Lojistik** | Envanter, malzeme dağıtımı, lojistik ekibi ataması |
| **Sağlık** | Paramedik ve doktor iş akışları, tıbbi kayıtlar |
| **Arama Kurtarma** | Kayıp kişi bildirimi, sivil arama, saha görevleri |
| **Çoklu dil** | Türkçe / İngilizce arayüz |
| **PWA** | Service worker, manifest; telefonda uygulama benzeri deneyim |

## Teknoloji yığını

**Backend**
- ASP.NET Core 10 Web API
- SQLite (yerel veritabanı)
- JWT kimlik doğrulama

**Frontend**
- React 19 + Vite 8
- TanStack React Query (canlı veri senkronizasyonu)
- Leaflet (harita)
- Lucide React (ikonlar)

**Dağıtım**
- Docker (çok aşamalı build)
- [Render](https://render.com) ile HTTPS destekli canlı sunum

## Kurulum

### Gereksinimler

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) 20+

### Hızlı başlangıç (production build)

```bash
git clone https://github.com/furkanartann/hayat-mobil.git
cd hayat-mobil

cd HayatMobil.Web
npm install
npm run build

cd ../HayatMobil.Api
dotnet run
```

Tarayıcıda: **http://localhost:5000**

> İlk kayıt olan kullanıcı otomatik olarak **PM (Kriz Komuta Merkezi)** olur. Sonraki kayıtlar **Afetzede** rolüyle başlar.

### Geliştirme modu (hot reload)

```bash
# Terminal 1 — API
cd HayatMobil.Api
dotnet run

# Terminal 2 — Frontend (Vite dev server)
cd HayatMobil.Web
npm install
npm run dev
```

Geliştirmede frontend `http://localhost:5173` üzerinden API'ye `localhost:5000` ile bağlanır.

## Canlı demo

Proje, Docker ile [Render](https://render.com) üzerinde yayınlanabilir:

1. GitHub reposunu Render'a bağla
2. **Runtime:** Docker
3. **Plan:** Free (demo için yeterli)

Render otomatik HTTPS sağlar; mobil cihazdan aynı URL ile demo gösterilebilir.

## Proje yapısı

```
hayat-mobil/
├── HayatMobil.Api/          # Backend API + statik dosya sunucusu (wwwroot)
│   ├── Endpoints/           # REST route modülleri
│   ├── Services/            # İş kuralları
│   ├── Data/                # SQLite şema ve migration
│   └── Infrastructure/      # Auth, JWT, host
├── HayatMobil.Web/          # React frontend (Vite)
│   ├── src/features/        # Sekme ve rol bazlı modüller
│   ├── src/components/      # Paylaşılan UI bileşenleri
│   └── public/              # Logo, PWA manifest, service worker
├── Dockerfile               # Frontend + API tek image
└── README.md
```

Frontend build çıktısı `HayatMobil.Api/wwwroot/` klasörüne yazılır; tek sunucu hem API hem arayüzü sunar.

## Roller

| Rol | Görev |
|-----|-------|
| PM | Kriz komuta merkezi, personel ve afet yönetimi |
| Afetzede | SOS talebi, güvenlik durumu |
| Lojistik | Malzeme dağıtımı, iaşe talepleri |
| Sağlık Paramedik / Doktor | Tıbbi müdahale süreçleri |
| Arama Kurtarma | Kurtarma ve kayıp kişi |
| Güvenlik | Güvenlik talepleri |
| Mühendis / IT | Sensör ve altyapı |

## Geliştirici

**Furkan Artan**

- GitHub: [@furkanartann](https://github.com/furkanartann)
- Web: [furkanartan.com.tr](https://furkanartan.com.tr/)

---

<div align="center">

*Afet anında koordinasyonu hızlandırmak için geliştirilmiştir.*

</div>
