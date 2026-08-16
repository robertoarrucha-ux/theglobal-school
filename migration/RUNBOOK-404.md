# Runbook: 404 → redirects

Cada tanto (ej. mensual), revisar los 404 que Google encontró y redirigirlos.

## 1. Exportar los 404 de Search Console
1. Entra a [Search Console](https://search.google.com/search-console) y elige la propiedad (`es.theglobal.school` y/o `theglobal.school`).
2. Menú izquierdo: **Indexación → Páginas**.
3. En "Por qué no se indexan las páginas", abre **"No encontrada (404)"**.
4. Botón **Exportar** (arriba a la derecha) → CSV. Repite por propiedad si son dominios separados.

> La columna que importa es la URL. Si el CSV trae `clicks,impressions`, mejor (prioriza por tráfico).

## 2. Cruzar contra lo que ya está cubierto
Desde la raíz del repo:
```bash
npm run build                          # deja dist-en / dist-es al día
node migration/check_404.mjs ~/Downloads/tu-export.csv
```
Imprime cuántas ya están redirigidas / existen, y lista **solo las que siguen en 404**, ya con el formato `("/ruta/", "/"),` listo para pegar.

## 3. Agregar los redirects (nunca editar firebase.json a mano)
Pega las líneas nuevas en `GAP_REDIRECTS` (`"en"` o `"es"`) dentro de `migration/gen_firebase.py`.
Ajusta el destino cuando haya uno mejor que la home (una página real, una expedición, awards, etc.).
Luego regenera y despliega:
```bash
python3 migration/gen_firebase.py     # regenera firebase.json
git add -A && git commit -m "chore: redirects 404 nuevos de Search Console" && git push origin main
```
El push dispara el deploy por GitHub Actions.

## Notas
- Proyecto Firebase: siempre `gen-lang-client-0345505794`.
- Usa wildcard (`("/seccion/**", "/")`) para secciones muertas completas (ej. `/tag/**`, `/becarios/**`).
- No hagas un catch-all "todo 404 → home": genera soft-404 y esconde errores. Redirige URLs concretas.
- Atajo: si prefieres, pásame el CSV en el chat y hago los pasos 2 y 3.
