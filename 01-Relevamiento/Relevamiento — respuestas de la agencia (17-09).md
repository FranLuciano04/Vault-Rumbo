---
tipo: referencia
estado: formalizado
responsable: Francisco
pc: pc1
actualizado: 17/09/26
---
# Relevamiento — respuestas de la agencia (17/09)

tags:: #tipo/referencia #estado/formalizado #pc/pc1

> **2ª ronda de relevamiento.** Respuestas de la agencia (Valentina) a las [[Estado del proyecto#Preguntas para la AGENCIA — las lleva Francisco a Valentina|preguntas abiertas]], traídas por **Francisco** el 17/09/26. Es **fuente de verdad del negocio** (orden de autoridad #1): si el dominio o una `DEC-` la contradice, manda esto y se abre/actualiza una `DEC-`.
>
> ⚠️ El **registro** de lo que pidió la agencia es autoritativo; las **decisiones derivadas** (`DEC-0007`, `DEC-0008`, actualizaciones de CU/entidades) quedan **`en-revision`** hasta ratificarse en la sync.

## 1. Comisión / ganancia 💰
La agencia distingue **tres conceptos**:
- **Ganancia de la agencia:** diferencia entre el **precio de venta** del viaje y el **costo del operador/proveedor**.
- **Comisión / rentabilidad (margen):** cuánto representa esa ganancia, tanto en **importe (pesos/dólares)** como en **porcentaje**.
- **Comisión del vendedor/freelancer:** se registra **por separado**; hay vendedores externos y se necesita saber **qué vendió cada uno y cuánto corresponde pagarle**.

La ganancia **no es un porcentaje fijo**: varía según viaje, operador, producto o negociación. Cada operación debe permitir cargar a mano **precio de venta, costo, moneda y comisión del vendedor**, y el sistema **calcula automáticamente la ganancia y el margen**.

→ Reabre y supersede [[DEC-0004 Comisión configurable por porcentaje]] mediante [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]. Impacta [[Viaje]], [[Pago]], [[RN-01 Comisión automática]], [[CU-10 Registrar economía del viaje]], [[CU-13 Configurar porcentaje de comisión]].

## 2. Tablero del día / Dashboard 📊
Panorama general al entrar, principalmente:
- Ventas del mes y **comparación con meses anteriores**.
- Ganancia estimada del mes.
- Total **cobrado** y total **pendiente de cobrar** a pasajeros.
- Total **pendiente de pagar** a operadores/proveedores.
- Próximos **vencimientos de pagos**.
- Cantidad de **pasajeros/viajes próximos a salir**.
- Consultas o presupuestos **pendientes de seguimiento**.
- **Reservas confirmadas** y **presupuestos abiertos**.
- **Alertas** de pasajeros próximos a viajar: documentación, pagos, requisitos de ingreso, etc.

También: **destinos más vendidos**, **cantidad de pasajeros por destino**, **ticket promedio** y **ventas por vendedor/freelancer**.

→ Resuelve los KPIs de [[CU-21 Ver dashboard y embudo]].

## 3. Reportes mensuales 📅
Reportes de:
- Ventas totales del mes.
- Ganancia / rentabilidad.
- Cobrado vs. pendiente de cobro.
- Pagos realizados y pendientes a operadores.
- Ventas por destino.
- Ventas por operador/proveedor.
- Ventas por vendedor/freelancer y **sus comisiones**.
- Cantidad de pasajeros.
- **Formas de pago** utilizadas.
- Comparación con meses anteriores.

**Formato:** principalmente **Excel** (para trabajar la información), con opción de **PDF resumido** para visualizar o compartir.

→ Resuelve el catálogo y el formato de [[CU-22 Generar reportes y estadísticas]].

## 4. Recontacto de clientes 🔁
El sistema debe avisar cuando un cliente lleva **≈ 6 meses** sin realizar una nueva compra/viaje.
- Aplica a **todos** los clientes, pero identificando especialmente a los **recurrentes** (≥ **2 viajes** con la agencia).
- Además, poder **generar segmentos** para acciones comerciales personalizadas: p. ej. clientes que viajaron a **Brasil, Caribe, Europa, cruceros, viajes nacionales, familias, parejas**, etc.

→ Fija el criterio de [[CU-30 Sugerir recontacto de clientes]] (6 meses; recurrentes ≥ 2 viajes) y agrega **segmentación comercial** de [[Cliente]].

## 5. Avisos a los clientes 📱
**Primera etapa:** el sistema **genera el aviso internamente** y la persona decide cuándo escribirle al pasajero por WhatsApp (envío **manual**).

Recordatorios de interés:
- Vencimientos de pagos.
- Documentación pendiente.
- Próximas salidas.
- Requisitos particulares del destino.
- Formularios migratorios (p. ej. **eTicket de República Dominicana**).
- Seguros / asistencia al viajero.
- Vouchers o documentación aún no entregada.

**A futuro:** automatizar ciertos mensajes por WhatsApp, pero **configurable y no obligatorio** (fuera de PC1).

→ Confirma WhatsApp automático **fuera de alcance PC1**. Impacta el enum `tipo` de [[Alerta]], [[RequisitoDestino]] y [[CU-14 Ver y atender alertas del día]] / [[CU-15 Configurar recordatorios por destino]] / [[CU-28 Crear recordatorio manual]].

## 6. Ingreso al sistema 🔐
- **Usuario y contraseña individual** para cada persona, para **identificar quién realizó cada acción** dentro del CRM (auditoría).
- **Permisos diferenciados** por usuario: administrador/dueños, empleados y **vendedores freelance**. Un **freelancer** accede **solo a sus propias operaciones y clientes**, no necesariamente a toda la información de la agencia.

→ Resuelve el mecanismo de autenticación pendiente en [[DEC-0005 Autenticación y modelo de roles]] y agrega el rol `freelance` mediante [[DEC-0008 Autenticación propia y rol de vendedor freelance]].

## Trazabilidad de las respuestas
| Pregunta abierta (Estado del proyecto) | Respuesta | Deriva en |
|---|---|---|
| Comisión vs. margen y base de cálculo | Ganancia = venta − costo; margen en $ y %; comisión de vendedor aparte; multimoneda | [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (supersede [[DEC-0004 Comisión configurable por porcentaje]]) |
| KPIs del dashboard | Lista concreta (bloque 2) | [[CU-21 Ver dashboard y embudo]] |
| Catálogo de reportes | Lista concreta + Excel principal / PDF secundario | [[CU-22 Generar reportes y estadísticas]] |
| Criterio del CRM proactivo | ≈ 6 meses; recurrentes ≥ 2 viajes; + segmentación | [[CU-30 Sugerir recontacto de clientes]], [[Cliente]] |
| WhatsApp API | Fase 1 manual (aviso interno); automatización configurable a futuro | [[Alerta]], [[Alcance y fuera de alcance]] |
| Mecanismo de autenticación | Usuario/contraseña individual + auditoría; rol freelance con visibilidad restringida | [[DEC-0008 Autenticación propia y rol de vendedor freelance]] (amplía [[DEC-0005 Autenticación y modelo de roles]]) |

## Fuente
- Relevamiento crudo traído por **Francisco** (agencia: Valentina), 17/09/26. Complementa a [[Relevamiento — Fuente de verdad]].
