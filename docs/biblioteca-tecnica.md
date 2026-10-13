# Biblioteca Técnica JASG — primera versión

Entrada: `biblioteca-tecnica.html`, desde el menú del cotizador. Estilos y lógica
en `biblioteca-tecnica.css` y `biblioteca-tecnica.js`.

## Probar

1. Buscar «Kia» o «diesel»; combinar con una categoría.
2. Marcar una referencia como favorita, recargar y activar «Solo favoritos».
3. Pulsar «Consultar» para cargar la carpeta en el visor o abrirla en Drive.
4. Guardar un enlace de archivo de Drive con título y datos del vehículo.
5. Completar una consulta, copiarla y pegarla manualmente en ChatGPT.

Los 23 accesos iniciales provienen de los títulos y enlaces visibles en la carpeta
compartida del usuario el 13 de octubre de 2026. Son accesos a carpetas, no documentos
ya leídos o indexados. La búsqueda local trabaja sobre los metadatos de las referencias.
El visor muestra contenido servido por Google y ofrece abrir el original cuando la
sesión, los permisos o el formato impiden mostrarlo dentro de la página.

Las referencias nuevas y favoritos se guardan en `jasg_technical_library_v1` de
localStorage; no se sincronizan entre dispositivos. Quitar una referencia nunca
elimina el archivo de Drive. Los datos del formulario de consultas no se guardan.

## Alcance del asistente

Esta versión prepara una consulta, pero no ejecuta un modelo, no conecta una
suscripción, no envía mensajes y no lee automáticamente los documentos. El usuario
copia el texto y lo pega en ChatGPT. El acceso a los archivos se deberá autorizar
allí o se deberán adjuntar los PDF relevantes si el enlace no se puede consultar.
Una futura conversación integrada necesita resolver autenticación, elegibilidad,
acceso documental y almacenamiento de credenciales fuera del HTML público.

## Validación

Con Node.js y Playwright disponibles:

```powershell
node --input-type=module -e "import('./tests/technical-library.mjs').then(async ({ verifyTechnicalLibrary }) => console.log(await verifyTechnicalLibrary({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })))"
```

Pruebas realizadas: accesos iniciales, filtros, búsqueda sin tildes, persistencia,
rechazo de dominios falsos, texto tratado como texto (no HTML), URL de visor para
archivos/carpetas con resource keys, preparación y copia de consultas, invalidación
de consultas editadas, eliminación local, diseño móvil de 390 px y ausencia de
errores JavaScript. Se inspeccionaron capturas de escritorio y móvil.

La suite usa un perfil aislado y reemplaza autenticación y visor externos por
respuestas de prueba; no modifica cuentas ni archivos reales. Por separado se
comprobó que el visor insertable de la carpeta responde HTTP 200 y muestra sus
enlaces. No se han verificado individualmente todos los archivos de las subcarpetas.
