---
tipo: referencia
estado: formalizado
responsable: equipo
pc: pc1
actualizado: 09/09/26
---
# Alcance y fuera de alcance

tags:: #tipo/referencia #estado/formalizado #pc/pc1

## Módulos incluidos (web y mobile)
- **Clientes** — ficha, preferencias, historial y segmentación (familia, amigos, individual).
- **Viajes** — ficha del viaje, categorías (ej. salida grupal) y estados.
- **Economía y pagos** — venta, costo neto, comisión automática, cuotas, checklist y % pagado.
- **Alertas y recordatorios** — pagos, formularios por destino, insistencia y reseñas post-viaje.
- **Cotizaciones** — plantilla + formulario que genera el documento; cotizador asistido.
- **Catálogo de hoteles** — hoteles vendidos con reseñas para consultar y recomendar.
- **Redes sociales** — calendario de contenido, generador de propuestas y tablero kanban.
- **Dashboard y reportes** — estadísticas generales y reportes mensuales.
- **Calendario de viajes** — vista de agenda con salidas y fechas clave.

## Fuera de alcance (esta etapa)
- ❌ No procesa pagos online (registra, no cobra).
- ❌ No reemplaza el asesoramiento del agente (lo asiste).
- ❌ No publica en redes por sí solo (propone y organiza).
- ❌ No integra con mayoristas / GDS.
- ❌ **Cotizador automático por scraping** de páginas de proveedores y **detección de ofertas por scraping** — descartado para PC1 por complejidad técnica y legal (decisión Francisco, 11/09). El cotizador queda **asistido** (plantilla + formulario → documento, [[CU-06 Emitir cotización]]).

## Incluido (aclaraciones 11/09)
- ✅ **CRM proactivo:** el sistema detecta **clientes fieles inactivos** (varios viajes, sin actividad hace X) y sugiere **recontactarlos**, con opt-out para no ser invasivo. Ver [[CU-30 Sugerir recontacto de clientes]].
- ✅ **Vencimiento de pago a proveedor por hotel:** cada [[Hotel]] del itinerario puede tener su fecha de vencimiento de pago a proveedor, con [[Alerta]] un mes antes ([[CU-09 Armar itinerario de hoteles]], [[DEC-0003 Relación Viaje–Hotel y Reseña]]).

## A definir (posible fase 2)
- Módulo de facturación (inclusión y alcance por definir).
- Cotizador automático por scraping y detección de ofertas — reevaluable en fase 2 según viabilidad técnica/legal.
- Integraciones externas (publicación en redes, proveedores).
