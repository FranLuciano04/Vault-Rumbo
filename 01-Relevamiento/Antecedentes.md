---
tipo: referencia
estado: en-revision
responsable: Francisco
pc: pc1
actualizado: 30/09/26
---
# Antecedentes

tags:: #tipo/referencia #estado/en-revision #pc/pc1

Cómo resuelve hoy la agencia la gestión que Rumbo viene a ordenar, y qué ofrecen las herramientas que ya existen en el mercado. Junto con [[Objetivos del sistema]], [[Justificación del sistema]] y [[Alcance y fuera de alcance]] completa la presentación general del proyecto.

## Cómo trabaja hoy la agencia
La agencia es una PyME de turismo que gestiona clientes, reservas, cobros y redes **a mano**, con información repartida entre papel, planillas de Excel, cuadernos y chats ([[Relevamiento — Fuente de verdad]]):

- **Carpetas físicas por viaje.** Cada viaje tiene su carpeta en papel; no hay un lugar único donde ver los clientes y los viajes juntos.
- **Consultas por Instagram, WhatsApp o en persona.** La consulta llega por un canal y el seguimiento hasta la cotización y el cierre depende de la memoria de quien la atendió ([[Circuito de la consulta a la venta]]).
- **Cobros y vencimientos anotados a mano.** Las señas, las cuotas de los pasajeros y los pagos a los operadores se controlan en planillas, sin avisos automáticos.
- **Avisos a los pasajeros por WhatsApp.** Recordar un pago, un formulario migratorio (por ejemplo, el eTicket de República Dominicana), el seguro o los vouchers es una tarea manual que depende de acordarse ([[Relevamiento — respuestas de la agencia (17-09)]]).
- **Vendedores externos.** Además de los empleados, trabajan vendedores freelance, y hay que saber qué vendió cada uno y cuánto corresponde pagarle.
- **Operaciones en pesos y en dólares.** La ganancia no es un porcentaje fijo: cambia según el viaje, el operador y la negociación.
- **Clientes fieles como activo principal.** Llegan pocos clientes nuevos, así que el negocio se sostiene volviendo a venderles a los de siempre.

**Consecuencias:** se pierden ventas porque una consulta queda sin seguimiento, se olvidan cobros y vencimientos, y no queda memoria del cliente (qué viajes hizo, qué prefiere, cuándo conviene volver a contactarlo).

## Qué ofrece el mercado
Se revisaron tres grupos de herramientas. La información de los productos surge de su documentación pública, consultada el 30/09/26; no se probó ninguno en profundidad.

### Herramientas de uso general: Excel, cuadernos y mensajería
Es lo que usa hoy la agencia. Son flexibles, gratuitas o ya pagas y todos las conocen, pero no avisan de un vencimiento, no relacionan un cobro con su viaje ni con su cliente, no registran quién hizo cada cambio y dependen de que alguien las mantenga al día.

### CRM genéricos (por ejemplo, HubSpot y Pipedrive)
Ordenan el **embudo de ventas**: contactos, oportunidades y etapas hasta el cierre. HubSpot tiene un plan gratuito con lo básico del embudo; Pipedrive es pago por usuario, con una prueba gratuita ([Pipedrive vs. HubSpot](https://www.pipedrive.com/es/crm-comparison/pipedrive-vs-hubspot), [Salesdorado](https://salesdorado.com/es/crm/herramientas-crm/pipedrive-vs-hubspot/)).

Su límite para una agencia es que **no conocen el negocio del turismo**: no tienen la entidad viaje con su itinerario de hoteles, ni el plan de cuotas del pasajero, ni la deuda con el operador, ni la ganancia y la comisión por operación, ni los requisitos de ingreso de cada destino. Todo eso habría que armarlo con campos personalizados y mantenerlo a mano, que es justamente el problema de hoy.

### Software específico de turismo
- **CRM para agentes de viaje, en su mayoría de Estados Unidos** (por ejemplo, Tern, TravelJoy y Travefy): combinan CRM, armado de itinerarios, formularios para el cliente y, en algunos planes, conciliación de comisiones y pagos a proveedores. Se cobran por usuario y por mes, en dólares ([precios de Tern](https://tern.travel/pricing), [DMC Quote](https://dmcquote.com/blog/post/travel-crm-systems-best-options-small-agencies)). Están pensados para el mercado estadounidense: en la documentación consultada no aparecen el español, el peso argentino, las cuotas del pasajero ni WhatsApp, que es el canal principal en Argentina ([Innovación Digital 360](https://www.innovaciondigital360.com/software/erp/el-83-de-las-agencias-de-viajes-argentinas-ya-usa-ia-que-software-esta-transformando-el-turismo-en-2026/)).
- **Sistemas de gestión (back office o ERP) para agencias argentinas** (por ejemplo, SAVIA): cubren la administración completa, con cotizaciones, reservas, contabilidad y facturación electrónica ante AFIP ([perfil de SAVIA](https://www.cancilleria.gob.ar/userfiles/ut/perfil_de_la_empresa_savia.pdf), [Hosteltur: qué es un back office](https://www.hosteltur.com/hosteltur-responde/back-office)). Su foco es la administración y la contabilidad; la facturación, en particular, está fuera del alcance de Rumbo en esta etapa ([[Alcance y fuera de alcance]]).

### Comparación con lo que necesita la agencia
| Necesidad de la agencia | Excel y mensajería | CRM genérico | CRM de turismo de EE. UU. | Rumbo |
|---|---|---|---|---|
| Seguir la consulta hasta la venta | A mano | Sí | Sí | Sí ([[CU-01 De la consulta a la venta\|CU-01]]) |
| Viaje con itinerario, operador y economía propia | A mano | No, con campos a medida | Sí | Sí |
| Plan de cuotas y vencimientos del pasajero y del operador | A mano, sin avisos | No | Parcial | Sí, con alertas |
| Ganancia, margen y comisión del vendedor freelance, en ARS o USD | A mano | No | Parcial, en USD | Sí |
| Recordatorios según los requisitos de cada destino | No | No | No se encontró | Sí ([[CU-15 Configurar recordatorios por destino\|CU-15]]) |
| Aviso para volver a contactar a los clientes fieles | No | Con automatizaciones a medida | No se encontró | Sí ([[CU-30 Sugerir recontacto de clientes\|CU-30]]) |
| Rol freelance que ve solo lo suyo | No | Según el plan | No se encontró | Sí |
| Español, pesos argentinos y costo acorde a una PyME | Sí | Parcial | No | Sí |

Los casilleros «no se encontró» indican que la documentación pública consultada no lo menciona, no que el producto no lo tenga.

## Por qué no alcanzan
- Las **herramientas generales** son las que causan el problema actual: dependen de la memoria de las personas.
- Los **CRM genéricos** resuelven el embudo, pero no el viaje, los cobros en cuotas ni los vencimientos, que son el centro del negocio.
- Los **CRM de turismo del exterior** se acercan en funciones, pero están pensados para otro mercado: otro idioma, otra moneda, sin cuotas ni WhatsApp y con un costo mensual en dólares por usuario.
- Los **back office argentinos** apuntan a la administración y la facturación de la agencia, más que al seguimiento comercial y a la fidelización de clientes, que es lo que más le preocupa a esta agencia.

Rumbo toma de cada grupo lo que la agencia necesita (el embudo de un CRM y el modelo del viaje y sus cobros de un sistema de turismo) y le suma lo propio de este caso: alertas por destino, recontacto de clientes fieles, vendedores freelance y multimoneda, a la medida de una PyME argentina.

## 🔎 Revisión
> [!note] Francisco (30/09) — nota creada para el paso **H1** del plan a 3 días. La situación actual sale únicamente del relevamiento y de las respuestas de la agencia del 17/09. La comparación con el mercado se armó con la documentación pública de cada producto, consultada el 30/09/26, sin pruebas propias; conviene que el equipo la revise antes de ratificarla en A6. Entra en la «Presentación general» del documento único (H3).
