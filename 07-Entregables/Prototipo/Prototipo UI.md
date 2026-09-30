---
tipo: referencia
estado: formalizado
responsable: Paloma
pc: pc1
actualizado: 30/09/26
fecha_aprobacion: 30/09/26
---
# Prototipo UI

tags:: #tipo/referencia #estado/formalizado #pc/pc1

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
| 34 | Freelance · embudo (solo lo suyo) | CU-05 · [[DEC-0008 Autenticación propia y rol de vendedor freelance\|DEC-0008]] | `img/34-freelance-embudo.png` |
| 35 | Mobile · agenda | CU-14 | `img/35-mobile-agenda.png` |
| 36 | Mobile · ficha del cliente | CU-03 | `img/36-mobile-ficha-cliente.png` |
| 37 | Freelance · agenda del día | CU-14 | `img/37-freelance-agenda.png` |
| 38 | Freelance · calendario | CU-23 | `img/38-freelance-calendario.png` |
| 39 | Freelance · clientes | CU-03 paso 1 | `img/39-freelance-clientes.png` |
| 40 | Freelance · ficha del cliente | CU-03 | `img/40-freelance-ficha-cliente.png` |
| 41 | Freelance · emitir cotización | CU-06 | `img/41-freelance-cotizacion.png` |
| 42 | Freelance · viajes | CU-08 | `img/42-freelance-viajes.png` |
| 43 | Freelance · ficha del viaje (ve su comisión) | CU-07 · CU-10 · CU-11 | `img/43-freelance-ficha-viaje.png` |
| 44 | Freelance · catálogo de hoteles (solo consulta) | CU-18 | `img/44-freelance-catalogo-hoteles.png` |
| 45 | Freelance · detalle de hotel (solo lectura) | CU-18 paso 3 | `img/45-freelance-detalle-hotel.png` |
| 46 | Freelance · dashboard (sus ventas y comisiones) | CU-21 A1 | `img/46-freelance-dashboard.png` |

[[CU-01 De la consulta a la venta|CU-01]] no tiene pantalla propia: es el circuito completo y se recorre navegando las pantallas 11 → 12 → 13 → 15 → 18.

## Vista del `freelance` (B5, 30/09/26)
El punto de inicio *Freelance · embudo* recorre todas las secciones del menú del `freelance` (pantallas 34 y 37 a 46, fila «Rol freelance · recorrido completo» en Figma), sin salir a las pantallas del `empleado`. Criterios, según [[DEC-0005 Autenticación y modelo de roles|DEC-0005]] y [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]:
- **Solo lo suyo:** agenda, calendario, clientes, oportunidades, viajes y dashboard muestran solo la cartera de Diego Paz (datos ficticios propios: Familia Acosta, Valeria Ortiz, Lucía Paz, etc.). No existe el filtro «Toda la agencia» y un aviso lo aclara en cada listado.
- **Menú sin** Redes, Reportes ni Configuración.
- **Hoteles, solo consulta:** sin «Nuevo hotel», «Editar», «Dar de baja» ni «Nueva reseña» (CU-16 y CU-17), y sin la moderación de reseñas (CU-29).
- **Economía:** en la ficha de su viaje ve precio, costo, ganancia y **su** comisión; en el dashboard, sus ventas y comisiones, sin el ranking de vendedores ni lo que se paga a los operadores.
- Desde estas pantallas no se navega a los formularios de acción (registrar cobro, nueva consulta, etc.), que ya están en el recorrido del `empleado` y son iguales para el `freelance`.

## Pendiente: prototipado completo (B5)
Pedido en la sync del 30/09/26, al aprobar el prototipo. Detalle en el paso **B5** de [[Estado del proyecto]]:
- **Cada sección vista por cada rol** (`empleado`, `admin`, `dueño` y `freelance`).
- ✅ **El `freelance` completo** (30/09/26, ver arriba): todas sus secciones, solo con lo suyo, sin cargar ni editar hoteles, sin registrar reseñas y sin el módulo de redes. `empleado`, `admin` y `dueño` sí cargan hoteles y reseñas; moderar reseñas es solo de `admin` y `dueño`.
- **El mobile completo:** agenda, alertas y clientes, según el alcance mobile de [[ARQ — Vista general]].

## Cómo regenerar los PNG
No hay script: se exportan desde Figma con el MCP (`get_screenshot` de cada pantalla, a 1440 px de ancho) y se guardan en `img/` con el mismo nombre. Si cambia una pantalla, se reexporta solo esa.

## 🔎 Revisión
> [!success] Paloma (29/09) — la agenda (pantallas 3, 7 y 35) muestra el segmento **«Próximas»** y el **«Progreso del día»**. ✅ Nahuel los aceptó el 29/09 (A5 de [[CU-14 Ver y atender alertas del día]], RF-154 y RF-155), así que se mantienen.
