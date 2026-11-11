---
id: T-172
titulo: Elegir el puntaje de la reseña con estrellas
modulo: M11 — Ajustes de la revisión del equipo
capa: web
estado: hecho
depende_de: []
tamaño: S
riesgo: normal
modelo_tests: sonnet
modelo_impl: sonnet
modelo_review: opus
trazabilidad: [CU-17, RF-101]
origen: revisión del equipo (10/11/26)
asignado: palomap2003
tomado_el: 11/11/26 16:33
rama: feature/T-172-elegir-el-puntaje-de-la-resena-con-estre
pr:
---
# T-172 Elegir el puntaje de la reseña con estrellas

tags:: #tipo/ticket

> No editar `estado`, `asignado`, `tomado_el` ni `rama` a mano: los maneja `06-Desarrollo/herramientas/tickets.mjs` (ver [[Flujo de implementación]]).

## Objetivo
Al registrar o editar una reseña en la web, el puntaje se elige con cinco estrellas seleccionables y no con un campo numérico. Al tocar la tercera estrella, el puntaje es 3. Lo pidió el equipo en la revisión del 10/11/26.

## Criterios de aceptación
- [ ] El campo «Puntaje» de `FormularioResena` muestra 5 estrellas. Al hacer clic en la estrella N quedan marcadas de la 1 a la N y se guarda `puntaje = N`. Al pasar el mouse, se ve una vista previa.
- [ ] Es accesible: es un grupo de radios (`role="radiogroup"`) con la etiqueta «Puntaje». Cada estrella se anuncia como «N estrellas» y se elige con las flechas del teclado.
- [ ] Al editar, aparece marcado el puntaje actual. Si no se elige ninguno, se muestra el mismo error de validación que hoy. La API sigue recibiendo un entero del 1 al 5.

## Tests esperados
`describe('RF-101 puntaje con estrellas')`: elegir con clic, elegir con teclado, la edición con el valor cargado y el error si falta el puntaje. Ajustar los tests de `RegistrarResena.test.tsx` y `DetalleHotel.test.tsx` que escriben el número en el campo.

## Contexto (leer solo esto)
- [[CU-17 Registrar reseña de hotel]], pasos 3 y 4 y A3 (puntaje entero de 1 a 5)
- `src/apps/web/src/features/hoteles/FormularioResena.tsx` (el campo `puntaje`) y `ResenaPublicada.tsx` (cómo se muestran las estrellas hoy)

## Archivos probables
- `src/apps/web/src/features/hoteles/FormularioResena.tsx`
- Un componente nuevo `SelectorEstrellas` en `src/apps/web/src/components/`

## Fuera de alcance
- El backend y el contrato: el puntaje sigue siendo un entero de 1 a 5.
- Mobile, que no registra reseñas.

## Notas de implementación
- **Factibilidad (verificada el 10/11/26):** se puede hacer solo en el front. `lucide-react` ya tiene el ícono `Star`, que usan `ResenaPublicada` y `TarjetaHotel`. No hace falta la alternativa del desplegable que propuso el equipo.
- **Implementado (11/11/26, Paloma):**
  - `components/SelectorEstrellas.tsx` (nuevo): `radiogroup` nombrado por la etiqueta visible (`aria-labelledby`), 5 radios «1 estrella»… «5 estrellas», roving tabindex, flechas según APG con giro en los extremos y vista previa con el mouse (`data-resaltada`), que se limpia al elegir. Estrellas de 24 px: falta compararlas con el prototipo.
  - `FormularioResena` usa `useController`, así que al enviar sin puntaje el foco va a la estrella y el error se anuncia. El esquema y la API no cambian (entero 1–5).
  - `CampoFormulario` le da un `id` a la etiqueta (`<id>-etiqueta`); por eso se corrió la suite web completa, 1254/1254.
  - Los tests de 0 y 6 fuera de rango se reemplazaron por «sin puntaje no se envía», porque con estrellas ya no se pueden elegir.
  - Review de Opus: 1 importante (el foco y el anuncio del error) y 4 menores, todos arreglados.
  - Modelos: tests, implementación, refactor (sin cambios) y fix con Sonnet; review con Opus. Sin escalados.
