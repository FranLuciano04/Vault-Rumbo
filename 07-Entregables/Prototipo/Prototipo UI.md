---
tipo: referencia
estado: borrador
responsable: Paloma
pc: pc1
actualizado: 29/09/26
---
# Prototipo UI

tags:: #tipo/referencia #estado/borrador #pc/pc1

> Prototipo navegable de Rumbo en Figma (paso **B4** del plan de PC1). La fuente es el archivo de Figma; los PNG de `img/` son su exportación para el documento único y la presentación, **no se editan a mano**.

- **Figma:** [Rumbo — Prototipo PC1](https://www.figma.com/design/5rq8HOlZQ3uu4IUpBuhuZp) (cuenta de estudiante de Paloma). Página «🖥 Pantallas» y página «🧩 Componentes».
- **Cómo presentarlo:** botón ▶ *Present* y, en *Opciones*, **«Ajustar» (Fit)** para que cada pantalla de 1440 × 1024 entre completa en el monitor. Puntos de inicio: *Rumbo · escritorio (empleado)* (arranca en el inicio de sesión), *Rumbo · mobile*, *Dueña · dashboard*, *Admin · configuración* y *Freelance · embudo*.
- **Datos de ejemplo:** todos ficticios y coherentes entre pantallas (la Familia Ferreyra y su viaje a Bariloche atraviesan agenda, ficha, viaje y cobro). Importes en ARS y fechas `dd/mm/aa`.

## Sistema de diseño
Tokens en variables (paleta del equipo: azules `#22506F` → `#73A5C4` y gris `#D9D9D9`; espaciado de 4 px; radios), tipografía **Plus Jakarta Sans** en 8 estilos, 2 sombras, 28 íconos y los componentes Botón, Etiqueta, Ítem de menú, Fila de alerta, Campo, Chip y Barra lateral. Contraste de texto **WCAG AA**; el color nunca es la única señal.

## Pantallas
| # | Pantalla | Caso de uso | PNG |
|---|---|---|---|
| 1 | Inicio de sesión | [[CU-24 Iniciar sesión\|CU-24]] | `img/01-cu24-inicio-sesion.png` |
| 2 | Inicio de sesión · credenciales inválidas | CU-24 A1 | `img/02-cu24-inicio-sesion-error.png` |
| 3 | Agenda de alertas del día | [[CU-14 Ver y atender alertas del día\|CU-14]] | `img/03-cu14-agenda.png` |
| 4 | Agenda vacía | CU-14 A3 | `img/04-cu14-agenda-vacia.png` |
| 5 | Aviso tras resolver, con «Deshacer» | CU-14 | `img/05-cu14-aviso-deshacer.png` |
| 6 | Nuevo recordatorio | [[CU-28 Crear recordatorio manual\|CU-28]] | `img/06-cu28-recordatorio-manual.png` |
| 7 | Sugerencia de recontacto | [[CU-30 Sugerir recontacto de clientes\|CU-30]] | `img/07-cu30-recontacto.png` |
| 8 | Listado de clientes | [[CU-03 Gestionar ficha del cliente\|CU-03]] paso 1 | `img/08-clientes-listado.png` |
| 9 | Nuevo cliente · posible duplicado | [[CU-02 Registrar cliente\|CU-02]] A1 | `img/09-cu02-registrar-cliente.png` |
| 10 | Ficha del cliente | CU-03 | `img/10-cu03-ficha-cliente.png` |
| 11 | Nueva consulta | [[CU-04 Registrar consulta\|CU-04]] | `img/11-cu04-registrar-consulta.png` |
| 12 | Embudo de oportunidades | [[CU-05 Seguir oportunidad\|CU-05]] | `img/12-cu05-embudo.png` |
| 13 | Emitir cotización | [[CU-06 Emitir cotización\|CU-06]] | `img/13-cu06-emitir-cotizacion.png` |
| 14 | Listado de viajes | [[CU-08 Gestionar estado del viaje\|CU-08]] | `img/14-viajes-listado.png` |
| 15 | Ficha del viaje | [[CU-07 Confirmar reserva\|CU-07]] · [[CU-10 Registrar economía del viaje\|CU-10]] · [[CU-11 Definir plan de cuotas\|CU-11]] | `img/15-cu07-10-11-ficha-viaje.png` |
| 16 | Confirmar el cambio a «en curso» | CU-08 A1 | `img/16-cu08-estado-viaje.png` |
| 17 | Itinerario de hoteles | [[CU-09 Armar itinerario de hoteles\|CU-09]] | `img/17-cu09-itinerario.png` |
| 18 | Registrar cobro | [[CU-12 Registrar cobro de un pago\|CU-12]] | `img/18-cu12-registrar-cobro.png` |
| 19 | Cancelar viaje | [[CU-27 Cancelar viaje\|CU-27]] | `img/19-cu27-cancelar-viaje.png` |
| 20 | Calendario | [[CU-23 Ver calendario de viajes y vencimientos\|CU-23]] | `img/20-cu23-calendario.png` |
| 21 | Catálogo de hoteles | [[CU-18 Buscar y recomendar hoteles\|CU-18]] | `img/21-cu18-catalogo-hoteles.png` |
| 22 | Catálogo sin resultados | CU-18 A1 | `img/22-cu18-sin-resultados.png` |
| 23 | Nuevo hotel | [[CU-16 Gestionar hotel en catálogo\|CU-16]] | `img/23-cu16-nuevo-hotel.png` |
| 24 | Detalle de hotel y moderación de reseñas (admin) | CU-18 paso 3 · [[CU-29 Eliminar reseña\|CU-29]] | `img/24-hotel-detalle-cu29.png` |
| 25 | Nueva reseña | [[CU-17 Registrar reseña de hotel\|CU-17]] | `img/25-cu17-registrar-resena.png` |
| 26 | Contenido en redes | [[CU-19 Planificar contenido en redes\|CU-19]] | `img/26-cu19-contenido-redes.png` |
| 27 | Propuesta con IA | [[CU-20 Generar propuesta de contenido con IA\|CU-20]] | `img/27-cu20-propuesta-ia.png` |
| 28 | Dashboard (dueña) | [[CU-21 Ver dashboard y embudo\|CU-21]] | `img/28-cu21-dashboard.png` |
| 29 | Reportes (dueña) | [[CU-22 Generar reportes y estadísticas\|CU-22]] | `img/29-cu22-reportes.png` |
| 30 | Parámetros y comisiones (admin) | [[CU-13 Configurar porcentaje de comisión\|CU-13]] · [[DEC-0013 Datos que faltaban en el ER\|DEC-0013]] | `img/30-config-parametros-cu13.png` |
| 31 | Usuarios y roles (admin) | [[CU-25 Gestionar usuarios y roles\|CU-25]] | `img/31-cu25-usuarios-roles.png` |
| 32 | Destinos y requisitos (admin) | [[CU-26 Gestionar destinos\|CU-26]] · [[CU-15 Configurar recordatorios por destino\|CU-15]] | `img/32-cu26-cu15-destinos.png` |
| 33 | Operadores (admin) | [[CU-31 Gestionar operadores\|CU-31]] | `img/33-cu31-operadores.png` |
| 34 | Embudo visto por un freelance | CU-05 · [[DEC-0008 Autenticación propia y rol de vendedor freelance\|DEC-0008]] | `img/34-freelance-embudo.png` |
| 35 | Mobile · agenda | CU-14 | `img/35-mobile-agenda.png` |
| 36 | Mobile · ficha del cliente | CU-03 | `img/36-mobile-ficha-cliente.png` |

[[CU-01 De la consulta a la venta|CU-01]] no tiene pantalla propia: es el circuito completo y se recorre navegando las pantallas 11 → 12 → 13 → 15 → 18.

## Cómo regenerar los PNG
No hay script: se exportan desde Figma con el MCP (`get_screenshot` de cada pantalla, a 1440 px de ancho) y se guardan en `img/` con el mismo nombre. Si cambia una pantalla, se reexporta solo esa.

## 🔎 Revisión
> [!question] Paloma (29/09) — la agenda (pantallas 3, 7 y 35) muestra el segmento **«Próximas»** y el **«Progreso del día»**, que están **propuestos** en la Revisión de [[CU-14 Ver y atender alertas del día]] a la espera de que Nahuel los acepte #accion/decidir. Si se rechazan, hay que sacarlos del prototipo y reexportar esos PNG.
