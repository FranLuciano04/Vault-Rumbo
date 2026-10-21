---
tipo: analisis
estado: formalizado
responsable: Francisco
pc: pc2
actualizado: 21/10/26
fecha_aprobacion: 21/10/26
---
# Matriz de trazabilidad

tags:: #tipo/analisis #estado/formalizado #pc/pc2

La matriz de trazabilidad vincula los objetivos del sistema con los casos de uso que los realizan, y cada caso de uso con las entidades que utiliza y las reglas de negocio que aplica. El vínculo entre casos de uso y requisitos funcionales se presenta en la matriz de [[Requisitos funcionales]], y no se repite aquí.

## Criterios
- **Objetivo → caso de uso:** cada caso de uso se asigna a los [[Objetivos del sistema]] que contribuye a cumplir.
- **Caso de uso → entidades:** las entidades de un caso de uso son las que intervienen en los requisitos funcionales que ese caso de uso realiza. No se consideran los requisitos transversales de control de acceso, auditoría y baja lógica (RF-151, RF-152 y RF-153), que alcanzan a casi todas las entidades.
- **Caso de uso → reglas:** surge del apartado «Aplica en» de cada regla de negocio.

## 1. Objetivos y casos de uso
| Objetivo | Casos de uso que lo realizan |
|---|---|
| **O1. Digitalizar y centralizar** | [[CU-02 Registrar cliente\|CU-02]], [[CU-03 Gestionar ficha del cliente\|CU-03]], [[CU-07 Confirmar reserva\|CU-07]], [[CU-08 Gestionar estado del viaje\|CU-08]], [[CU-09 Armar itinerario de hoteles\|CU-09]], [[CU-16 Gestionar hotel en catálogo\|CU-16]], [[CU-26 Gestionar destinos\|CU-26]], [[CU-31 Gestionar operadores\|CU-31]] |
| **O2. Fidelizar clientes** | [[CU-02 Registrar cliente\|CU-02]], [[CU-03 Gestionar ficha del cliente\|CU-03]], [[CU-08 Gestionar estado del viaje\|CU-08]] (reseña post-viaje), [[CU-17 Registrar reseña de hotel\|CU-17]], [[CU-18 Buscar y recomendar hoteles\|CU-18]], [[CU-29 Eliminar reseña\|CU-29]], [[CU-30 Sugerir recontacto de clientes\|CU-30]], [[CU-19 Planificar contenido en redes\|CU-19]] y [[CU-20 Generar propuesta de contenido con IA\|CU-20]] (contenido en redes) |
| **O3. Ordenar el circuito de venta** | [[CU-01 De la consulta a la venta\|CU-01]], [[CU-04 Registrar consulta\|CU-04]], [[CU-05 Seguir oportunidad\|CU-05]], [[CU-06 Emitir cotización\|CU-06]], [[CU-07 Confirmar reserva\|CU-07]] |
| **O4. Controlar la economía** | [[CU-10 Registrar economía del viaje\|CU-10]], [[CU-11 Definir plan de cuotas\|CU-11]], [[CU-12 Registrar cobro de un pago\|CU-12]], [[CU-13 Configurar porcentaje de comisión\|CU-13]], [[CU-27 Cancelar viaje\|CU-27]], [[CU-31 Gestionar operadores\|CU-31]] |
| **O5. No perder vencimientos ni tareas** | [[CU-09 Armar itinerario de hoteles\|CU-09]] (pago a proveedor), [[CU-11 Definir plan de cuotas\|CU-11]] (vencimientos), [[CU-14 Ver y atender alertas del día\|CU-14]], [[CU-15 Configurar recordatorios por destino\|CU-15]], [[CU-23 Ver calendario de viajes y vencimientos\|CU-23]], [[CU-28 Crear recordatorio manual\|CU-28]] |
| **O6. Decidir con datos** | [[CU-21 Ver dashboard y embudo\|CU-21]], [[CU-22 Generar reportes y estadísticas\|CU-22]], [[CU-23 Ver calendario de viajes y vencimientos\|CU-23]] |
| **Soporte transversal** | [[CU-24 Iniciar sesión\|CU-24]] y [[CU-25 Gestionar usuarios y roles\|CU-25]]: dan acceso individual y por rol a todos los demás casos de uso |

Los 31 casos de uso realizan al menos un objetivo o forman parte del soporte transversal.

## 2. Casos de uso, entidades y reglas
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

La regla [[RN-10 Visibilidad por propiedad y rol]] es transversal: se aplica en todos los casos de uso.

## 3. Reglas de negocio y requisitos de origen
| Regla | Requisitos de origen |
|---|---|
| [[RN-01 Comisión automática]] | RF-054 a RF-057 |
| [[RN-02 Plan de pagos igual al precio de venta]] | RF-059, RF-061, RF-066, RF-072 |
| [[RN-03 Pago indivisible]] | RF-068, RF-072 |
| [[RN-04 Baja lógica]] | RF-153 y los requisitos de baja de cada módulo |
| [[RN-05 Ciclo de vida del viaje]] | RF-038, RF-039, RF-042, RF-049, RF-070 |
| [[RN-06 Efectos de la cancelación del viaje]] | RF-048 a RF-053 |
| [[RN-07 Vigencia de la cotización]] | RF-022, RF-026 |
| [[RN-08 Alertas automáticas y su anticipación]] | RF-027, RF-028, RF-034, RF-035, RF-039, RF-041, RF-045, RF-063 |
| [[RN-09 Protección del último administrador]] | RF-149 |
| [[RN-10 Visibilidad por propiedad y rol]] | RF-150, RF-151 |

## Lectura de la matriz
- Las entidades con mayor participación son [[Viaje]] (21 casos de uso), [[Alerta]] (14) y [[Usuario]] (14). El Viaje es el núcleo operativo del sistema, y la Alerta es el mecanismo que evita olvidos de vencimientos y tareas (O5).
- Las 13 entidades del dominio intervienen en al menos un caso de uso.
- Los casos de uso sin reglas propias son, en su mayoría, consultas (dashboard, reportes, calendario y búsqueda de hoteles) o altas simples.

## 🔎 Revisión
> ✅ **Aprobado y formalizado en la sync del 21/10/26.** Redactado el 21/10/26 (Francisco, recomendado C2 del PC1). El tramo CU → entidad se calculó con un script que cruza los 155 RF (los RF de cada CU y las entidades que nombra cada RF); CU-01 toma las entidades de sus RF de flujo integrador.

> [!success] **Decidido en la sync del 21/10/26:**
> - Los CU de redes (CU-19 y CU-20) se asocian a **O2. Fidelizar clientes**, sin sumar un objetivo nuevo. [[Objetivos del sistema]] no cambia.
> - CU-24 y CU-25 van en una fila de **soporte transversal**, igual que RF-151 y RF-152 en la matriz de requisitos.
