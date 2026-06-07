# Hayat Mobil

Afet yönetim sistemi — ASP.NET Core Web API + React PWA.

## Proje yapısı

```
HayatMobil.Api/     Backend (API + statik dosya sunucusu)
HayatMobil.Web/     Frontend (React + Vite)
```

Statik görseller (logo, ikon, PWA) `HayatMobil.Web/public/` altındadır; build sonrası `HayatMobil.Api/wwwroot/` içine kopyalanır.

## Gereksinimler

- [.NET SDK 10](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (frontend geliştirme/derleme için)

## Çalıştırma

```bash
# Backend (http://localhost:5000)
cd HayatMobil.Api
dotnet run
```

İlk kayıt olan kullanıcı PM (Kriz Komuta Merkezi) olur; sonraki kayıtlar afetzede rolüyle başlar.

Production için önce frontend derleyin; çıktı `HayatMobil.Api/wwwroot` klasörüne yazılır:

```bash
cd HayatMobil.Web
npm install
npm run build
cd ../HayatMobil.Api
dotnet run
```

## Geliştirme (hot reload)

```bash
# Terminal 1 — API
cd HayatMobil.Api
dotnet run

# Terminal 2 — Frontend
cd HayatMobil.Web
npm install
npm run dev
```

## Frontend mimarisi

```
HayatMobil.Web/src/
├── App.jsx                      # Provider zinciri + routing
├── providers/                   # QueryClient + context birleştirme
├── context/
│   ├── I18nContext.jsx          # Dil
│   ├── ShellContext.jsx         # Sekme, toast, mobil görünüm
│   ├── AuthContext.jsx          # Oturum, giriş/kayıt
│   └── AppContext.jsx           # useApp() facade
├── features/
│   ├── auth/hooks/              # useAuth
│   ├── tickets/hooks/           # useTicketActions
│   ├── missing/hooks/
│   ├── inventory/hooks/ + components/
│   ├── admin/hooks/
│   ├── map/hooks/               # useLocation, useMapUi
│   ├── dashboard/hooks/         # useMedicalActions
│   ├── shared/hooks/            # React Query (useAppQueries)
│   └── …/                       # UI sekmeleri ve paneller
├── hooks/                       # Paylaşılan: useToast, useI18n, useNetworkQuality
├── api/                         # client.js, queryClient.js
├── lib/, components/, styles/
```

Sunucu verisi **TanStack React Query** ile yönetilir (4 sn polling). `useApp()` geriye dönük uyumluluk için tüm state'i tek noktadan sunar; ayrıca `useI18nContext()`, `useShellContext()`, `useAuthContext()` kullanılabilir.

## Backend katmanları

```
HayatMobil.Api/
├── Endpoints/       # HTTP route modülleri
├── Models/          # API request DTO'ları
├── Services/        # İş kuralları
├── Domain/          # Saf domain yardımcıları
├── Data/            # Veritabanı
└── Infrastructure/  # Auth, host
```
