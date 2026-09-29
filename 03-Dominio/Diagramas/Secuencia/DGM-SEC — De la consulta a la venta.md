---
tipo: diagrama
estado: formalizado
modulo: [clientes, cotizaciones, viajes, economia, alertas, hoteles]
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# DGM-SEC — De la consulta a la venta

tags:: #tipo/diagrama #estado/formalizado #pc/pc1

## Qué representa
El flujo **end-to-end** del negocio en el tiempo: desde que llega la consulta hasta que el viaje queda cobrado y el hotel sumado al catálogo, mostrando quién hace cada cosa y qué resuelve el sistema por su cuenta. Es la vista de secuencia de [[CU-01 De la consulta a la venta]], y entra en el entregable de relevamiento.

Notas de origen: [[CU-01 De la consulta a la venta]] · [[Actores]] · [[CU-04 Registrar consulta]] · [[CU-06 Emitir cotización]] · [[CU-07 Confirmar reserva]] · [[CU-10 Registrar economía del viaje]] · [[CU-11 Definir plan de cuotas]] · [[CU-12 Registrar cobro de un pago]] · [[CU-17 Registrar reseña de hotel]] · [[RN-01 Comisión automática]]

## Diagrama
```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial, sans-serif','fontSize':'15px','primaryColor':'#e2e8f0','primaryTextColor':'#0f172a','primaryBorderColor':'#475569','lineColor':'#475569','actorBkg':'#e2e8f0','actorBorder':'#475569','actorTextColor':'#0f172a','signalColor':'#334155','signalTextColor':'#0f172a','noteBkgColor':'#fef3c7','noteBorderColor':'#d97706','noteTextColor':'#0f172a','sequenceNumberColor':'#ffffff'}}}%%
sequenceDiagram
    autonumber
    actor C as Cliente
    actor E as Empleado
    participant R as Sistema Rumbo

    C->>E: Consulta por Instagram, WhatsApp o presencial<br/>(destino, fechas, pasajeros)
    E->>R: Registra la consulta y la ficha del cliente
    R-->>E: Oportunidad creada en estado "nueva"
    Note over R: Al empezar a atenderla,<br/>la oportunidad pasa a "en gestión"

    E->>R: Genera la cotización (plantilla, ítems, moneda)
    R-->>E: Documento de cotización y fecha de vigencia
    E->>C: Envía la cotización
    R-->>E: Oportunidad en estado "cotizada"
    Note over R: Si el cliente no responde,<br/>el sistema agenda una insistencia

    C->>E: Acepta la propuesta
    E->>R: Confirma la reserva
    R-->>E: Viaje creado en estado "reservado"<br/>y oportunidad cerrada como "ganada"

    E->>R: Carga la economía: precio de venta,<br/>costo del operador, moneda y comisión del vendedor
    R-->>E: Calcula la ganancia y el margen
    E->>R: Define el plan de cuotas con sus vencimientos
    Note over R: Genera las alertas de vencimiento,<br/>de requisitos del destino y de próxima salida

    E->>R: Registra el cobro de la seña
    R-->>E: El viaje pasa a "vendido"
    E->>R: Registra el cobro del saldo
    R-->>E: El viaje pasa a "confirmado"
    Note over R: El viaje figura en el calendario<br/>con el seguimiento del % pagado

    Note over E,R: El viaje transcurre: "en curso" y luego "finalizado"
    R-->>E: Alerta de reseña post-viaje
    E->>C: Solicita la reseña del hotel
    C->>E: Deja su reseña
    E->>R: Registra la reseña y consolida el hotel en el catálogo
```

## Convenciones del diagrama
- **Actores y roles vigentes:** el usuario operativo es el **empleado** ([[Actores]]); el **Cliente** es actor externo y no opera el sistema. Los roles `admin`, `dueño` y `freelance` no participan de este flujo.
- **Modelo económico vigente:** el empleado carga precio de venta, costo del operador, moneda y **comisión del vendedor**; el sistema calcula **ganancia y margen** ([[RN-01 Comisión automática]]). No aparece el concepto de "comisión automática sobre la venta" del modelo anterior.
- **Estados explícitos:** las respuestas del sistema nombran el estado resultante de [[Oportunidad]] y [[Viaje]], para poder cruzar el diagrama con [[EST-Oportunidad]] y [[EST-Viaje]].
- **Notas ámbar = acciones automáticas** del sistema, sin intervención de una persona.
- **Numeración automática** (`autonumber`) para poder referenciar un paso puntual en la discusión.
- Motor de layout propio de `sequenceDiagram`: **ELK no aplica** a este tipo de diagrama, a diferencia de [[DGM — Diagrama de clases]], [[DGM-ER]] y los `EST-*`.

## Cómo mantenerlo
- **Source → output:** la verdad vive en [[CU-01 De la consulta a la venta]] y en los CU atómicos que compone. Si cambia un flujo, se actualiza el CU y después este diagrama.
- **Un solo editor a la vez** (el bloque Mermaid es indivisible). Ver [[Guía del Vault#3 · Workflow colaborativo]].
- Al entregar, se renderiza a PNG con `mermaid-cli` y se incrusta en el entregable de relevamiento; ver [[Entregables — índice]].
