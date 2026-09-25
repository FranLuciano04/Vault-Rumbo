---
tipo: diagrama
estado: borrador
modulo: [economia, viajes, alertas]
responsable: Nahuel
pc: pc1
actualizado: 25/09/26
---
# DGM-SEC — Registrar cobro de un pago

tags:: #tipo/diagrama #estado/borrador #pc/pc1 #accion/revisar

## Qué representa
El **diagrama de secuencia** de [[CU-12 Registrar cobro de un pago]]: los mensajes entre el empleado y las clases del sistema al registrar un cobro, resolver la alerta de vencimiento y avanzar el [[Viaje]] a `vendido` o `confirmado` según corresponda. Incluye como continuación cronológica (no como rama) la corrección de un cobro mal registrado (A3). Vista de secuencia **de análisis** (clases como participantes), complementaria de [[DGM-ACT — Registrar cobro de un pago]] (mismo CU, notación de actividad).

Notas de origen: [[CU-12 Registrar cobro de un pago]] · [[CU-08 Gestionar estado del viaje]] · [[Pago]] · [[EST-Pago]] · [[EST-Viaje]] · [[EST-Alerta]] · [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] · [[DEC-0010 Notación de los diagramas de actividad y de secuencia]]

## Diagrama
```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial, sans-serif','fontSize':'15px','primaryColor':'#e2e8f0','primaryTextColor':'#0f172a','primaryBorderColor':'#475569','lineColor':'#475569','actorBkg':'#e2e8f0','actorBorder':'#475569','actorTextColor':'#0f172a','signalColor':'#334155','signalTextColor':'#0f172a','noteBkgColor':'#fef3c7','noteBorderColor':'#d97706','noteTextColor':'#0f172a','sequenceNumberColor':'#ffffff'}}}%%
sequenceDiagram
    autonumber
    actor E as Empleado
    participant S as "Sistema Rumbo <<control>>"
    participant P as "Pago <<entity>>"
    participant A as "Alerta <<entity>>"
    participant V as "Viaje <<entity>>"
    participant BD as "Base de Datos <<database>>"

    Note over E: Paso 1 · Ubicar el pago
    E->>S: Abre el Viaje y ubica el Pago a cobrar
    S->>P: Busca el Pago pendiente o vencido
    P->>BD: Busca el Pago
    BD-->>P: datos del Pago
    P-->>S: Pago encontrado

    Note over E: Paso 2 · Registrar el cobro
    E->>S: Carga fecha efectiva, forma de pago y moneda del cobro
    alt moneda del cobro ≠ moneda del viaje
        E->>S: Carga el tipo de cambio del día
    end
    Note over S: Calcula el monto cobrado real

    Note over S,P: Paso 3 · Marcar el pago como pagado
    alt estaba pendiente
        S->>P: Marca el Pago como pagado
        P->>BD: Guarda el Pago
        BD-->>P: OK
        P-->>S: pagado (EST-Pago T2)
    else estaba vencido · A1
        S->>P: Marca el Pago como pagado
        P->>BD: Guarda el Pago
        BD-->>P: OK
        P-->>S: pagado (EST-Pago T4)
    end

    Note over S,A: Paso 4 · Cerrar la alerta
    S->>A: Resuelve la alerta de vencimiento del pago
    A->>BD: Guarda la Alerta
    BD-->>A: OK
    A-->>S: resuelta (EST-Alerta T5)

    Note over S,V: Paso 5 · Actualizar el saldo
    S->>V: Actualiza saldo pendiente, % pagado y checklist
    V->>BD: Guarda el saldo del Viaje
    BD-->>V: OK
    V-->>S: saldo actualizado
    alt era la seña y el viaje estaba reservado · A0
        S->>V: Cambia el estado del viaje
        V->>BD: Guarda el Viaje
        BD-->>V: OK
        V-->>S: vendido (EST-Viaje T2)
    end
    alt saldo en cero y viaje vendido · A2
        S->>V: Cambia el estado del viaje
        V->>BD: Guarda el Viaje
        BD-->>V: OK
        V-->>S: confirmado (EST-Viaje T3)
    end

    Note over E,V: A3 · Corregir un cobro mal registrado (flujo aparte, ocurre en otro momento)
    E->>S: Revierte el cobro
    S->>P: Cambia el estado del Pago según su fecha
    P->>BD: Guarda el Pago
    BD-->>P: OK
    P-->>S: pendiente o vencido (EST-Pago T6)
    S->>A: Reabre la alerta del pago
    A->>BD: Guarda la Alerta
    BD-->>A: OK
    A-->>S: pendiente (EST-Alerta T6)
    alt el viaje estaba confirmado
        S->>V: Cambia el estado del viaje
        V->>BD: Guarda el Viaje
        BD-->>V: OK
        V-->>S: vendido (EST-Viaje T8)
    end
```

## Trazabilidad con el caso de uso
Cada `Note over` marca **un paso del camino principal** de [[CU-12 Registrar cobro de un pago]], en el mismo orden que [[DGM-ACT — Registrar cobro de un pago]].

| Paso de CU-12 | Marco del diagrama | Mensajes clave | Estados que cambia |
|---|---|---|---|
| 1 · Ubicar el pago | Paso 1 | `E->>S` · `S->>P` (busca en BD) | — |
| 2 · Registrar el cobro (fecha, forma de pago, moneda, tipo de cambio) | Paso 2 | `E->>S` ×2 | — |
| 3 · Marcar el pago como pagado | Paso 3 | `S->>P` (guarda en BD) | [[EST-Pago]] T2 o T4 |
| 4 · Resolver la alerta del pago | Paso 4 | `S->>A` (guarda en BD) | [[EST-Alerta]] T5 |
| 5 · Actualizar saldo, % pagado y checklist | Paso 5 | `S->>V` (guarda en BD) | [[EST-Viaje]] T2, T3 |

| Flujo alternativo | Dónde está |
|---|---|
| **A0** · Cobro de la seña | Paso 5: `alt era la seña y el viaje estaba reservado` |
| **A1** · Pago vencido | Paso 3: rama `else estaba vencido` |
| **A2** · Último pago, viaje saldado | Paso 5: `alt saldo en cero y viaje vendido` |
| **A3** · Corregir el cobro | Continuación cronológica al final, sin rama · [[EST-Pago]] T6 · [[EST-Alerta]] T6 · [[EST-Viaje]] T8 |

## Convenciones del diagrama
Ver [[DEC-0010 Notación de los diagramas de actividad y de secuencia]] y [[DGM-SEC — Confirmar reserva#Convenciones del diagrama]] (mismas reglas, incluida la **Base de Datos** como participante final: toda búsqueda o guardado de una entidad tiene su ida y vuelta con `BD`).
- **Flujo aparte (A3):** a diferencia de [[DGM-ACT — Registrar cobro de un pago]] (que necesita un nodo inicial separado por el layout de `flowchart`), en `sequenceDiagram` alcanza con dibujarlo **más abajo**, con un `Note` que lo anuncia: la secuencia ya es cronológica de arriba a abajo.

## Cómo mantenerlo
- **Source → output:** la verdad vive en [[CU-12 Registrar cobro de un pago]]. Si cambia el camino principal o un flujo alternativo, se actualiza primero la fuente y después este diagrama.
- **PNG:** `bash "07-Entregables/build/render-diagramas-secuencia.sh"` lo regenera en `img/`.
- **Un solo editor a la vez** (el bloque Mermaid es indivisible). Ver [[Guía del Vault#3 · Workflow colaborativo]].

## 🔎 Revisión
> [!warning] Mismos huecos que [[DGM-ACT — Registrar cobro de un pago#🔎 Revisión]] (no se resolvieron; se dibujó lo que dice el CU): revertir el cobro de la seña deja el viaje `vendido` sin seña; un plan sin seña nunca hace que el viaje pase a `vendido`; el enum `forma_pago` del CU no coincide con el de [[Pago]]; los cobros parciales no están contemplados. #accion/decidir
