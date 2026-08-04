# Deploy — theglobal.school (Firebase project `gen-lang-client-0345505794`)

Arquitectura: sitio estático Astro con **build dual por idioma**.
- EN → `dist-en/` → target `en` → sitio `theglobal-en` → dominio `theglobal.school`
- ES → `dist-es/` → target `es` → sitio `theglobal-es` → dominio `es.theglobal.school`
- Formularios → Cloud Function `submitLead` (rewrite `/api/lead`), Acumbamail SMTP desde `hello@theglobal.school`.

> El deploy va a URLs de **staging** de Firebase (`*.web.app`). NO afecta al sitio en vivo
> (sigue en BanaHosting) hasta el cutover de DNS (Fase 5).

---

## 0. Autenticación (una vez)
```bash
firebase login --reauth
```

## 1. Build
```bash
cd ~/Developer/theglobal.school
npm run build           # genera dist-en/ y dist-es/
```

## 2. Crear los 2 sites de Hosting (una vez)
Los IDs de site son globales; si están tomados, elige otros y ajusta `.firebaserc`.
```bash
firebase hosting:sites:create theglobal-en --project gen-lang-client-0345505794
firebase hosting:sites:create theglobal-es --project gen-lang-client-0345505794
# Vincular targets (ya declarados en .firebaserc, esto los aplica):
firebase target:apply hosting en theglobal-en --project gen-lang-client-0345505794
firebase target:apply hosting es theglobal-es --project gen-lang-client-0345505794
```

## 3. Secrets de Acumbamail para la función (una vez)
Usa las MISMAS keys de Acumbamail de los otros proyectos Pro-Latam.
```bash
firebase functions:secrets:set SMTP_USER --project gen-lang-client-0345505794
firebase functions:secrets:set SMTP_PASS --project gen-lang-client-0345505794
```
(La función ya tiene host/puerto/from fijos: `smtp.acumbamail.com:587`, `hello@theglobal.school`.)
Requiere que el project esté en plan **Blaze** (necesario para Cloud Functions).

## 4. Deploy
> ⚠️ El project `gen-lang-client-0345505794` es COMPARTIDO con el app **Aliados-GlobalSchool-main**
> (que tiene su propia función `api` en el codebase `default`). Por eso theglobal.school usa un
> codebase propio: **`theglobal`**. Despliega SIEMPRE con el codebase acotado para no tocar `api`.
```bash
# Hosting (ambos idiomas) + solo nuestro codebase de functions
firebase deploy --only "hosting,functions:theglobal" --project gen-lang-client-0345505794
```
Deploy selectivo si se necesita:
```bash
firebase deploy --only hosting:en --project gen-lang-client-0345505794
firebase deploy --only hosting:es --project gen-lang-client-0345505794
firebase deploy --only functions:theglobal --project gen-lang-client-0345505794
```
> Si al desplegar `functions:theglobal` pregunta por borrar `api`, responde **N**
> (sigue perteneciendo a Aliados). Con el codebase propio ya NO debería preguntarlo.

## 5. URLs de staging para QA
- EN: `https://theglobal-en.web.app`
- ES: `https://theglobal-es.web.app`
- Probar: home, un artículo, `/contact/` + envío de formulario, `/robots.txt`, `/sitemap-index.xml`, un redirect 301.

## 6. Cutover DNS (Fase 5, cuando el QA pase)
1. Bajar TTL en el DNS actual (BanaHosting) 24–48 h antes.
2. En Firebase Hosting, añadir dominios personalizados:
   - `theglobal.school` → sitio `theglobal-en`
   - `es.theglobal.school` → sitio `theglobal-es`
3. Poner los registros que indique Firebase en **Porkbun** (A / TXT de verificación).
4. Verificar en Search Console, resubir sitemaps, monitorear 72 h.
5. Mantener WordPress apagado pero respaldado 2–4 semanas; luego baja de BanaHosting.
