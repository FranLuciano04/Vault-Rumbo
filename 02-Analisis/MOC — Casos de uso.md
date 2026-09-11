---
tipo: modulo
estado: en-revision
responsable: equipo
pc: pc1
actualizado: 10/09/26
---
# MOC — Casos de uso

tags:: #tipo/modulo #estado/en-revision #pc/pc1

> Índice y catálogo completo de casos de uso. Punto de entrada de bajo costo de contexto: desde acá se baja al CU puntual. Diagrama en [[DGM — Casos de uso]]. Flujo de especificación y entregables en [[Especificación de casos de uso — flujo]].

## Flujo núcleo
- [[CU-01 De la consulta a la venta]] — flujo end-to-end del negocio; los CU atómicos de abajo lo componen.

## Catálogo por módulo

### Clientes — *Paloma*
- [[CU-02 Registrar cliente]] — alta de un Cliente con contacto y segmento.
- [[CU-03 Gestionar ficha del cliente]] — editar datos, preferencias, segmento e historial.

### Oportunidades y cotización — *Francisco*
- [[CU-04 Registrar consulta]] — registrar consulta entrante creando una Oportunidad.
- [[CU-05 Seguir oportunidad]] — seguimiento, insistencia y cierre ganada/perdida.
- [[CU-06 Emitir cotización]] — generar Cotización desde plantilla (incluye versionar/reenviar).

### Viajes — *Francisco*
- [[CU-07 Confirmar reserva]] — confirmar la venta creando el Viaje.
- [[CU-08 Gestionar estado del viaje]] — armado → confirmado → en curso → finalizado.
- [[CU-09 Armar itinerario de hoteles]] — asociar Hoteles al Viaje con sus tramos.

### Economía y pagos — *Nahuel*
- [[CU-10 Registrar economía del viaje]] — venta y costo neto; comisión automática.
- [[CU-11 Definir plan de cuotas]] — Pagos con montos y vencimientos.
- [[CU-12 Registrar cobro de un pago]] — marcar Pago cobrado.
- [[CU-13 Configurar porcentaje de comisión]] — %comisión de la empresa (admin).

### Alertas — *Nahuel*
- [[CU-14 Ver y atender alertas del día]] — agenda de Alertas vigentes.
- [[CU-15 Configurar recordatorios por destino]] — formularios/recordatorios por destino.
- [[CU-26 Gestionar destinos]] — ABM del catálogo de destinos (base de CU-15; actor admin/dueño). ⚠️ agregado 10/09, requiere [[DEC-0006 Destino como entidad de catálogo]]; ratificar módulo en sync.

### Catálogo de hoteles — *Paloma*
- [[CU-16 Gestionar hotel en catálogo]] — alta/edición de Hotel.
- [[CU-17 Registrar reseña de hotel]] — Reseña post-viaje del Cliente.
- [[CU-18 Buscar y recomendar hoteles]] — consultar catálogo por destino/categoría.

### Redes — *Paloma*
- [[CU-19 Planificar contenido en redes]] — kanban de ContenidoRed.
- [[CU-20 Generar propuesta de contenido con IA]] — borradores asistidos (sin publicación automática).

### Dashboard — *Francisco*
- [[CU-21 Ver dashboard y embudo]] — embudo de ventas e indicadores en vivo.
- [[CU-22 Generar reportes y estadísticas]] — reportes del período.

### Calendario — *Paloma*
- [[CU-23 Ver calendario de viajes y vencimientos]] — Viajes y vencimientos en calendario.

### Usuarios y seguridad — *Nahuel*
- [[CU-24 Iniciar sesión]] — autenticación y contexto por rol.
- [[CU-25 Gestionar usuarios y roles]] — alta/baja y asignación de roles (admin).

## División de la especificación (PC1)
| Responsable | Casos de uso | Total |
|---|---|---|
| **Francisco** | CU-01, CU-04→09, CU-21, CU-22 | 8 (+núcleo) |
| **Paloma** | CU-02, CU-03, CU-16→20, CU-23 | 8 |
| **Nahuel** | CU-10→15, CU-24, CU-25, CU-26 | 9 |

## Reglas de negocio
- [[RN-01 Comisión automática]] → [[DEC-0004 Comisión configurable por porcentaje]]

## Estado (Dataview — requiere plugin)
```dataview
TABLE estado, responsable, actualizado
FROM "02-Analisis/Casos de uso"
SORT file.name ASC
```

## Pendiente para PC1
```dataview
LIST FROM #tipo/caso-uso AND #estado/borrador
```
