---
tipo: caso-uso
estado: formalizado
modulo: [hoteles]
responsable: Paloma
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-18 Buscar y recomendar hoteles

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
El empleado consulta el catálogo de [[Hotel|Hoteles]] filtrando por destino, categoría, rango de precio y servicios, y usa las [[Reseña|Reseñas]] para recomendar opciones al [[Cliente]] al cotizar o armar el itinerario. Es una consulta de **solo lectura** sobre el catálogo.

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: destinatario de la recomendación; no opera el sistema).

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Hay [[Hotel|Hoteles]] cargados en el catálogo ([[CU-16 Gestionar hotel en catálogo]]).

## Flujo principal
1. El empleado abre el **catálogo de hoteles** y filtra por **destino**, **categoría**, **rango de precio** y **servicios**.
2. El sistema lista los [[Hotel|Hoteles]] que coinciden, mostrando su **puntaje promedio** (cálculo derivado de las [[Reseña|Reseñas]], no un atributo del `Hotel`).
3. El empleado abre un `Hotel` para ver su detalle y sus reseñas.
4. El empleado usa el resultado para recomendar al `Cliente`, típicamente al [[CU-06 Emitir cotización|cotizar]] o [[CU-09 Armar itinerario de hoteles|armar el itinerario]].

## Flujos alternativos
- **A1 — Sin resultados:** ningún `Hotel` coincide con los filtros → el sistema ofrece ampliar los filtros o dar de alta un hotel ([[CU-16 Gestionar hotel en catálogo]]).
- **A2 — Orden por valoración:** el empleado ordena la lista por **puntaje promedio** para priorizar los mejor valorados.

## Postcondiciones
- El empleado obtiene una lista filtrada de `Hoteles` con su valoración, **sin modificar** el catálogo (consulta de solo lectura).

## Reglas de negocio aplicadas
- (Ninguna regla económica en este CU.)
- El **puntaje promedio** se calcula a partir de las [[Reseña|Reseñas]] del `Hotel`; no se almacena como atributo.

## Entidades del dominio involucradas
- [[Hotel]] · [[Reseña]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad de la búsqueda.

## Decisiones asociadas
- [[DEC-0003 Relación Viaje–Hotel y Reseña]] (la valoración deriva de las reseñas del `Hotel`).

## 🔎 Revisión
> [!note] Paloma (10/09): (5) **Confirmado:** además de destino y categoría, se filtra por **rango de precio** y **servicios**. **Toca dominio:** hay que agregar `precio` (o rango) y `servicios`/amenities a la entidad [[Hotel]] y reflejarlo en [[DGM-ER]]. La recomendación es por filtros + puntaje de reseñas (no IA); la propuesta con IA es otro CU ([[CU-20 Generar propuesta de contenido con IA]]).
