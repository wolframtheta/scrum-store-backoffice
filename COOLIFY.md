# Configuració de Variables d'Entorn a Coolify

## Variables Necessàries

Per que l'aplicació funcioni correctament a Coolify, configura les següents variables d'entorn:

### Backoffice

```env
PRODUCTION=true
API_URL=https://store.scrum-app.com/api/v1
```

## On configurar-les

1. Accedeix al teu projecte a Coolify
2. Ves a la pestanya **Environment Variables**
3. Afegeix cada variable amb el seu valor
4. Clica **Save**
5. Re-desplega l'aplicació

## Com funciona

Durant el build:
1. L'script `scripts/set-env.js` s'executa automàticament
2. Detecta que els fitxers `.env.local` no existeixen (no estan al repositori)
3. Llegeix les variables d'entorn del sistema
4. Genera el fitxer `src/environments/environment.ts` automàticament
5. Angular compila amb aquesta configuració

## Important

- ❌ **NO** pujar mai fitxers `.env.*` al repositori (excepte `.env.example`)
- ✅ **SÍ** configurar les variables d'entorn a Coolify per cada projecte
- ✅ Cada entorn (pre/pro) ha de tenir les seves pròpies variables

## Verificació

Després del deploy, pots verificar que les variables s'han carregat correctament consultant els logs del build. Hauries de veure:

```
✓ Environment file generated: /app/src/environments/environment.ts
⚠ .env.local not found, using environment variables
  production: true
  apiUrl: https://store.scrum-app.com/api/v1
```
