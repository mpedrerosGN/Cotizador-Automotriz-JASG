# Sincronización de Macal

## Alcance

La sincronización debe cargar vehículos desde Macal cuando el `POST` del API no puede completarse desde GitHub Pages por el preflight CORS. También debe reconocer lotes con identificadores numéricos y alfanuméricos, conservar la imagen principal y consolidar resultados de las fechas publicadas.

## Evidencia TDD

| Garantía | Validación | Resultado |
|---|---|---|
| Existe un respaldo web para Macal | Comprobación estática de `loadMacalVehiclesFromPages` | RED antes del cambio; GREEN después |
| Se reconocen lotes como `V716-1` y lotes alfanuméricos | Comprobación estática del patrón `V[A-Z0-9]+-\d+` | GREEN |
| Se consolidan fechas sin duplicar vehículos | Simulación contra el catálogo HTML público de Macal | GREEN: 33 vehículos únicos |
| Las tarjetas pueden recibir imágenes | Simulación del parser sobre el HTML público | GREEN: 45 URLs de imagen encontradas |
| El archivo no contiene errores de espacios/conflictos de parche | `git diff --check` | GREEN |

## Limitaciones conocidas

El proyecto es una aplicación estática y no contiene `package.json` ni un runner JavaScript local; por eso no fue posible ejecutar una suite automatizada con cobertura. La sincronización utiliza el catálogo web oficial como respaldo porque el endpoint POST de Macal responde 404 al preflight `OPTIONS` desde GitHub Pages.
