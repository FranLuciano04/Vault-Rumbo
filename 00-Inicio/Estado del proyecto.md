---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 09/09/26
---

# 📊 Estado del proyecto

> Memoria externa del equipo (y de Claude). Se actualiza en cada **sync semanal**. Es lo primero que se lee al retomar. Mantener **corto**.

## Fase actual
**Análisis y diseño → rumbo a PC1 (23/10/26).** En curso: especificación de los casos de uso (repartida, ver [[MOC — Casos de uso]]). Próximo: diagrama de clases, ER, actividad, arquitectura y prototipo UI.

## Roles de esta quincena
- **Coordinador de vault:** _(a asignar)_
- **Guardián del dominio:** _(a asignar)_
- **Escriba de decisiones:** _(a asignar)_

## Checklist PC1 — modelo UML completo
> Herramientas: **diagramas UML en Mermaid** (versionable) · **prototipo UI en Figma** (MCP), con link + PNGs en [[Entregables — índice|07-Entregables]].

### Obligatorio (piso del cronograma)
- [ ] `01-Relevamiento/` formalizado
- [ ] [[Actores]] formalizados (empleado, admin, dueño, cliente)
- [ ] Especificación de los 30 CU + [[DGM — Casos de uso|diagrama de casos de uso]]
- [ ] 12 entidades formalizadas (Usuario, Cliente, Oportunidad, Viaje, Pago, Hotel, Reseña, Alerta, Cotización, ContenidoRed, Destino, RequisitoDestino ⚠️nueva)
- [ ] [[MOC — Modelo de dominio|Diagrama de clases]] + [[DGM-ER]] coherentes (atributos, tipos, multiplicidades)
- [ ] Diagramas de **actividad** de flujos clave ([[CU-01 De la consulta a la venta|CU-01]] + críticos)
- [ ] [[ARQ — Vista general]] formalizada
- [ ] DEC estructurales registradas y **ratificadas** (DEC-0001→0005)
- [ ] Prototipo UI de pantallas clave (Figma)

### Recomendado (buenas prácticas — refuerzan el modelo)
- [ ] Diagramas de **secuencia** de CU clave (consulta→cotización→reserva, registrar pago)
- [ ] Diagramas de **estado**: `Viaje`, `Oportunidad`, `Pago`
- [ ] **Matriz de trazabilidad** (objetivo → CU → entidad → regla)
- [ ] Catálogo de **reglas de negocio** ampliado (hoy solo [[RN-01 Comisión automática]])

> Cierre PC1: la consulta `#pc/pc1 AND #estado/borrador` debe dar **cero** en lo obligatorio de arriba.

## Bitácora de decisiones recientes
- 11/09/26 — **Cruce del relevamiento en crudo** (Francisco). La mayoría del relevamiento ya estaba cubierta. Definiciones: (1) **cotizador automático por scraping** y detección de ofertas → **fuera de alcance PC1** ([[Alcance y fuera de alcance]]); el cotizador queda asistido ([[CU-06 Emitir cotización]]). (2) Del "detector de oportunidades" se conserva un **CRM proactivo** acotado → nuevo **[[CU-30 Sugerir recontacto de clientes]]** (clientes fieles inactivos, con opt-out `no_recontactar` en [[Cliente]] y tipo `recontacto` en [[Alerta]]). (3) **Vencimiento de pago a proveedor por hotel** → modelado en `viaje_hotel` ([[DEC-0003 Relación Viaje–Hotel y Reseña]]) con [[Alerta]] un mes antes; nota en [[CU-09 Armar itinerario de hoteles]]. (4) **% pagado / checklist** reflejado en [[CU-12 Registrar cobro de un pago]]. Total ahora **30 CU**.
- 11/09/26 — **Revisión cruzada de los CU de Paloma y Nahuel** (Francisco). Se resolvió el **modelo de visibilidad** en [[DEC-0005 Autenticación y modelo de roles]]: *lectura global + propiedad para organización* (`Cliente`/`Oportunidad`/`Viaje`/`Pago` legibles por toda la agencia con vista personal; `Alerta` personal; catálogo compartido; config/moderación = `admin`). Se agregó la 12ª entidad **[[RequisitoDestino]]** (cierra el gap de modelado de [[CU-15 Configurar recordatorios por destino]], cuyo actor pasa a `admin`). Se alinearon [[CU-02 Registrar cliente|CU-02]], [[CU-03 Gestionar ficha del cliente|CU-03]], [[CU-17 Registrar reseña de hotel|CU-17]], [[CU-24 Iniciar sesión|CU-24]], [[CU-14 Ver y atender alertas del día|CU-14]], [[CU-10 Registrar economía del viaje|CU-10]] (A4 rebalanceo) y [[CU-11 Definir plan de cuotas|CU-11]] (A5). Todo queda **a ratificar en la sync con Paloma y Nahuel**.
- 10/09/26 — Revisión de cobertura **ABM** de las entidades: se cubren gaps de ciclo de vida con **[[CU-27 Cancelar viaje]]** (Francisco; estado `cancelado`), **[[CU-28 Crear recordatorio manual]]** (Nahuel; tipo `manual`), **[[CU-29 Eliminar reseña]]** (Paloma; estado `oculta`) y anulación de un [[Pago]] (flujo alt. en [[CU-11 Definir plan de cuotas]]). CU-27 y CU-29 quedan como **borradores a validar por sus dueños**.
- 10/09/26 — Nahuel especifica sus **8 CU** (economía/pagos CU-10→13, alertas CU-14/15, seguridad CU-24/25), agrega **[[CU-26 Gestionar destinos]]** (ABM, admin/dueño) y promueve **[[Destino]]** a entidad (11ª): [[DEC-0006 Destino como entidad de catálogo]] con FK en [[Viaje]] y [[Hotel]]. Comisión = `%` por defecto de empresa + override por viaje.
- 10/09/26 — Paloma especifica sus **8 CU** (Clientes, Hoteles, Redes, Calendario) y ajusta el dominio: [[Hotel]] (+`precio_referencia`, `servicios`, `estado`) y [[ContenidoRed]] (canales y rol). Detalle en [[Bitácora de sesiones]].
- 10/09/26 — Se define el catálogo completo de casos de uso (24 CU + núcleo) con diagrama y se reparte la especificación entre los tres. Ver [[MOC — Casos de uso]] y [[Especificación de casos de uso — flujo]]. Nuevo flujo md-fuente / docx-derivado y sección [[Entregables — índice]].
- 10/09/26 — Francisco resuelve (en revisión, ratificar en sync): [[DEC-0003 Relación Viaje–Hotel y Reseña]] (N:M + Reseña sobre Hotel), [[DEC-0004 Comisión configurable por porcentaje]] y [[DEC-0005 Autenticación y modelo de roles]]. Confirma además el stack de [[DEC-0001 Stack tecnológico]].
- 09/09/26 — Se adopta Claude como agente de IA (unánime). Se crea el vault y sus convenciones. Ver [[Guía del Vault]].
- 09/09/26 — Nahuel propone el stack técnico completo: FastAPI/PostgreSQL/LangChain, React y React Native, monorepo TypeScript/Python y pipeline de calidad. Queda en revisión en [[DEC-0001 Stack tecnológico]].

## Bloqueos / a decidir
- **Modelo de visibilidad** (Cliente/Oportunidad/Viaje/Pago legibles por toda la agencia + propiedad para vista personal; Alerta personal) → **propuesta resuelta 11/09** en [[DEC-0005 Autenticación y modelo de roles]], **ratificar en sync** con Paloma y Nahuel.
- **[[RequisitoDestino]] (12ª entidad)** → nueva, en `borrador`; ratificar con Nahuel (¿entidad o elevar a `DEC-`?).
- **Pregunta de negocio — comisión vs. margen** (qué representa la `comisión` y sobre qué base se calcula) → Francisco lo consulta con la agencia; impacta [[RN-01 Comisión automática]] y [[DEC-0004 Comisión configurable por porcentaje]]. Ver [[CU-10 Registrar economía del viaje]].
- **Envío de recordatorios al cliente** (posible CU faltante): sería por **WhatsApp vía API**, a definir más adelante (hoy Rumbo solo agenda la [[Alerta]] interna). Confirmar alcance PC1.
- **Atributo `estado` y baja de [[Hotel]]** (marcar `cerrado` vs eliminar cuando hay historial) → ratificar en la sync.
- **[[Destino]] como entidad** ([[DEC-0006 Destino como entidad de catálogo]]): ratificar el impacto en [[Hotel]] (Paloma) y definir si `Oportunidad.destino` se normaliza o queda texto libre.
- **Mecanismo de autenticación** (propia y/o Google OAuth) → [[DEC-0005 Autenticación y modelo de roles]].
- **Infraestructura de despliegue** → [[ARQ — Vista general]]. El servidor on-premise es una alternativa pendiente.
- **Ratificar en la sync** DEC-0003, DEC-0004, DEC-0005 y formalizar DEC-0001.
