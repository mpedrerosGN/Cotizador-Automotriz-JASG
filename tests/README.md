# Verificación de impresión de cotizaciones

`quote-print.mjs` abre un perfil de Chrome aislado, carga el HTML local y usa
datos ficticios. Bloquea los scripts de autenticación y sincronización para no
consultar ni modificar registros reales. Genera los PDF en memoria y examina sus
páginas y las posiciones del texto, además de medir las tarjetas en el navegador.

Requiere Node.js con `playwright` y `pdfjs-dist` disponibles. Desde la raíz:

```powershell
node --input-type=module -e "import('./tests/quote-print.mjs').then(async ({ verifyQuotePrint }) => console.log(await verifyQuotePrint({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })))"
```

Con red restringida se puede pasar `dependencyFiles`, un mapa de URL del CDN a
archivo local, para cargar copias de las mismas bibliotecas, fuentes e iconos.
No hay que cambiar el código ni la configuración de producción.

## Evidencia de la corrección (13 de octubre de 2026)

Antes de la corrección se reprodujeron dos páginas para una cotización de dos
trabajos. La tarjeta de totales comenzaba 24 píxeles por encima de la bancaria;
las firmas tenían posicionamiento fijo y la segunda columna recibía un relleno
adicional de las reglas de las tarjetas.

Después, la suite pasó en Chrome con Tailwind, Alpine, Inter y los iconos usados
por el sitio. También se renderizó e inspeccionó visualmente el PDF de 13 trabajos
en carta:

- Tarjetas con bordes superior/inferior y anchos iguales (tolerancia: 0,5 px).
- Firmas alineadas, una sola vez y al pie, en A4/carta con 1, 2 y 13 trabajos.
- Una sola página en esos seis casos, sin páginas vacías.
- Términos activados/desactivados repetidamente: dos/una páginas, respectivamente;
  sin firmas repetidas en la hoja de términos.
- Fotos incluidas solamente cuando se marca su checkbox.
- Cotización de 40 trabajos: dos páginas con contenido, firmas solo en la última.
- Impresión desde un ancho móvil de 390 px: una página y tarjetas alineadas.
- Restauración del título y los términos al terminar cada impresión, sin errores
  de JavaScript ni correlativo en el contenido o el nombre del PDF.

La prueba de ancho móvil usa Chrome; no sustituye una prueba en un iPhone físico.
Cotizaciones más extensas o con más fotos pueden ocupar varias páginas con contenido.
