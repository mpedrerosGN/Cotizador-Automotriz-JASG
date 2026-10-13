# Visor integrado de la biblioteca

Solicitud: navegar por las carpetas y leer PDFs sin abrir otra pestaña.

## Implementación

- Navegación propia sobre un índice parcial de 110 carpetas, consultadas sin autenticación el 13/10/2026. Contiene 241 referencias PDF. Solo se incluyen metadatos; los documentos permanecen en Drive.
- Botón «Ver PDFs disponibles», filtro por nombre, ruta de carpetas y regreso desde el documento.
- Los documentos usan `https://drive.google.com/file/d/ID/preview` dentro del iframe. Vista ampliada reversible con botón o Escape.
- Las carpetas no indexadas mantienen el listado externo integrado, claramente identificado; sus enlaces pueden abrir otra pestaña. No hay sincronización en vivo ni bypass de permisos.
- El enlace del PDF seleccionado acompaña la consulta preparada para ChatGPT.
- Seguridad: enlaces Drive validados, identificadores restringidos, títulos tratados como texto. No hay descargas masivas, claves nuevas, cambios en Drive ni modificaciones en la impresión del cotizador.

## Evidencia TDD

Recorridos derivados del pedido del usuario; no hubo archivo de plan.

Runner existente: módulos ESM exportados ejecutados mediante Node REPL con Playwright y Chrome instalado. No se usa npm test.

1. RED: `verifyLibraryViewer(...)` falló con `Folders need native navigation, not a Google folder iframe: false !== true`. Checkpoint `bc9d05a`.
2. RED adicional: el mismo runner falló esperando `#browse-pdfs`. Checkpoint `19e3e77`.
3. GREEN: `verifyLibraryViewer({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })` pasó navegación anidada, ruta, filtro, PDF en iframe, ausencia de pestañas nuevas, ampliar/Escape, regreso y descarga del iframe, resultados vacíos, Kia, catálogo PDF, fuente en consulta del asistente, fallback con resourcekey y diseño móvil.
4. Regresión: `verifyTechnicalLibrary(...)` pasó favoritos, referencias persistentes, validación de URL, texto no interpretado como HTML, clipboard, invalidación de consultas y borrado local.
5. Cobertura V8 de `biblioteca-navegacion.js`: 100% de funciones y 98% de bytes ejecutables cubiertos en el recorrido. No equivale a cobertura global del sitio ni a cobertura de ramas de Istanbul.

## Límites de verificación

Las pruebas automatizadas simulan Google y autenticación, sin sesiones reales. La consulta HTTP real del preview de Mazda 3 2004 respondió 200 con título `Mazda 3 2004.pdf - Google Drive`, sin mensaje de solicitud de acceso. El navegador automatizado no pudo conectar al iframe externo en este entorno; no se afirma verificación visual del renderizador de Google ni de Safari/iPhone. Se revisó visualmente el listado propio. La disponibilidad final depende de Google, permisos y navegador.

El índice es intencionalmente parcial (110 consultas acotadas). Para incorporar más contenido se debe actualizar el snapshot de metadatos o añadir enlaces de archivos con el formulario existente. No se ofrece búsqueda en el contenido interno de PDFs.
