---
tipo: referencia
estado: formalizado
responsable: Codex
modulo: M9
actualizado: 10/11/26
---
# M9 — review Codex

## Resumen
Se revisaron los diffs de los ocho merges indicados y sus versiones históricas, contrastando implementación, contrato y tests con la especificación enlazada.
Se encontró una omisión de publicaciones en el calendario cuando el mes supera las 100 piezas; no se identificaron otros problemas verificables en el alcance solicitado.
La revisión fue estática: no se ejecutaron las suites de tests ni los e2e.

## Hallazgos

### H-01 · El calendario omite las publicaciones posteriores a la primera página
- **Severidad:** bloqueante
- **Ubicación:** `src/apps/web/src/features/redes/CalendarioContenido.tsx:36` (merge `a89d9c4`)
- **Ticket relacionado:** T-132
- **Trazabilidad:** CU-19 (postcondición), RF-116
- **Problema:** el calendario usa `useContenidos` con `por_pagina: 100`, sin solicitar páginas adicionales. Ese hook realiza una sola consulta y el backend devuelve la página 1 por defecto, con un máximo de 100 elementos. El componente dibuja únicamente `data.items` (línea 99), sin consultar `total` ni ofrecer una forma de cargar el resto. Por eso muestra una planificación incompleta sin advertirlo. Los tests de calendario del merge no cubren un mes con más de una página.
- **Escenario:** existen 100 piezas no descartadas con fecha entre el 1 y el 29 de noviembre de 2026 y otra pieza para el 30, todas del mismo canal. Al abrir noviembre, incluso filtrando por ese canal, la API responde con las primeras 100 y `total: 101`. El día 30 aparece sin publicaciones y la pieza restante nunca se solicita, aunque sigue registrada y puede verse en el tablero.
- **Arreglo sugerido:** recuperar y acumular todas las páginas del mes y canal seleccionados antes de considerar completo el calendario, manteniendo visibles los estados de carga y error de las páginas restantes. Agregar una prueba con 101 piezas que compruebe la petición de la segunda página y la presencia de la última publicación; subir el límite fijo no resuelve el problema.

## Triage de Claude

### H-01 · confirmado
- **Verificación (10/11/26):** `CalendarioContenido.tsx:35-40` usa `useContenidos` con `por_pagina: 100`, que es una sola consulta (`hooks/redes.ts:19`), y dibuja solo `data.items` (línea 99) sin mirar `total`. El backend limita la página a `POR_PAGINA_MAXIMO` (`presentacion/paginacion.py:28`). Con más de 100 piezas en el mes y el canal elegidos, las que siguen no se piden y el calendario no avisa.
- **Severidad:** la bajo a **importante**. Necesita más de 100 piezas en un mismo mes, algo poco probable en una agencia PyME. Igual muestra una planificación incompleta sin avisar, así que se arregla.
- **Alcance** (cada punto lleva un test en la web):
  1. Con 101 piezas en el mes, el calendario pide la página 2 y muestra la pieza del día 30.
  2. El calendario pide páginas mientras `pagina × por_pagina < total`, y deja de pedir cuando se cubre el total.
  3. Mientras faltan páginas por cargar, se ve un estado de carga.
  4. Si falla una página, se ve un error (`role="alert"`) en lugar del calendario presentado como completo.
  5. Al cambiar de mes o de canal, las páginas vuelven a pedirse desde la 1.
- **Arreglo:** rama `fix/M9-H01-calendario-paginas`, capa web, riesgo normal (no toca auth, permisos, dinero ni estados). PR: pendiente.
