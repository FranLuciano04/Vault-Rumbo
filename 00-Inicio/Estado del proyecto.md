---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 18/09/26
---

# 📊 Estado del proyecto

> Memoria externa del equipo (y de Claude). Se actualiza en cada **sync semanal**. Es lo primero que se lee al retomar. Mantener **corto**.

## Fase actual
**Análisis y diseño → rumbo a PC1 (23/10/26).** Los **31 casos de uso ya están especificados** (todos en `en-revision`, ver [[MOC — Casos de uso]]); falta **ratificarlos en la sync**. (El **CU-31** se agregó el 17/09 para el ABM de [[Operador]]; sumado el 18/09 al [[DGM — Casos de uso|diagrama]] y al entregable.) Próximo: diagrama de clases, ER, actividad, arquitectura y prototipo UI.

## Roles de esta quincena
Los tres tomamos **los tres roles** (Coordinador de vault · Guardián del dominio · Escriba de decisiones): todos estamos en todo. **Francisco** es el referente/mantenedor del vault (lo creó y chequea el rumbo general). Definido en la sync 11/09.

## Checklist PC1 — modelo UML completo
> Herramientas: **diagramas UML en Mermaid** (versionable) · **prototipo UI en Figma** (MCP), con link + PNGs en [[Entregables — índice|07-Entregables]].

### Obligatorio (piso del cronograma)
- [ ] `01-Relevamiento/` formalizado
- [ ] [[Actores]] formalizados (empleado, admin, dueño, freelance, cliente)
- [ ] Especificación de los 31 CU + [[DGM — Casos de uso|diagrama de casos de uso]] (CU-31 sumado al diagrama y al entregable 18/09)
- [ ] 13 entidades formalizadas (Usuario, Cliente, Oportunidad, Viaje, Pago, Hotel, Reseña, Alerta, Cotización, ContenidoRed, Destino, RequisitoDestino, Operador ⚠️nueva 17/09)
- [ ] [[MOC — Modelo de dominio|Diagrama de clases]] + [[DGM-ER]] coherentes (atributos, tipos, multiplicidades)
- [ ] Diagramas de **actividad** de flujos clave ([[CU-01 De la consulta a la venta|CU-01]] + críticos)
- [ ] [[ARQ — Vista general]] formalizada
- [x] DEC estructurales registradas y **ratificadas** (DEC-0001→0006, selladas 11/09; DEC-0002 sigue `en-revision`). ✅ **DEC-0007, DEC-0008 y DEC-0009** selladas 17/09; **DEC-0004 obsoleta** (superseded por DEC-0007)
- [ ] Prototipo UI de pantallas clave (Figma)

### Recomendado (buenas prácticas — refuerzan el modelo)
- [ ] Diagramas de **secuencia** de CU clave (consulta→cotización→reserva, registrar pago)
- [ ] Diagramas de **estado**: `Viaje`, `Oportunidad`, `Pago`
- [ ] **Matriz de trazabilidad** (objetivo → CU → entidad → regla)
- [ ] Catálogo de **reglas de negocio** ampliado (hoy solo [[RN-01 Comisión automática]])
- [ ] **Glosario** del lenguaje ubicuo (entidades + términos del negocio) → nueva nota, p. ej. `02-Analisis/Glosario.md`
- [ ] **Requisitos funcionales y no funcionales** documentados (RF derivados de los CU; RNF: seguridad, rendimiento, usabilidad, disponibilidad…) → nueva nota, p. ej. `01-Relevamiento/Requisitos funcionales y no funcionales.md`

> Cierre PC1: la consulta `#pc/pc1 AND #estado/borrador` debe dar **cero** en lo obligatorio de arriba.

## Bitácora de decisiones recientes
- 18/09/26 — **Enums `forma_pago` y `Alerta.tipo` cerrados** (Nahuel, borrador a ratificar). Al cerrar `Alerta.tipo` se detectó y resolvió una contradicción: los CU ya escritos (CU-07, CU-14, CU-15, CU-28) usaban un único tipo `formulario` genérico, mientras la nota de [[Alerta]] (17/09) proponía 6 tipos granulares del relevamiento que duplicaban la categoría que ya da [[RequisitoDestino]]`.tipo`. Se mantiene `formulario` genérico y se suma **`salida`** (aviso de próxima salida, generado en [[CU-07 Confirmar reserva]], anticipación propuesta 7 días ⚠️ sin validar) — enum final: `pago · formulario · salida · insistencia · reseña · manual · recontacto`. Para [[Pago]]`.forma_pago` no había dato del relevamiento: se propone `efectivo · transferencia · tarjeta_credito · tarjeta_debito · cheque · deposito` como borrador, a confirmar con la agencia (¿Mercado Pago u otro medio digital?). Ambos quedan `#accion/decidir` para la próxima sync.
- 18/09/26 — **Diagrama y entregable de Casos de uso actualizados** (Nahuel). Se sumó el nodo **CU-31** ([[CU-31 Gestionar operadores|Gestionar operadores]]) al [[DGM — Casos de uso]] (módulo *Economía y pagos*, actor `admin`) y se regeneró el PNG (ELK) y el DOCX entregable. Además se corrigieron 4 nombres en el diagrama para que todos los casos de uso inicien con verbo y queden sin detalles de implementación: *Propuesta con IA* → **Generar propuesta con IA**; *Reportes y estadísticas* → **Generar reportes y estadísticas**; *Recordatorios por destino* → **Generar recordatorios por destinos**; *Configurar % comisión* → **Configurar comisión** (se sacó el `%` del nombre). Los títulos de los `.md` fuente de cada CU no se tocaron (ya iniciaban con verbo).
- 17/09/26 — **2ª ronda de relevamiento** (respuestas de la agencia, las trajo Francisco; procesadas por Paloma). Se registró todo en [[Relevamiento — respuestas de la agencia (17-09)]] y se abrieron dos DEC `en-revision`: **[[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]** (supersede a [[DEC-0004 Comisión configurable por porcentaje]]: ganancia = venta − costo, margen $/%, comisión de vendedor aparte, **multimoneda**) y **[[DEC-0008 Autenticación propia y rol de vendedor freelance]]** (login usuario/contraseña individual + auditoría; nuevo rol **freelance** con visibilidad restringida, amplía [[DEC-0005 Autenticación y modelo de roles]]). Se actualizaron [[CU-21 Ver dashboard y embudo|CU-21]] (KPIs), [[CU-22 Generar reportes y estadísticas|CU-22]] (catálogo + Excel/PDF), [[CU-30 Sugerir recontacto de clientes|CU-30]] (6 meses + segmentación) y las entidades [[Viaje]], [[Usuario]], [[Alerta]], [[Cliente]] y la regla [[RN-01 Comisión automática]]. **Ratificado en la sync del 17/09** (Francisco, Nahuel y Paloma): se sellaron DEC-0007, DEC-0008 y la nueva **[[DEC-0009 Operador-Proveedor como entidad de catálogo]]** (13ª entidad **[[Operador]]**); DEC-0004 quedó **obsoleta**. Detalle en "Definido y sellado en la sync 17/09".
- 11/09/26 — **Entregable DOCX de Casos de uso rehecho** (Nahuel). Diagrama ([[DGM — Casos de uso]]) rehecho con motor **ELK** (más legible), generalización de roles y actor externo aclarado, e **incrustado** en el DOCX (bug de rutas con espacios resuelto). Estética **académica** (plantilla `make-reference.ps1`, migrada de Python a PowerShell) y **contenido saneado**: el `.docx` ya no filtra cocina interna (DEC, notas de revisión, tags). Detalle en [[Entregables — índice]] y [[CONTINUAR — entregable Casos de uso]].
- 11/09/26 — **Cruce del relevamiento en crudo** (Francisco). La mayoría del relevamiento ya estaba cubierta. Definiciones: (1) **cotizador automático por scraping** y detección de ofertas → **fuera de alcance PC1** ([[Alcance y fuera de alcance]]); el cotizador queda asistido ([[CU-06 Emitir cotización]]). (2) Del "detector de oportunidades" se conserva un **CRM proactivo** acotado → nuevo **[[CU-30 Sugerir recontacto de clientes]]** (clientes fieles inactivos, con opt-out `no_recontactar` en [[Cliente]] y tipo `recontacto` en [[Alerta]]). (3) **Vencimiento de pago a proveedor por hotel** → modelado en `viaje_hotel` ([[DEC-0003 Relación Viaje–Hotel y Reseña]]) con [[Alerta]] un mes antes; nota en [[CU-09 Armar itinerario de hoteles]]. (4) **% pagado / checklist** reflejado en [[CU-12 Registrar cobro de un pago]]. Total ahora **30 CU**.
- 11/09/26 — **Revisión cruzada de los CU de Paloma y Nahuel** (Francisco). Se resolvió el **modelo de visibilidad** en [[DEC-0005 Autenticación y modelo de roles]]: *lectura global + propiedad para organización* (`Cliente`/`Oportunidad`/`Viaje`/`Pago` legibles por toda la agencia con vista personal; `Alerta` personal; catálogo compartido; config/moderación = `admin`). Se agregó la 12ª entidad **[[RequisitoDestino]]** (cierra el gap de modelado de [[CU-15 Configurar recordatorios por destino]], cuyo actor pasa a `admin`). Se alinearon [[CU-02 Registrar cliente|CU-02]], [[CU-03 Gestionar ficha del cliente|CU-03]], [[CU-17 Registrar reseña de hotel|CU-17]], [[CU-24 Iniciar sesión|CU-24]], [[CU-14 Ver y atender alertas del día|CU-14]], [[CU-10 Registrar economía del viaje|CU-10]] (A4 rebalanceo) y [[CU-11 Definir plan de cuotas|CU-11]] (A5). Todo queda **a ratificar en la sync con Paloma y Nahuel**.
- 10/09/26 — Revisión de cobertura **ABM** de las entidades: se cubren gaps de ciclo de vida con **[[CU-27 Cancelar viaje]]** (Francisco; estado `cancelado`), **[[CU-28 Crear recordatorio manual]]** (Nahuel; tipo `manual`), **[[CU-29 Eliminar reseña]]** (Paloma; estado `oculta`) y anulación de un [[Pago]] (flujo alt. en [[CU-11 Definir plan de cuotas]]). CU-27 y CU-29 quedan como **borradores a validar por sus dueños**.
- 10/09/26 — Nahuel especifica sus **8 CU** (economía/pagos CU-10→13, alertas CU-14/15, seguridad CU-24/25), agrega **[[CU-26 Gestionar destinos]]** (ABM, admin/dueño) y promueve **[[Destino]]** a entidad (11ª): [[DEC-0006 Destino como entidad de catálogo]] con FK en [[Viaje]] y [[Hotel]]. Comisión = `%` por defecto de empresa + override por viaje.
- 10/09/26 — Paloma especifica sus **8 CU** (Clientes, Hoteles, Redes, Calendario) y ajusta el dominio: [[Hotel]] (+`precio_referencia`, `servicios`, `estado`) y [[ContenidoRed]] (canales y rol). Detalle en [[Bitácora de sesiones]].
- 10/09/26 — Se define el catálogo completo de casos de uso (24 CU + núcleo) con diagrama y se reparte la especificación entre los tres. Ver [[MOC — Casos de uso]] y [[Especificación de casos de uso — flujo]]. Nuevo flujo md-fuente / docx-derivado y sección [[Entregables — índice]].
- 10/09/26 — Francisco resuelve (en revisión, ratificar en sync): [[DEC-0003 Relación Viaje–Hotel y Reseña]] (N:M + Reseña sobre Hotel), [[DEC-0004 Comisión configurable por porcentaje]] y [[DEC-0005 Autenticación y modelo de roles]]. Confirma además el stack de [[DEC-0001 Stack tecnológico]].
- 09/09/26 — Se adopta Claude como agente de IA (unánime). Se crea el vault y sus convenciones. Ver [[Guía del Vault]].
- 09/09/26 — Nahuel propone el stack técnico completo: FastAPI/PostgreSQL/LangChain, React y React Native, monorepo TypeScript/Python y pipeline de calidad. Queda en revisión en [[DEC-0001 Stack tecnológico]].

## Definido y sellado en la sync 11/09
Acordado por el equipo (Francisco + Nahuel presentes; Paloma notificada por Git):
- **DEC selladas** (`formalizado`, 11/09): [[DEC-0001 Stack tecnológico|DEC-0001]], [[DEC-0003 Relación Viaje–Hotel y Reseña|DEC-0003]], [[DEC-0004 Comisión configurable por porcentaje|DEC-0004]] (⚠️ sujeta a la respuesta de la agencia sobre la base de comisión), [[DEC-0005 Autenticación y modelo de roles|DEC-0005]] (el mecanismo de auth sigue abierto) y [[DEC-0006 Destino como entidad de catálogo|DEC-0006]].
- **Modelo de visibilidad** (lectura global + propiedad; Alerta personal) — DEC-0005.
- **12ª entidad [[RequisitoDestino]]** (con `tipo`, `obligatorio`, `descripcion`) + atributos de propiedad y del CRM/pagos.
- **Baja de [[Hotel]]**: **siempre lógica** (`estado = cerrado`); nunca se elimina físicamente.
- **[[CU-29 Eliminar reseña]]**: actor `admin`, baja lógica (`oculta`).
- **Estados**: [[Oportunidad]] `nueva · en_gestión · cotizada · ganada · perdida`; [[Viaje]] `reservado → vendido → confirmado → en curso → finalizado` (+`cancelado`), con `vendido`=seña y `confirmado`=total pagado (dispara [[CU-12 Registrar cobro de un pago]]). Motivo de pérdida de lista fija ([[CU-05 Seguir oportunidad]]).
- **Alcance**: cotizador por scraping fuera de PC1; CRM proactivo y vto. a proveedor incluidos.
- **`Oportunidad.destino`**: texto libre; se normaliza a [[Destino]] al derivar en [[Viaje]] (DEC-0006).

## Preguntas para la AGENCIA — ✅ RESPONDIDAS (17/09, las trajo Francisco)
Registro completo en [[Relevamiento — respuestas de la agencia (17-09)]]. Las DEC/CU derivadas quedaron **ratificadas en la sync 17/09**:
- ✅ **Comisión vs. margen**: ganancia = venta − costo; margen % **sobre venta**; comisión de vendedor aparte; multimoneda → **supersede [[DEC-0004 Comisión configurable por porcentaje]]** vía **[[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]** (`formalizada` 17/09).
- ✅ **KPIs del dashboard** y **catálogo de reportes** (Excel principal + PDF) → [[CU-21 Ver dashboard y embudo]], [[CU-22 Generar reportes y estadísticas]].
- ✅ **Criterio del CRM proactivo**: ≈ 6 meses; recurrentes ≥ 2 viajes; + **segmentación** → [[CU-30 Sugerir recontacto de clientes]], [[Cliente]].
- ✅ **WhatsApp**: fase 1 manual (aviso interno); automatización configurable **fuera de PC1**.
- ✅ **Autenticación**: usuario/contraseña individual + auditoría (`created_by`/`updated_by`); rol **freelance** (visibilidad restringida) → **[[DEC-0008 Autenticación propia y rol de vendedor freelance]]** (`formalizada` 17/09, amplía [[DEC-0005 Autenticación y modelo de roles]]).

## Definido y sellado en la sync 17/09
Acordado por el equipo (Francisco, Nahuel y Paloma presentes):
- **DEC selladas** (`formalizado`, 17/09): [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]] (supersede DEC-0004), [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]] (amplía DEC-0005) y [[DEC-0009 Operador-Proveedor como entidad de catálogo|DEC-0009]]. **[[DEC-0004 Comisión configurable por porcentaje|DEC-0004]] → `obsoleto`.**
- **Modelo económico:** `ganancia = precioVenta − costo`; `margen% = ganancia / precioVenta` (**sobre venta**); **comisión del vendedor** aparte (importe o %, el % sobre la ganancia, default por vendedor + override); **multimoneda ARS/USD** con cotización manual por operación en PC1.
- **13ª entidad [[Operador]]** (catálogo con ABM; `Viaje` gana FK `operador`), con su caso de uso **[[CU-31 Gestionar operadores]]** (ABM, actor admin/dueño, baja lógica).
- **Autenticación:** usuario/contraseña individual + auditoría (`created_by`/`updated_by`); Google OAuth opcional/futuro.
- **Rol `freelance`:** ve solo lo suyo; ve catálogo compartido; crea clientes que quedan como suyos; ve solo sus comisiones. Dashboard: `admin`/`dueño` = empresa; `empleado`/`freelance` = lo suyo.
- **CRM:** recontacto a ≈ **6 meses** (configurable), prioriza recurrentes (≥ 2 viajes); **segmentación** por **etiquetas libres** en [[Cliente]].
- **Pendiente fino (no bloquea PC1):** ✅ enums de `forma_pago` ([[Pago]]) y `Alerta.tipo` cerrados 18/09 (Nahuel) — ambos como **borrador a ratificar** en la próxima sync (`forma_pago` es propuesta sin dato del relevamiento; `Alerta.tipo` sumó `salida` con anticipación 7 días sin validar). Consolidación multimoneda de reportes sigue de fase posterior.

## Pendientes técnicos
- **Mecanismo de autenticación** → ✅ **resuelto y sellado** (usuario/contraseña individual + auditoría) en [[DEC-0008 Autenticación propia y rol de vendedor freelance]] (sync 17/09).
- **Infraestructura de despliegue** → [[ARQ — Vista general]]. El servidor on-premise es una alternativa pendiente.
