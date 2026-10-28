---
tipo: referencia
estado: formalizado
responsable: equipo
generado: true
---
# Grafo de tickets

tags:: #tipo/referencia

> ⚙️ **Archivo generado.** No se edita a mano: lo regenera `node 06-Desarrollo/herramientas/tickets.mjs grafo` a partir del frontmatter de cada ticket de `06-Desarrollo/Tickets/`. El proceso está en [[Flujo de implementación]] y el tablero en vivo en [[Tablero de tickets]].

## Resumen por módulo

| Módulo | Tickets | Hechos | Tomados | Disponibles | Esperando | Bloqueados | Estado del módulo |
|---|---|---|---|---|---|---|---|
| M0 — Fundaciones | 38 | 38 | 0 | 0 | 0 | 0 | ✅ cerrado |
| M1 — Usuarios y configuración | 19 | 19 | 0 | 0 | 0 | 0 | ✅ cerrado |
| M2 — Clientes | 15 | 15 | 0 | 0 | 0 | 0 | ✅ cerrado |
| M3 — Alertas | 14 | 14 | 0 | 0 | 0 | 0 | ✅ cerrado |
| M4 — Oportunidades y cotizaciones | 16 | 15 | 0 | 1 | 0 | 0 | 🛠️ en curso |
| M5 — Hoteles y reseñas | 11 | 7 | 2 | 1 | 1 | 0 | 🛠️ en curso |
| M6 — Viajes y economía | 24 | 1 | 0 | 5 | 18 | 0 | 🛠️ en curso |
| M7 — Proceso diario y CRM proactivo | 9 | 0 | 0 | 3 | 6 | 0 | 🛠️ en curso |
| M8 — Calendario, dashboard y reportes | 10 | 0 | 0 | 1 | 9 | 0 | 🛠️ en curso |
| M9 — Redes e IA | 6 | 0 | 0 | 1 | 5 | 0 | 🛠️ en curso |
| M10 — Despliegue on-premise | 5 | 0 | 0 | 1 | 4 | 0 | 🛠️ en curso |

## Grafo

Leyenda: 🟩 hecho · 🟨 tomado · 🟦 disponible (libre y con sus dependencias hechas) · ⬜ esperando dependencias · 🟥 bloqueado. Una flecha `A → B` significa que B depende de A.

```mermaid
flowchart LR
  subgraph M0["M0 — Fundaciones"]
    T001["T-001 · Inicializar el backend con uv y FastAPI<br/><small>infra</small>"]:::hecho
    T002["T-002 · Crear el workspace pnpm con la app web<br/><small>infra</small>"]:::hecho
    T003["T-003 · Crear la app mobile con Expo development build<br/><small>infra</small>"]:::hecho
    T004["T-004 · Levantar PostgreSQL de desarrollo con Docker Compose<br/><small>infra</small>"]:::hecho
    T005["T-005 · Configurar el proyecto de Firebase con su emulador<br/><small>infra · ⚠️ riesgo alto</small>"]:::hecho
    T006["T-006 · Configurar la sesión async de la base con su entorno<br/><small>backend</small>"]:::hecho
    T007["T-007 · Mapear las entidades del ER con SQLAlchemy<br/><small>backend</small>"]:::hecho
    T008["T-008 · Crear la migración inicial de Alembic desde rumbo.sql<br/><small>backend</small>"]:::hecho
    T009["T-009 · Responder los errores con problem+json<br/><small>backend</small>"]:::hecho
    T010["T-010 · Verificar el token de Firebase para resolver el usuario actual<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T011["T-011 · Registrar el autor de cada cambio automáticamente<br/><small>backend</small>"]:::hecho
    T012["T-012 · Aplicar la visibilidad por fila según el rol<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T013["T-013 · Configurar el cliente de IA con un modelo falso<br/><small>backend</small>"]:::hecho
    T014["T-014 · Generar los tipos compartidos desde el OpenAPI<br/><small>shared</small>"]:::hecho
    T015["T-015 · Publicar el contrato base con el usuario de la sesión<br/><small>contrato</small>"]:::hecho
    T016["T-016 · Devolver el usuario de la sesión con su rol<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T017["T-017 · Crear la dueña inicial con la CLI de datos<br/><small>backend</small>"]:::hecho
    T018["T-018 · Armar el CI con jobs filtrados por carpeta<br/><small>infra</small>"]:::hecho
    T019["T-019 · Sumar los análisis de seguridad al CI<br/><small>infra</small>"]:::hecho
    T020["T-020 · Armar el shell web con la navegación por rol<br/><small>web</small>"]:::hecho
    T021["T-021 · Iniciar sesión en la web con email o Google<br/><small>web · ⚠️ riesgo alto</small>"]:::hecho
    T022["T-022 · Armar el shell mobile con sus pestañas<br/><small>mobile</small>"]:::hecho
    T023["T-023 · Iniciar sesión en la app mobile con email o Google<br/><small>mobile · ⚠️ riesgo alto</small>"]:::hecho
    T024["T-024 · Armar el Compose de producción local para las demos<br/><small>infra</small>"]:::hecho
    T025["T-025 · Probar de punta a punta el inicio de sesión web<br/><small>e2e</small>"]:::hecho
    T140["T-140 · Aislar los tests de la variable SSLKEYLOGFILE<br/><small>backend</small>"]:::hecho
    T141["T-141 · Mostrar los íconos de cada sección en la barra lateral<br/><small>web</small>"]:::hecho
    T142["T-142 · Adaptar la barra lateral de la web a pantallas angostas<br/><small>web</small>"]:::hecho
    T143["T-143 · Cubrir con tests el layout raíz de la app mobile<br/><small>mobile</small>"]:::hecho
    T144["T-144 · Exportar el OpenAPI con finales de línea LF<br/><small>backend</small>"]:::hecho
    T145["T-145 · Responder un error controlado si falta el proyecto de Firebase<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T150["T-150 · Correr las auditorías de dependencias cada semana<br/><small>infra</small>"]:::hecho
    T152["T-152 · Rechazar en el rojo un comando de tests que no se pudo ejecutar<br/><small>infra</small>"]:::hecho
    T154["T-154 · Acelerar la suite de tests del backend<br/><small>infra</small>"]:::hecho
    T158["T-158 · Leer la configuración de Firebase de mobile con accesos directos a process.env<br/><small>mobile · ⚠️ riesgo alto</small>"]:::hecho
    T159["T-159 · Alinear la verificación del token con la ventana de revocación aceptada<br/><small>backend</small>"]:::hecho
    T160["T-160 · Correr los checks de mobile cuando cambia el paquete compartido<br/><small>infra</small>"]:::hecho
    T162["T-162 · Aceptar el riesgo de zod en el CLI de Expo<br/><small>infra</small>"]:::hecho
  end
  subgraph M1["M1 — Usuarios y configuración"]
    T026["T-026 · Publicar el contrato de usuarios y configuración<br/><small>contrato</small>"]:::hecho
    T027["T-027 · Dar de alta usuarios con su cuenta de Firebase<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T028["T-028 · Editar el rol de un usuario protegiendo al último admin<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T029["T-029 · Editar los parámetros del negocio<br/><small>backend</small>"]:::hecho
    T030["T-030 · Configurar la comisión por defecto de un vendedor<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T031["T-031 · Gestionar el catálogo de destinos<br/><small>backend</small>"]:::hecho
    T032["T-032 · Configurar los requisitos de cada destino<br/><small>backend</small>"]:::hecho
    T033["T-033 · Gestionar el catálogo de operadores<br/><small>backend</small>"]:::hecho
    T034["T-034 · Configurar los parámetros del negocio en la web<br/><small>web</small>"]:::hecho
    T035["T-035 · Gestionar usuarios y roles en la web<br/><small>web</small>"]:::hecho
    T036["T-036 · Gestionar destinos con sus requisitos en la web<br/><small>web</small>"]:::hecho
    T037["T-037 · Gestionar operadores en la web<br/><small>web</small>"]:::hecho
    T038["T-038 · Probar de punta a punta la configuración de la agencia<br/><small>e2e</small>"]:::hecho
    T146["T-146 · Alinear las referencias de RF del permiso por rol<br/><small>backend</small>"]:::hecho
    T147["T-147 · Fijar con un test la comisión de un usuario dado de baja<br/><small>backend</small>"]:::hecho
    T148["T-148 · Medir la cobertura del backend a través de los await<br/><small>infra</small>"]:::hecho
    T151["T-151 · Responder 422 ante un número fuera del rango de la base<br/><small>backend</small>"]:::hecho
    T153["T-153 · Recuperar las cuentas de Firebase que quedaron sin usuario<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T163["T-163 · Forzar la versión con parche de undici<br/><small>infra</small>"]:::hecho
  end
  subgraph M2["M2 — Clientes"]
    T039["T-039 · Publicar el contrato de clientes<br/><small>contrato</small>"]:::hecho
    T040["T-040 · Registrar clientes detectando duplicados<br/><small>backend</small>"]:::hecho
    T041["T-041 · Buscar clientes según la visibilidad del rol<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T042["T-042 · Editar la ficha del cliente<br/><small>backend</small>"]:::hecho
    T043["T-043 · Mostrar el historial del cliente<br/><small>backend</small>"]:::hecho
    T044["T-044 · Listar clientes en la web<br/><small>web</small>"]:::hecho
    T045["T-045 · Registrar un cliente en la web<br/><small>web</small>"]:::hecho
    T046["T-046 · Mostrar la ficha editable del cliente en la web<br/><small>web</small>"]:::hecho
    T047["T-047 · Consultar clientes desde la app mobile<br/><small>mobile</small>"]:::hecho
    T048["T-048 · Registrar un cliente desde la app mobile<br/><small>mobile</small>"]:::hecho
    T049["T-049 · Probar de punta a punta la gestión de clientes<br/><small>e2e</small>"]:::hecho
    T149["T-149 · Guardar el usuario de Instagram del cliente<br/><small>backend</small>"]:::hecho
    T155["T-155 · Resumir asesor, último viaje y oportunidades en el listado de clientes<br/><small>backend</small>"]:::hecho
    T156["T-156 · Listar las etiquetas de clientes en uso<br/><small>backend</small>"]:::hecho
    T157["T-157 · Completar el listado de clientes en la web<br/><small>web</small>"]:::hecho
  end
  subgraph M3["M3 — Alertas"]
    T050["T-050 · Publicar el contrato de alertas<br/><small>contrato</small>"]:::hecho
    T051["T-051 · Crear el servicio de alertas para los demás módulos<br/><small>backend</small>"]:::hecho
    T052["T-052 · Listar la agenda de alertas según el rol<br/><small>backend</small>"]:::hecho
    T053["T-053 · Atender las alertas con el progreso del día<br/><small>backend</small>"]:::hecho
    T054["T-054 · Crear recordatorios manuales<br/><small>backend</small>"]:::hecho
    T055["T-055 · Atender la agenda del día en la web<br/><small>web</small>"]:::hecho
    T056["T-056 · Crear un recordatorio manual en la web<br/><small>web</small>"]:::hecho
    T057["T-057 · Atender la agenda del día en la app mobile<br/><small>mobile</small>"]:::hecho
    T058["T-058 · Posponer una alerta desde su detalle en la app mobile<br/><small>mobile</small>"]:::hecho
    T059["T-059 · Crear un recordatorio manual desde la app mobile<br/><small>mobile</small>"]:::hecho
    T060["T-060 · Probar de punta a punta la agenda de alertas<br/><small>e2e</small>"]:::hecho
    T164["T-164 · Mostrar los totales de la agenda web como en el prototipo<br/><small>web</small>"]:::hecho
    T165["T-165 · Filtrar la agenda mobile con chips como en el prototipo<br/><small>mobile</small>"]:::hecho
    T166["T-166 · Mostrar el detalle de la alerta en un panel lateral de la agenda web<br/><small>web</small>"]:::hecho
  end
  subgraph M4["M4 — Oportunidades y cotizaciones"]
    T061["T-061 · Publicar el contrato de oportunidades y cotizaciones<br/><small>contrato</small>"]:::hecho
    T062["T-062 · Registrar una consulta como oportunidad<br/><small>backend</small>"]:::hecho
    T063["T-063 · Listar las oportunidades del embudo<br/><small>backend</small>"]:::hecho
    T064["T-064 · Implementar los estados de la oportunidad<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T065["T-065 · Agendar insistencias en el seguimiento de la oportunidad<br/><small>backend</small>"]:::hecho
    T066["T-066 · Emitir cotizaciones versionadas con su vigencia<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T067["T-067 · Registrar la respuesta del cliente a la cotización<br/><small>backend · ⚠️ riesgo alto</small>"]:::hecho
    T068["T-068 · Generar el documento PDF de la cotización<br/><small>backend</small>"]:::hecho
    T069["T-069 · Registrar una consulta en la web<br/><small>web</small>"]:::hecho
    T070["T-070 · Mostrar el embudo de oportunidades en la web<br/><small>web</small>"]:::hecho
    T071["T-071 · Seguir una oportunidad desde su detalle en la web<br/><small>web</small>"]:::hecho
    T072["T-072 · Emitir una cotización en la web<br/><small>web</small>"]:::hecho
    T073["T-073 · Registrar la respuesta a una cotización en la web<br/><small>web</small>"]:::hecho
    T074["T-074 · Probar de punta a punta el embudo con cotización<br/><small>e2e</small>"]:::hecho
    T167["T-167 · Registrar una consulta sin destino ni pasajeros<br/><small>backend</small>"]:::hecho
    T168["T-168 · Mostrar las consultas sin destino ni pasajeros en web y mobile<br/><small>web</small>"]:::disponible
  end
  subgraph M5["M5 — Hoteles y reseñas"]
    T075["T-075 · Publicar el contrato de hoteles y reseñas<br/><small>contrato</small>"]:::hecho
    T076["T-076 · Gestionar los hoteles del catálogo<br/><small>backend</small>"]:::hecho
    T077["T-077 · Buscar hoteles ordenados por su puntaje<br/><small>backend</small>"]:::hecho
    T078["T-078 · Registrar las reseñas de un hotel<br/><small>backend</small>"]:::hecho
    T079["T-079 · Moderar las reseñas de los hoteles<br/><small>backend</small>"]:::hecho
    T080["T-080 · Buscar hoteles en el catálogo web<br/><small>web</small>"]:::hecho
    T081["T-081 · Editar un hotel del catálogo en la web<br/><small>web</small><br/>👤 FranLucianoo"]:::tomado
    T082["T-082 · Mostrar el detalle del hotel con sus reseñas en la web<br/><small>web</small>"]:::hecho
    T083["T-083 · Registrar una reseña en la web<br/><small>web</small>"]:::disponible
    T084["T-084 · Recomendar hoteles al emitir una cotización<br/><small>web</small><br/>👤 Nahuel Viniegra"]:::tomado
    T085["T-085 · Probar de punta a punta el catálogo de hoteles<br/><small>e2e</small>"]:::esperando
  end
  subgraph M6["M6 — Viajes y economía"]
    T086["T-086 · Publicar el contrato de viajes y economía<br/><small>contrato</small>"]:::hecho
    T087["T-087 · Implementar la máquina de estados del viaje<br/><small>backend · ⚠️ riesgo alto</small>"]:::disponible
    T088["T-088 · Implementar los estados del pago<br/><small>backend · ⚠️ riesgo alto</small>"]:::disponible
    T089["T-089 · Confirmar la reserva creando el viaje<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T090["T-090 · Registrar la economía del viaje con su comisión<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T091["T-091 · Listar los viajes con su situación económica<br/><small>backend</small>"]:::esperando
    T092["T-092 · Definir el plan de pagos del viaje<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T093["T-093 · Ajustar los pagos de un plan ya definido<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T094["T-094 · Registrar el cobro de un pago del viaje<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T095["T-095 · Revertir un cobro registrado por error<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T096["T-096 · Avanzar el estado del viaje a en curso o finalizado<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T097["T-097 · Armar el itinerario de hoteles del viaje<br/><small>backend</small>"]:::disponible
    T098["T-098 · Registrar el pago al proveedor de cada tramo<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T099["T-099 · Cancelar un viaje con su reversión<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T100["T-100 · Listar los viajes en la web<br/><small>web</small>"]:::disponible
    T101["T-101 · Confirmar la reserva desde la oportunidad en la web<br/><small>web</small>"]:::disponible
    T102["T-102 · Registrar la economía desde la ficha del viaje en la web<br/><small>web</small>"]:::esperando
    T103["T-103 · Definir el plan de cuotas en la web<br/><small>web</small>"]:::esperando
    T104["T-104 · Registrar el cobro de un pago en la web<br/><small>web</small>"]:::esperando
    T105["T-105 · Cambiar el estado del viaje en la web<br/><small>web</small>"]:::esperando
    T106["T-106 · Armar el itinerario de hoteles en la web<br/><small>web</small>"]:::esperando
    T107["T-107 · Cancelar un viaje desde la web<br/><small>web</small>"]:::esperando
    T108["T-108 · Probar de punta a punta el circuito de CU-01<br/><small>e2e</small>"]:::esperando
    T109["T-109 · Probar de punta a punta las excepciones del viaje<br/><small>e2e</small>"]:::esperando
  end
  subgraph M7["M7 — Proceso diario y CRM proactivo"]
    T110["T-110 · Armar el proceso diario idempotente<br/><small>backend · ⚠️ riesgo alto</small>"]:::disponible
    T111["T-111 · Vencer pagos y cotizaciones en el proceso diario<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T112["T-112 · Sugerir el avance de los viajes en el proceso diario<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T113["T-113 · Detectar clientes inactivos para sugerir el recontacto<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T114["T-114 · Registrar la decisión sobre una sugerencia de recontacto<br/><small>backend</small>"]:::esperando
    T115["T-115 · Programar el proceso diario en el Compose<br/><small>infra</small>"]:::esperando
    T116["T-116 · Atender una sugerencia de recontacto en la web<br/><small>web</small>"]:::disponible
    T117["T-117 · Atender una sugerencia de recontacto en la app mobile<br/><small>mobile</small>"]:::disponible
    T118["T-118 · Probar de punta a punta el proceso diario<br/><small>e2e</small>"]:::esperando
  end
  subgraph M8["M8 — Calendario, dashboard y reportes"]
    T119["T-119 · Publicar el contrato de calendario, dashboard y reportes<br/><small>contrato</small>"]:::disponible
    T120["T-120 · Consultar el calendario consolidado<br/><small>backend</small>"]:::esperando
    T121["T-121 · Calcular el embudo con los indicadores económicos<br/><small>backend</small>"]:::esperando
    T122["T-122 · Calcular los indicadores operativos del dashboard<br/><small>backend</small>"]:::esperando
    T123["T-123 · Generar los reportes del período<br/><small>backend</small>"]:::esperando
    T124["T-124 · Exportar los reportes a Excel o PDF<br/><small>backend</small>"]:::esperando
    T125["T-125 · Mostrar el calendario de viajes en la web<br/><small>web</small>"]:::esperando
    T126["T-126 · Mostrar el dashboard con el embudo en la web<br/><small>web</small>"]:::esperando
    T127["T-127 · Generar los reportes en la web<br/><small>web</small>"]:::esperando
    T128["T-128 · Probar de punta a punta el tablero de gestión<br/><small>e2e</small>"]:::esperando
  end
  subgraph M9["M9 — Redes e IA"]
    T129["T-129 · Publicar el contrato de redes<br/><small>contrato</small>"]:::disponible
    T130["T-130 · Planificar las piezas de contenido en el tablero<br/><small>backend</small>"]:::esperando
    T131["T-131 · Generar borradores de contenido con IA<br/><small>backend · ⚠️ riesgo alto</small>"]:::esperando
    T132["T-132 · Planificar contenido en el tablero web<br/><small>web</small>"]:::esperando
    T133["T-133 · Pedir una propuesta de contenido con IA en la web<br/><small>web</small>"]:::esperando
    T134["T-134 · Probar de punta a punta la planificación de redes<br/><small>e2e</small>"]:::esperando
  end
  subgraph M10["M10 — Despliegue on-premise"]
    T135["T-135 · Preparar el servidor on-premise de la agencia<br/><small>infra</small>"]:::disponible
    T136["T-136 · Publicar Rumbo con Cloudflare Tunnel<br/><small>infra</small>"]:::esperando
    T137["T-137 · Desplegar desde el CI con el runner del servidor<br/><small>infra</small>"]:::esperando
    T138["T-138 · Respaldar la base a diario con copia externa<br/><small>infra</small>"]:::esperando
    T139["T-139 · Medir el rendimiento con una prueba de carga<br/><small>infra</small>"]:::esperando
  end
  T002 --> T003
  T001 --> T006
  T004 --> T006
  T006 --> T007
  T007 --> T008
  T001 --> T009
  T008 --> T010
  T009 --> T010
  T008 --> T011
  T010 --> T011
  T007 --> T012
  T009 --> T012
  T006 --> T013
  T002 --> T014
  T009 --> T015
  T014 --> T015
  T015 --> T016
  T010 --> T016
  T010 --> T017
  T011 --> T017
  T001 --> T018
  T002 --> T018
  T003 --> T018
  T008 --> T018
  T018 --> T019
  T015 --> T020
  T020 --> T021
  T005 --> T021
  T015 --> T022
  T003 --> T022
  T022 --> T023
  T005 --> T023
  T001 --> T024
  T002 --> T024
  T008 --> T024
  T021 --> T025
  T016 --> T025
  T017 --> T025
  T024 --> T025
  T018 --> T025
  T015 --> T026
  T026 --> T027
  T017 --> T027
  T012 --> T027
  T011 --> T027
  T027 --> T028
  T026 --> T029
  T012 --> T029
  T011 --> T029
  T026 --> T030
  T012 --> T030
  T011 --> T030
  T026 --> T031
  T012 --> T031
  T011 --> T031
  T031 --> T032
  T031 --> T033
  T026 --> T034
  T020 --> T034
  T034 --> T035
  T034 --> T036
  T036 --> T037
  T028 --> T038
  T029 --> T038
  T030 --> T038
  T032 --> T038
  T033 --> T038
  T035 --> T038
  T036 --> T038
  T037 --> T038
  T025 --> T038
  T015 --> T039
  T039 --> T040
  T012 --> T040
  T011 --> T040
  T039 --> T041
  T012 --> T041
  T040 --> T042
  T041 --> T042
  T149 --> T042
  T041 --> T043
  T039 --> T044
  T020 --> T044
  T044 --> T045
  T149 --> T045
  T044 --> T046
  T149 --> T046
  T039 --> T047
  T022 --> T047
  T047 --> T048
  T149 --> T048
  T040 --> T049
  T041 --> T049
  T042 --> T049
  T043 --> T049
  T045 --> T049
  T046 --> T049
  T025 --> T049
  T015 --> T050
  T007 --> T051
  T012 --> T051
  T011 --> T051
  T050 --> T052
  T051 --> T052
  T052 --> T053
  T050 --> T054
  T051 --> T054
  T050 --> T055
  T020 --> T055
  T055 --> T056
  T050 --> T057
  T022 --> T057
  T057 --> T058
  T057 --> T059
  T053 --> T060
  T054 --> T060
  T055 --> T060
  T056 --> T060
  T025 --> T060
  T164 --> T060
  T166 --> T060
  T015 --> T061
  T061 --> T062
  T040 --> T062
  T061 --> T063
  T012 --> T063
  T063 --> T064
  T064 --> T065
  T051 --> T065
  T064 --> T066
  T029 --> T066
  T066 --> T067
  T066 --> T068
  T061 --> T069
  T039 --> T069
  T020 --> T069
  T061 --> T070
  T020 --> T070
  T070 --> T071
  T071 --> T072
  T072 --> T073
  T062 --> T074
  T065 --> T074
  T067 --> T074
  T068 --> T074
  T069 --> T074
  T073 --> T074
  T049 --> T074
  T015 --> T075
  T075 --> T076
  T012 --> T076
  T011 --> T076
  T076 --> T077
  T076 --> T078
  T078 --> T079
  T075 --> T080
  T020 --> T080
  T080 --> T081
  T080 --> T082
  T082 --> T083
  T072 --> T084
  T080 --> T084
  T077 --> T085
  T079 --> T085
  T081 --> T085
  T083 --> T085
  T084 --> T085
  T025 --> T085
  T015 --> T086
  T007 --> T087
  T009 --> T087
  T007 --> T088
  T009 --> T088
  T086 --> T089
  T087 --> T089
  T064 --> T089
  T032 --> T089
  T051 --> T089
  T029 --> T089
  T086 --> T090
  T087 --> T090
  T030 --> T090
  T086 --> T091
  T012 --> T091
  T090 --> T091
  T090 --> T092
  T088 --> T092
  T051 --> T092
  T092 --> T093
  T092 --> T094
  T087 --> T094
  T094 --> T095
  T086 --> T096
  T087 --> T096
  T051 --> T096
  T086 --> T097
  T076 --> T097
  T012 --> T097
  T097 --> T098
  T051 --> T098
  T094 --> T099
  T051 --> T099
  T086 --> T100
  T020 --> T100
  T086 --> T101
  T071 --> T101
  T100 --> T102
  T102 --> T103
  T103 --> T104
  T102 --> T105
  T102 --> T106
  T075 --> T106
  T102 --> T107
  T089 --> T108
  T090 --> T108
  T094 --> T108
  T091 --> T108
  T096 --> T108
  T097 --> T108
  T101 --> T108
  T104 --> T108
  T106 --> T108
  T105 --> T108
  T074 --> T108
  T085 --> T108
  T093 --> T109
  T095 --> T109
  T098 --> T109
  T099 --> T109
  T103 --> T109
  T107 --> T109
  T108 --> T109
  T006 --> T110
  T011 --> T110
  T051 --> T110
  T110 --> T111
  T088 --> T111
  T067 --> T111
  T110 --> T112
  T096 --> T112
  T110 --> T113
  T042 --> T113
  T029 --> T113
  T113 --> T114
  T062 --> T114
  T053 --> T114
  T110 --> T115
  T024 --> T115
  T055 --> T116
  T069 --> T116
  T058 --> T117
  T111 --> T118
  T112 --> T118
  T114 --> T118
  T115 --> T118
  T116 --> T118
  T109 --> T118
  T015 --> T119
  T119 --> T120
  T012 --> T120
  T119 --> T121
  T012 --> T121
  T090 --> T121
  T121 --> T122
  T119 --> T123
  T121 --> T123
  T123 --> T124
  T068 --> T124
  T119 --> T125
  T020 --> T125
  T119 --> T126
  T020 --> T126
  T126 --> T127
  T120 --> T128
  T122 --> T128
  T124 --> T128
  T125 --> T128
  T127 --> T128
  T109 --> T128
  T015 --> T129
  T129 --> T130
  T012 --> T130
  T011 --> T130
  T130 --> T131
  T013 --> T131
  T129 --> T132
  T020 --> T132
  T132 --> T133
  T131 --> T134
  T133 --> T134
  T025 --> T134
  T024 --> T135
  T135 --> T136
  T135 --> T137
  T018 --> T137
  T135 --> T138
  T115 --> T138
  T137 --> T139
  T128 --> T139
  T006 --> T140
  T020 --> T141
  T020 --> T142
  T003 --> T143
  T014 --> T144
  T010 --> T145
  T030 --> T147
  T040 --> T149
  T019 --> T150
  T027 --> T153
  T041 --> T155
  T041 --> T156
  T044 --> T157
  T155 --> T157
  T156 --> T157
  T055 --> T164
  T057 --> T165
  T055 --> T166
  T032 --> T166
  T062 --> T167
  T066 --> T167
  T167 --> T168
  T069 --> T168
  classDef hecho fill:#c8e6c9,stroke:#2e7d32,color:#1b5e20
  classDef tomado fill:#fff3cd,stroke:#b8860b,color:#5d4300
  classDef disponible fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a
  classDef esperando fill:#eeeeee,stroke:#9e9e9e,color:#555555
  classDef bloqueado fill:#fde2e2,stroke:#c62828,color:#7f1d1d
```
