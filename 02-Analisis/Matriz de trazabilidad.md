---
tipo: analisis
estado: borrador
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# Matriz de trazabilidad

tags:: #tipo/analisis #estado/borrador #pc/pc2

> Borrador del 21/10/26 (C2). Completa la cadena **objetivo → caso de uso → requisito → entidad y regla**. El tramo CU → RF ya estaba formalizado y **no se copia**: vive en la *Matriz de trazabilidad* de [[Requisitos funcionales]]. Falta la aprobación del equipo.

## Cómo se armó
- **Objetivo → CU:** se asignó cada CU a los [[Objetivos del sistema]] que realiza, según lo que resuelve en el negocio. Hay dos asignaciones a decidir, marcadas abajo.
- **CU → entidad:** se calculó cruzando los 155 RF: las entidades de un CU son las que nombran los RF que realiza. RF-151, RF-152 y RF-153 son transversales y no se cuentan, porque tocarían casi todas las entidades. CU-01 toma las entidades de sus RF de flujo integrador.
- **CU → regla:** sale de la sección *Aplica en* de cada regla de `02-Analisis/Reglas de negocio/`.

## 1. Objetivo → casos de uso
| Objetivo | Casos de uso que lo realizan |
|---|---|
| **O1. Digitalizar y centralizar** | [[CU-02 Registrar cliente\|CU-02]], [[CU-03 Gestionar ficha del cliente\|CU-03]], [[CU-07 Confirmar reserva\|CU-07]], [[CU-08 Gestionar estado del viaje\|CU-08]], [[CU-09 Armar itinerario de hoteles\|CU-09]], [[CU-16 Gestionar hotel en catálogo\|CU-16]], [[CU-26 Gestionar destinos\|CU-26]], [[CU-31 Gestionar operadores\|CU-31]] |
| **O2. Fidelizar clientes** | [[CU-02 Registrar cliente\|CU-02]], [[CU-03 Gestionar ficha del cliente\|CU-03]], [[CU-08 Gestionar estado del viaje\|CU-08]] (reseña post-viaje), [[CU-17 Registrar reseña de hotel\|CU-17]], [[CU-18 Buscar y recomendar hoteles\|CU-18]], [[CU-29 Eliminar reseña\|CU-29]], [[CU-30 Sugerir recontacto de clientes\|CU-30]] |
| **O3. Ordenar el circuito de venta** | [[CU-01 De la consulta a la venta\|CU-01]], [[CU-04 Registrar consulta\|CU-04]], [[CU-05 Seguir oportunidad\|CU-05]], [[CU-06 Emitir cotización\|CU-06]], [[CU-07 Confirmar reserva\|CU-07]] |
| **O4. Controlar la economía** | [[CU-10 Registrar economía del viaje\|CU-10]], [[CU-11 Definir plan de cuotas\|CU-11]], [[CU-12 Registrar cobro de un pago\|CU-12]], [[CU-13 Configurar porcentaje de comisión\|CU-13]], [[CU-27 Cancelar viaje\|CU-27]], [[CU-31 Gestionar operadores\|CU-31]] |
| **O5. No perder vencimientos ni tareas** | [[CU-09 Armar itinerario de hoteles\|CU-09]] (pago a proveedor), [[CU-11 Definir plan de cuotas\|CU-11]] (vencimientos), [[CU-14 Ver y atender alertas del día\|CU-14]], [[CU-15 Configurar recordatorios por destino\|CU-15]], [[CU-23 Ver calendario de viajes y vencimientos\|CU-23]], [[CU-28 Crear recordatorio manual\|CU-28]] |
| **O6. Decidir con datos** | [[CU-21 Ver dashboard y embudo\|CU-21]], [[CU-22 Generar reportes y estadísticas\|CU-22]], [[CU-23 Ver calendario de viajes y vencimientos\|CU-23]] |

### A decidir #accion/decidir
- **Redes ([[CU-19 Planificar contenido en redes|CU-19]] y [[CU-20 Generar propuesta de contenido con IA|CU-20]]):** ningún objetivo de [[Objetivos del sistema]] habla de redes. Propuesta: asociarlos a **O2. Fidelizar clientes** o sumar un séptimo objetivo de comunicación. Cualquiera de las dos cambia una nota formalizada.
- **Seguridad ([[CU-24 Iniciar sesión|CU-24]] y [[CU-25 Gestionar usuarios y roles|CU-25]]):** son soporte de todos los objetivos y no realizan uno en particular. Propuesta: dejarlos como **transversales**, igual que RF-151 y RF-152.

Con esas dos decisiones, los 31 CU quedan cubiertos: cada uno realiza al menos un objetivo.

## 2. Caso de uso → entidades y reglas
| Caso de uso | Entidades | Reglas |
|---|---|---|
| [[CU-01 De la consulta a la venta\|CU-01]] | Cliente · Usuario · Oportunidad · Cotización · Viaje · Destino · Alerta · RequisitoDestino · Operador · Pago · Reseña · Hotel | RN-01, RN-02, RN-05 |
| [[CU-02 Registrar cliente\|CU-02]] | Cliente · Usuario · Oportunidad | — |
| [[CU-03 Gestionar ficha del cliente\|CU-03]] | Cliente · Oportunidad · Viaje · Reseña · Usuario | — |
| [[CU-04 Registrar consulta\|CU-04]] | Cliente · Oportunidad · Usuario | — |
| [[CU-05 Seguir oportunidad\|CU-05]] | Oportunidad · Cliente · Cotización · Alerta | — |
| [[CU-06 Emitir cotización\|CU-06]] | Cotización · Oportunidad · Viaje | RN-07 |
| [[CU-07 Confirmar reserva\|CU-07]] | Viaje · Oportunidad · Cliente · Destino · Usuario · Alerta · RequisitoDestino · Pago | RN-08 |
| [[CU-08 Gestionar estado del viaje\|CU-08]] | Viaje · Pago · Hotel · Alerta · Reseña | RN-05, RN-08 |
| [[CU-09 Armar itinerario de hoteles\|CU-09]] | Viaje · Hotel · Alerta | RN-08 |
| [[CU-10 Registrar economía del viaje\|CU-10]] | Viaje · Operador · Usuario · Pago | RN-01, RN-02 |
| [[CU-11 Definir plan de cuotas\|CU-11]] | Viaje · Pago · Alerta | RN-02, RN-03, RN-04, RN-08 |
| [[CU-12 Registrar cobro de un pago\|CU-12]] | Viaje · Pago · Alerta | RN-02, RN-03, RN-05 |
| [[CU-13 Configurar porcentaje de comisión\|CU-13]] | Usuario · Viaje | RN-01 |
| [[CU-14 Ver y atender alertas del día\|CU-14]] | Alerta · Usuario · Viaje · Pago · Oportunidad | RN-08 |
| [[CU-15 Configurar recordatorios por destino\|CU-15]] | Alerta · RequisitoDestino · Viaje · Destino | RN-08 |
| [[CU-16 Gestionar hotel en catálogo\|CU-16]] | Hotel · Destino | RN-04 |
| [[CU-17 Registrar reseña de hotel\|CU-17]] | Reseña · Cliente · Hotel · Viaje | — |
| [[CU-18 Buscar y recomendar hoteles\|CU-18]] | Hotel · Reseña | — |
| [[CU-19 Planificar contenido en redes\|CU-19]] | ContenidoRed | RN-04 |
| [[CU-20 Generar propuesta de contenido con IA\|CU-20]] | ContenidoRed | — |
| [[CU-21 Ver dashboard y embudo\|CU-21]] | Oportunidad · Viaje · Pago · Operador · Alerta · Destino · Cliente · Usuario | — |
| [[CU-22 Generar reportes y estadísticas\|CU-22]] | Viaje · Pago · Oportunidad · Cliente · Destino · Operador · Usuario | — |
| [[CU-23 Ver calendario de viajes y vencimientos\|CU-23]] | Viaje · Pago · Alerta | — |
| [[CU-24 Iniciar sesión\|CU-24]] | Usuario | RN-10 |
| [[CU-25 Gestionar usuarios y roles\|CU-25]] | Usuario · ContenidoRed · Cliente | RN-04, RN-09, RN-10 |
| [[CU-26 Gestionar destinos\|CU-26]] | Destino · Viaje · Hotel · RequisitoDestino | RN-04 |
| [[CU-27 Cancelar viaje\|CU-27]] | Viaje · Cliente · Pago · Alerta · Usuario | RN-04, RN-05, RN-06 |
| [[CU-28 Crear recordatorio manual\|CU-28]] | Alerta · Usuario · Viaje · Cliente · Oportunidad | — |
| [[CU-29 Eliminar reseña\|CU-29]] | Reseña · Hotel | RN-04 |
| [[CU-30 Sugerir recontacto de clientes\|CU-30]] | Cliente · Viaje · Alerta · Oportunidad | RN-08 |
| [[CU-31 Gestionar operadores\|CU-31]] | Operador · Viaje | RN-04 |

**Transversal:** [[RN-10 Visibilidad por propiedad y rol]] rige en todos los CU, igual que RF-151 y RF-152.

## 3. Reglas de negocio
| Regla | Requisitos de origen |
|---|---|
| [[RN-01 Comisión automática]] | RF-054 a RF-057 |
| [[RN-02 Plan de pagos igual al precio de venta]] | RF-059, RF-061, RF-066, RF-072 |
| [[RN-03 Pago indivisible]] | RF-068, RF-072 |
| [[RN-04 Baja lógica]] | RF-153 y las bajas de cada módulo |
| [[RN-05 Ciclo de vida del viaje]] | RF-038, RF-039, RF-042, RF-049, RF-070 |
| [[RN-06 Efectos de la cancelación del viaje]] | RF-048 a RF-053 |
| [[RN-07 Vigencia de la cotización]] | RF-022, RF-026 |
| [[RN-08 Alertas automáticas y su anticipación]] | RF-027, RF-028, RF-034, RF-035, RF-039, RF-041, RF-045, RF-063 |
| [[RN-09 Protección del último administrador]] | RF-149 |
| [[RN-10 Visibilidad por propiedad y rol]] | RF-150, RF-151 |

## Lectura de la matriz
- Las entidades más usadas son [[Viaje]] (21 CU), [[Alerta]] (14) y [[Usuario]] (14). El Viaje es el núcleo operativo y la Alerta, el mecanismo que evita olvidos (O5).
- Las 13 entidades aparecen en al menos un CU: no hay entidades huérfanas.
- Los CU sin reglas propias son sobre todo de consulta (dashboard, reportes, calendario, búsqueda de hoteles) o altas simples.
