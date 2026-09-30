# CashFlow Web

Angular 22 + Angular Material client for the CashFlow API (`C:\Projects\CachFlow`). Same structure as RentFlow-web: `core/` (auth, guards, interceptors, http, i18n, models, services), `features/` (one folder per page), `shared/ui/`.

```powershell
npm ci
npm start          # http://localhost:4200, /api is proxied to https://localhost:7177 (proxy.conf.json)
npm test
npm run lint
npm run build
```

Start the API first (`dotnet run --project CashFlow.Api --launch-profile https` in the CashFlow solution).

Pages: Αρχική (month overview), Κινήσεις, Πάγιες κινήσεις, Προϋπολογισμός, Ετήσια εικόνα, Κατηγορίες.
