---
tipo: diagrama
estado: borrador
modulo: [clientes, cotizaciones, viajes, economia, alertas, hoteles]
responsable: Nahuel
pc: pc1
actualizado: 25/09/26
---
# DGM-ACT — De la consulta a la venta

tags:: #tipo/diagrama #estado/borrador #pc/pc1 #accion/revisar

## Qué representa
El **flujo de actividad** de [[CU-01 De la consulta a la venta]]: los seis pasos de su camino principal, en orden, con las decisiones y repeticiones que lo desvían (el cliente no responde, desiste, paga en cuotas, el destino tiene requisitos). Complementa a [[DGM-SEC — De la consulta a la venta]], que muestra solo el camino feliz en el tiempo: acá el foco está en **dónde se bifurca el flujo y por qué**.

Notas de origen: [[CU-01 De la consulta a la venta]] · [[CU-02 Registrar cliente]] · [[CU-04 Registrar consulta]] · [[CU-05 Seguir oportunidad]] · [[CU-06 Emitir cotización]] · [[CU-07 Confirmar reserva]] · [[CU-10 Registrar economía del viaje]] · [[CU-11 Definir plan de cuotas]] · [[CU-12 Registrar cobro de un pago]] · [[CU-17 Registrar reseña de hotel]] · [[EST-Oportunidad]] · [[EST-Cotización]] · [[EST-Viaje]] · [[EST-Pago]]

## Diagrama
```mermaid
%%{init: {'theme':'base','themeVariables':{'fontFamily':'Segoe UI, Arial, sans-serif','fontSize':'15px','primaryColor':'#e2e8f0','primaryTextColor':'#0f172a','primaryBorderColor':'#475569','lineColor':'#475569','actorBkg':'#e2e8f0','actorBorder':'#475569','actorTextColor':'#0f172a','signalColor':'#334155','signalTextColor':'#0f172a','noteBkgColor':'#fef3c7','noteBorderColor':'#d97706','noteTextColor':'#0f172a','labelBoxBkgColor':'#1e3a5f','labelBoxBorderColor':'#1e3a5f','labelTextColor':'#ffffff','loopTextColor':'#1e3a5f'}}}%%
sequenceDiagram
    box rgb(248,250,252) Externo
        actor C as Cliente
    end
    box rgb(241,245,249) Agencia
        actor E as Empleado
        participant R as Sistema Rumbo
    end

    rect rgb(224,236,250)
    Note over C,R: Paso 1 · Consulta (CU-04, CU-05)
    C->>E: Consulta por Instagram, WhatsApp o presencial
    E->>+R: Registra canal, destino, fechas y pasajeros
    R-->>-E: Oportunidad → nueva (T1)
    E->>+R: Empieza a atender la consulta
    R-->>-E: Oportunidad → en_gestión (T2)
    end

    rect rgb(240,246,253)
    Note over C,R: Paso 2 · Cliente (CU-02)
    E->>+R: Busca al cliente
    alt Ya tiene ficha
        R-->>E: Muestra la ficha existente
    else Cliente nuevo (CU-04 A1)
        E->>R: Crea la ficha: preferencias y segmento
    end
    deactivate R
    end

    rect rgb(224,236,250)
    Note over C,R: Paso 3 · Cotización (CU-06)
    E->>+R: Genera la cotización desde una plantilla
    R-->>-E: Documento listo · Cotización → borrador
    E->>C: Envía la cotización (fuera del sistema)
    E->>+R: La marca como enviada
    R-->>-E: Cotización → enviada · Oportunidad → cotizada (T3)
    loop A1 · El cliente no responde
        R-->>E: Alerta de insistencia
        E->>C: Vuelve a contactarlo
    end
    break El cliente desiste o no hay acuerdo (CU-05 A2)
        E->>R: Cierra la oportunidad con su motivo
        R-->>E: Oportunidad → perdida (T5)
    end
    C->>E: Acepta la propuesta
    end

    rect rgb(240,246,253)
    Note over C,R: Paso 4 · Reserva (CU-07, CU-10, CU-11, CU-12)
    E->>+R: Confirma la reserva
    R-->>-E: Viaje → reservado (T1) · Oportunidad → ganada (T4)
    E->>+R: Carga venta, costo del operador, moneda y comisión del vendedor
    R-->>-E: Calcula ganancia y margen (RN-01)
    E->>+R: Define el plan de pagos
    R-->>-E: Pagos → pendiente
    C->>E: Paga la seña
    E->>+R: Registra el cobro
    R-->>-E: Pago → pagado · Viaje → vendido (T2)
    loop A2 · Pago en cuotas, por cada cuota restante
        C->>E: Paga la cuota, en ARS o en USD
        E->>+R: Registra el cobro
        R-->>-E: Pago → pagado
    end
    R-->>E: Saldo en cero · Viaje → confirmado (T3)
    end

    rect rgb(224,236,250)
    Note over C,R: Paso 5 · Seguimiento (automático)
    par Vencimientos
        R-->>E: Aviso un mes antes de cada cuota
    and A3 · Destino con requisitos
        R-->>E: Recordatorio del formulario del destino
    and Próxima salida
        R-->>E: Aviso previo a la fecha de salida
    end
    E-)C: Le transmite los recordatorios (fuera del sistema)
    end

    rect rgb(240,246,253)
    Note over C,R: Paso 6 · Post-venta (CU-17)
    Note over E,R: El viaje transcurre: en curso (T4) y finalizado (T5)
    R-->>E: Alerta de reseña post-viaje
    E->>C: Le pide la reseña del hotel
    C->>E: Deja su reseña
    E->>+R: Registra la reseña
    R-->>-E: Hotel consolidado en el catálogo
    end
```

## Trazabilidad con el caso de uso
Cada franja azul del diagrama es **un paso del camino principal** de [[CU-01 De la consulta a la venta]], en el mismo orden y con el mismo nombre. Los fragmentos (`alt`, `loop`, `break`, `par`) son los desvíos, y cada uno lleva el código del flujo alternativo que lo origina.

| Paso de CU-01 | Franja del diagrama | Casos de uso que lo detallan | Estados que cambia |
|---|---|---|---|
| 1 · Consulta | Paso 1 | [[CU-04 Registrar consulta]], [[CU-05 Seguir oportunidad]] | [[EST-Oportunidad]] T1, T2 |
| 2 · Cliente | Paso 2 | [[CU-02 Registrar cliente]] | — |
| 3 · Cotización | Paso 3 | [[CU-06 Emitir cotización]] | [[EST-Cotización]] T1, T2 · [[EST-Oportunidad]] T3 |
| 4 · Reserva | Paso 4 | [[CU-07 Confirmar reserva]], [[CU-10 Registrar economía del viaje]], [[CU-11 Definir plan de cuotas]], [[CU-12 Registrar cobro de un pago]] | [[EST-Viaje]] T1, T2, T3 · [[EST-Oportunidad]] T4 · [[EST-Pago]] T1, T2 |
| 5 · Seguimiento | Paso 5 | [[CU-07 Confirmar reserva]] (formulario y salida), [[CU-11 Definir plan de cuotas]] (vencimientos) | — |
| 6 · Post-venta | Paso 6 | [[CU-17 Registrar reseña de hotel]] | [[EST-Viaje]] T4, T5 |

| Flujo alternativo | Fragmento |
|---|---|
| **A1** · El cliente no responde | `loop` en el paso 3 |
| **A2** · Pago en cuotas | `loop` en el paso 4 |
| **A3** · Destino con requisitos | rama del `par` en el paso 5 |
| *CU-04 A1* · Cliente nuevo | `alt` en el paso 2 |
| *CU-05 A2* · Oportunidad perdida | `break` en el paso 3: el flujo termina ahí |

## Convenciones del diagrama
- **Notación:** diagrama de actividad expresado con la sintaxis de secuencia de Mermaid, a pedido de Nahuel (25/09). Equivalencias con UML de actividad: `alt` = decisión, `loop` = iteración, `break` = salida anticipada (final de flujo), `par` = bifurcación en paralelo (fork/join), `opt` = rama opcional.
- **Franjas alternadas** = pasos del camino principal. **Notas ámbar** = encabezado del paso o acción automática.
- **Barras de activación** sobre el Sistema Rumbo = el sistema está procesando el pedido del empleado.
- **Estados** con la flecha `→` y el número de transición de su nota `EST-*`, para cruzarlo con los diagramas de estado.
- **Flecha abierta** (`-)`) = comunicación con el cliente que ocurre fuera del sistema.

## Cómo mantenerlo
- **Source → output:** la verdad vive en [[CU-01 De la consulta a la venta]] y los CU que compone. Si cambia el camino principal o un flujo alternativo, se actualiza primero el CU y después este diagrama, **manteniendo la franja por paso** para no perder la trazabilidad.
- **PNG:** `bash "07-Entregables/build/render-diagramas-actividad.sh"` lo regenera en `img/`.
- **Un solo editor a la vez** (el bloque Mermaid es indivisible). Ver [[Guía del Vault#3 · Workflow colaborativo]].

## 🔎 Revisión
> [!warning] Huecos detectados al dibujar (25/09, Nahuel + Claude) — no se resolvieron; se dibujó lo que dice el CU. #accion/decidir
> 1. **Orden de los pasos 1 y 2.** CU-01 registra la oportunidad (paso 1) y *después* identifica al cliente (paso 2), pero [[CU-04 Registrar consulta]] hace al revés: identifica al cliente en su paso 2 y crea la [[Oportunidad]] en el paso 4, ya asociada a él. El diagrama sigue el orden de CU-01. ¿Se alinea CU-01 a CU-04?
> 2. **El paso 5 ocurre antes de lo que indica su número.** Las alertas de seguimiento no se generan después del cobro: las de formulario y salida nacen al confirmar la reserva ([[CU-07 Confirmar reserva]] paso 4) y las de vencimiento al definir el plan ([[CU-11 Definir plan de cuotas]] paso 6), es decir, **dentro del paso 4**. El diagrama respeta la numeración de CU-01; convendría aclararlo en el CU o reordenar.
> 3. **Precondición de [[CU-05 Seguir oportunidad]] incompleta.** Pide una oportunidad `nueva` o `cotizada`, pero omite `en_gestión`, que es justamente el estado en que se la sigue (T2). Parece un olvido de cuando se sumó el quinto estado el 18/09.
> 4. **Quién marca la oportunidad como `ganada`.** [[CU-05 Seguir oportunidad]] paso 6 la cierra a mano, pero la postcondición de [[CU-07 Confirmar reserva]] y el [[DGM-SEC — De la consulta a la venta|diagrama de secuencia]] la cierran al confirmar la reserva. El diagrama muestra el cierre al confirmar; hay que definir si es un paso manual previo o un efecto de CU-07.
