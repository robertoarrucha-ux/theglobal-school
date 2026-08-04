# Fase 5 — Cutover DNS: BanaHosting → Porkbun + Firebase Hosting

Objetivo: que `theglobal.school` (EN) y `es.theglobal.school` (ES) sirvan desde Firebase Hosting,
moviendo el DNS a Porkbun, **sin perder correo (Google Workspace) ni los subdominios activos**.

## ⚠️ Regla de oro
El correo de `@theglobal.school` está en **Google Workspace** (MX de Google) y usa DKIM/SPF.
Si el DNS nuevo en Porkbun no replica MX + SPF + DKIM + DMARC **exactamente**, el correo se cae.
Por eso: se construye la zona COMPLETA en Porkbun ANTES de cambiar nameservers.

---

## Inventario del DNS actual (capturado 2026-07-28, NS = BanaHosting)

### A REEMPLAZAR (apuntar a Firebase)
| Registro | Valor actual (BanaHosting) | Valor nuevo |
|---|---|---|
| `theglobal.school` (A, apex) | 107.6.172.84 | **A → IPs que dé Firebase** (site `theglobal-en`) |
| `www` | → apex | **Redirect 301 a apex** (en Firebase) |
| `es` (A) | 107.6.172.84 | **A → IPs que dé Firebase** (site `theglobal-es`) |

### A PRESERVAR TAL CUAL — CORREO (Google Workspace)
| Tipo | Host | Valor |
|---|---|---|
| MX | @ | `1 aspmx.l.google.com` |
| MX | @ | `5 alt1.aspmx.l.google.com` |
| MX | @ | `5 alt2.aspmx.l.google.com` |
| MX | @ | `10 alt3.aspmx.l.google.com` |
| MX | @ | `10 alt4.aspmx.l.google.com` |
| TXT (SPF) | @ | `v=spf1 include:_spf.google.com a mx include:spf.acumbamail.com ~all` |
| TXT (DMARC) | `_dmarc` | `v=DMARC1;p=quarantine;sp=none;adkim=r;aspf=r;pct=100;fo=0;rf=afrf;ri=86400` |
| TXT (DKIM Google) | `google._domainkey` | copiar el `v=DKIM1; k=rsa; p=MIGf...` EXACTO del panel actual |
| TXT (DKIM) | `default._domainkey` | copiar el `v=DKIM1; k=rsa; p=MIIB...` EXACTO del panel actual |
| CNAME (DKIM Acumbamail) | `acumbamail._domainkey` | `dkim.acumbamail.com` |

> Los valores DKIM son claves largas: cópialas EXACTAS desde el DNS actual de BanaHosting
> (cPanel → Zone Editor), no las teclees.

### A PRESERVAR — VERIFICACIONES (TXT en @)
- `google-site-verification=mGyjSbJMxLlC5al219LYOm0c7uvzqIvUpi2bK-L8eSg`  ← mantiene Search Console verificado
- `facebook-domain-verification=568kmg5nksqz1f77qyha61lkd1lk1c`
- `stripe-verification=605cd6041ea13282f4bfb0d75e99037758d9951fcdc2cef504978f011953b8b5`
- `anthropic-domain-verification-dbsxvm=xppQX2p7RPa1Dqfw3nzLqZhdc`

### SUBDOMINIOS (decidir qué hacer con cada uno)
| Subdominio | Valor actual | Acción sugerida |
|---|---|---|
| `becarios` | A 107.6.172.84 (BanaHosting) | Mantener IP si sigue en BanaHosting; migrar aparte después |
| `viajes` | A 35.219.200.12 (Google Cloud) | **Preservar** — proyecto que se reutilizará (pendiente decidir subdominio vs raíz) |
| `tech-champions` | CNAME `in.wylo.space` | Preservar (servicio externo Wylo) |
| `latamawards` | A 35.219.200.12 | Preservar o redirigir a awards.pro-latam.org |
| `mail` `webmail` `cpanel` `ftp` | A 107.6.172.84 (BanaHosting) | **Descartar** al salir de BanaHosting (correo es Google, no BanaHosting) |

TTL actual del apex: ~14.363s (4h). **Bajar a 300s** 24-48h antes del corte.

---

## Secuencia de cutover (orden importa)

### Paso 1 — Firebase: añadir dominios personalizados (obtener los valores destino)
En la consola de Firebase Hosting del project `gen-lang-client-0345505794`:
- Site `theglobal-en` → Add custom domain → `theglobal.school` (+ `www.theglobal.school` como **redirect** a apex).
- Site `theglobal-es` → Add custom domain → `es.theglobal.school`.
Firebase mostrará: un **TXT de verificación** de propiedad + los **registros A** (o A + AAAA) a usar.
Anótalos — son el destino real.

### Paso 2 — Bajar TTL (en BanaHosting, ahora)
En cPanel → Zone Editor, baja el TTL del A de apex, `www` y `es` a **300**. Espera a que propague (hasta 4h).

### Paso 3 — Construir la zona COMPLETA en Porkbun
Recrea en Porkbun TODOS los registros de arriba:
- Correo (MX, SPF, DKIM google/default/acumbamail, DMARC) → **idénticos**.
- Verificaciones (los 4 TXT) → idénticos.
- Subdominios a preservar (viajes, tech-champions, becarios, latamawards).
- Apex + `es` → los **A de Firebase** (Paso 1). `www` → redirect (Firebase).
- Añade el **TXT de verificación de Firebase** (Paso 1).
> NO cambies nameservers todavía. Solo deja la zona lista.

### Paso 4 — Cambiar nameservers a Porkbun
Cuando la zona esté completa y revisada, apunta los NS del dominio a los de Porkbun
(`curitiba.ns.porkbun.com`, `fortaleza.ns.porkbun.com`, `maceio.ns.porkbun.com`, `salvador.ns.porkbun.com`).
Como la zona replica todo, el correo NO se interrumpe.

### Paso 5 — Firebase provisiona SSL
Tras verificar el dominio, Firebase emite el certificado (puede tardar hasta 24h). El sitio queda en HTTPS.

### Paso 6 — Verificación post-cutover
- `https://theglobal.school/` y `https://es.theglobal.school/` cargan desde Firebase (HTTPS).
- `https://www.theglobal.school/` → 301 a apex.
- **Correo:** enviar y recibir un correo de prueba a `hello@theglobal.school` (Google Workspace intacto).
- Spot-check de 5-10 redirects 301 y un par de artículos EN/ES.
- Search Console: sigue verificado (TXT preservado); **reenviar los sitemaps** `sitemap-index.xml` de cada dominio. Usar "Inspección de URL" en unas cuantas.

### Paso 7 — Estabilización
- Monitorear 72h (Search Console → Cobertura, y errores 404).
- Mantener WordPress/BanaHosting **encendido pero sin tráfico** 2-4 semanas por si hay que consultar algo.
- Luego: baja de BanaHosting y archivar `qidb/`.

---

## Rollback (si algo sale mal)
Como bajamos el TTL a 300s, revertir es rápido: volver a poner el A de apex/`es` a `107.6.172.84`
(o revertir NS a BanaHosting). El sitio viejo sigue intacto en BanaHosting durante toda la transición.
