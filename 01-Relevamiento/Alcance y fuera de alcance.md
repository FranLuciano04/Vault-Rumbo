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
- **Clientes** — ficha, preferencias, historial y segmentación (familia, amigos, individual, pareja), con etiquetas libres para acciones comerciales.
- **Oportunidades y cotización** — consultas recibidas por Instagram, WhatsApp o presencial, seguimiento del embudo y cotizaciones versionables.
- **Viajes** — ficha del viaje, categorías (ej. salida grupal), estados e itinerario de hoteles.
- **Economía y pagos** — precio de venta, costo del operador, ganancia y margen calculados por el sistema, comisión del vendedor, cuotas, checklist y % pagado, con operaciones en pesos o dólares.
- **Alertas y recordatorios** — pagos, formularios por destino, próximas salidas, insistencia, reseñas post-viaje y recordatorios manuales.
- **Catálogo de hoteles** — hoteles vendidos con reseñas para consultar y recomendar.
- **Redes sociales** — calendario de contenido, generador de propuestas y tablero kanban.
- **Dashboard y reportes** — estadísticas generales y reportes mensuales.
- **Calendario de viajes** — vista de agenda con salidas y fechas clave.
- **Configuración y catálogos** — comisión por defecto de cada vendedor, requisitos por destino, y los catálogos de destinos y de operadores.
- **Usuarios y seguridad** — acceso individual con usuario y contraseña, roles con distinta visibilidad y registro de autoría de los cambios.

## Fuera de alcance (esta etapa)
- ❌ **No procesa pagos online:** registra pagos, cuotas y vencimientos, pero no cobra ni gestiona reembolsos o penalidades.
- ❌ **No reemplaza el asesoramiento del agente:** lo asiste, no decide por él.
- ❌ **No publica en redes por sí solo:** propone y organiza el contenido; la publicación la hace una persona.
- ❌ **No integra con mayoristas ni GDS.**
- ❌ **Cotizador automático por scraping** de páginas de proveedores y **detección de ofertas por scraping** — descartado por complejidad técnica y legal. El cotizador queda **asistido**: plantilla + formulario que genera el documento, con precios cargados por el asesor ([[CU-06 Emitir cotización]]).
- ❌ **Envío automático de avisos al pasajero:** el sistema genera el aviso internamente y la persona decide cuándo escribirle por el canal que corresponda. La automatización por WhatsApp queda para más adelante y será configurable.

## Incluido explícitamente
- ✅ **CRM proactivo:** el sistema detecta **clientes fieles inactivos** (con historial de viajes y sin actividad reciente) y sugiere **recontactarlos**, con opt-out para no ser invasivo. Ver [[CU-30 Sugerir recontacto de clientes]].
- ✅ **Vencimiento de pago a proveedor por hotel:** cada [[Hotel]] del itinerario puede tener su fecha de vencimiento de pago a proveedor, con [[Alerta]] un mes antes ([[CU-09 Armar itinerario de hoteles]], [[DEC-0003 Relación Viaje–Hotel y Reseña]]).

## Fase 2 (fuera de esta etapa)
- **Módulo de facturación:** se evaluará en una segunda etapa.
- **Cotizador automático y detección de ofertas:** se reevaluarán según su viabilidad técnica y legal.
- **Integraciones externas:** publicación directa en redes y conexión con proveedores.
