---
tipo: modulo
estado: en-revision
responsable: equipo
pc: pc1
actualizado: 18/09/26
---
# MOC — Casos de uso

tags:: #tipo/modulo #estado/en-revision #pc/pc1

> Índice y catálogo completo de casos de uso. Punto de entrada de bajo costo de contexto: desde acá se baja al CU puntual. Diagrama en [[DGM — Casos de uso]]. Diagramas de actividad de los flujos clave en `03-Dominio/Diagramas/Actividad/`: [[DGM-ACT — De la consulta a la venta]] · [[DGM-ACT — Confirmar reserva]] · [[DGM-ACT — Registrar cobro de un pago]] · [[DGM-ACT — Cancelar viaje]] · [[DGM-ACT — Proceso automático diario]]. Diagramas de secuencia con las clases del sistema en `03-Dominio/Diagramas/Secuencia/`: [[DGM-SEC — Confirmar reserva]] · [[DGM-SEC — Registrar cobro de un pago]] · [[DGM-SEC — Cancelar viaje]] ([[DGM-SEC — De la consulta a la venta]] sigue aparte, como vista de negocio del relevamiento). Flujo de especificación y entregables en [[Especificación de casos de uso — flujo]].

> ✅ **Los 31 CU quedaron formalizados en la sync del 29/09/26** (Francisco, Nahuel y Paloma), junto con su diagrama y los diagramas de actividad y secuencia.

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
- [[CU-30 Sugerir recontacto de clientes]] — CRM proactivo: detecta clientes fieles inactivos y sugiere recontacto (con opt-out). ⚠️ nuevo 11/09, del relevamiento crudo; valida dominio con Paloma/Nahuel.

### Viajes — *Francisco*
- [[CU-07 Confirmar reserva]] — confirmar la venta creando el Viaje.
- [[CU-08 Gestionar estado del viaje]] — vendido → confirmado → en curso → finalizado.
- [[CU-09 Armar itinerario de hoteles]] — asociar Hoteles al Viaje con sus tramos.
- [[CU-27 Cancelar viaje]] — baja/cancelación del Viaje (estado `cancelado`).

### Economía y pagos — *Nahuel*
- [[CU-10 Registrar economía del viaje]] — venta, costo, moneda y comisión del vendedor; ganancia/margen automáticos.
- [[CU-11 Definir plan de cuotas]] — Pagos con montos y vencimientos (plan en la moneda del viaje).
- [[CU-12 Registrar cobro de un pago]] — marcar Pago cobrado; captura forma de pago y moneda real del cobro.

### Alertas — *Nahuel*
- [[CU-14 Ver y atender alertas del día]] — agenda de Alertas vigentes.
- [[CU-28 Crear recordatorio manual]] — alta manual de una Alerta (tipo `manual`). ⚠️ agregado 10/09, validar alcance en sync.

### Configuración / Catálogos — *Nahuel*
> Módulo definido en la entrevista grill del 18/09 (Q9): agrupa la configuración de negocio y los ABM de catálogo compartido. Actor `admin`/`dueño`.
- [[CU-13 Configurar porcentaje de comisión]] — comisión por defecto del vendedor/freelancer — ver [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]].
- [[CU-15 Configurar recordatorios por destino]] — [[RequisitoDestino|requisitos]]/formularios por destino que disparan Alertas.
- [[CU-26 Gestionar destinos]] — ABM del catálogo de destinos ([[DEC-0006 Destino como entidad de catálogo]]).
- [[CU-31 Gestionar operadores]] — ABM del catálogo de operadores/proveedores ([[DEC-0009 Operador-Proveedor como entidad de catálogo]]).

### Catálogo de hoteles — *Paloma*
- [[CU-16 Gestionar hotel en catálogo]] — alta/edición de Hotel.
- [[CU-17 Registrar reseña de hotel]] — Reseña post-viaje del Cliente.
- [[CU-18 Buscar y recomendar hoteles]] — consultar catálogo por destino/categoría.
- [[CU-29 Eliminar reseña]] — baja/moderación de una Reseña (estado `oculta`).

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

## Requisitos
Los **153 requisitos funcionales** y los **16 no funcionales** del sistema están en [[Requisitos funcionales]], con la **matriz de trazabilidad** al final: qué requisitos realiza cada uno de estos 31 CU. Si se modifica un CU, hay que revisar sus requisitos en esa matriz, y al revés.

> Para el equipo: el catálogo se **presenta** en el sentido *requisitos → casos de uso* (los CU son la realización de los requisitos), que es como corresponde leerlo en el entregable y como queda ordenado el análisis de acá en adelante. El detalle de cómo se armó está en la sección de Revisión de esa nota.

## División de la especificación (PC1)
| Responsable | Casos de uso | Total |
|---|---|---|
| **Francisco** | CU-01, CU-04→09, CU-21, CU-22, CU-27, CU-30 | 10 (+núcleo) |
| **Paloma** | CU-02, CU-03, CU-16→20, CU-23, CU-29 | 9 |
| **Nahuel** | CU-10→15, CU-24, CU-25, CU-26, CU-28, CU-31 | 11 |

## Reglas de negocio
- [[RN-01 Comisión automática]] → [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (supersede a [[DEC-0004 Comisión configurable por porcentaje]])

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
