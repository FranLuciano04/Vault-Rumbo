---
tipo: diagrama
estado: borrador
modulo: [viajes, economia, alertas]
responsable: Nahuel
pc: pc1
actualizado: 25/09/26
---
# DGM-ACT — Confirmar reserva

tags:: #tipo/diagrama #estado/borrador #pc/pc1 #accion/revisar

## Qué representa
El **flujo de actividad** de [[CU-07 Confirmar reserva]]: el momento en que una [[Oportunidad]] ganada se convierte en [[Viaje]]. Es el punto más cargado del sistema: crea el viaje, genera en paralelo las alertas del destino y de la salida, e incluye el control económico ([[CU-10 Registrar economía del viaje]]) y el plan de cuotas ([[CU-11 Definir plan de cuotas]]) con su validación `Σ montos = precioVenta`.

Notas de origen: [[CU-07 Confirmar reserva]] · [[CU-10 Registrar economía del viaje]] · [[CU-11 Definir plan de cuotas]] · [[CU-09 Armar itinerario de hoteles]] · [[CU-15 Configurar recordatorios por destino]] · [[RN-01 Comisión automática]] · [[EST-Viaje]] · [[EST-Pago]] · [[EST-Alerta]] · [[EST-Oportunidad]]

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

    C->>E: Confirma la compra

    rect rgb(224,236,250)
    Note over C,R: Paso 1 · Elegir «Confirmar reserva»
    alt Cotización aceptada
        E->>R: Abre la oportunidad ganada y elige «Confirmar reserva»
    else A1 · Venta directa, sin cotización formal
        E->>R: Abre la oportunidad ganada sin cotización y elige «Confirmar reserva»
    end
    end

    rect rgb(240,246,253)
    Note over C,R: Paso 2 · Datos del viaje
    E->>+R: Carga destino (del catálogo), fechas, categoría y responsable
    break A3 · Falta el destino o las fechas
        R-->>E: No confirma y pide completarlos
    end
    deactivate R
    end

    rect rgb(224,236,250)
    Note over C,R: Paso 3 · Crear el viaje
    Note over R: Crea el Viaje asociado al Cliente y a la Oportunidad
    R-->>E: Viaje → reservado (T1) · Oportunidad ganada y cerrada
    end

    rect rgb(240,246,253)
    Note over C,R: Paso 4 · Alertas del viaje (automático)
    par Requisitos del destino
        alt El destino tiene requisitos
            Note over R: Una Alerta «formulario» por cada requisito
        else A2 · Destino sin requisitos
            Note over R: No genera alertas de formulario
        end
    and Próxima salida
        Note over R: Una Alerta «salida» antes de la fecha de salida
    end
    end

    rect rgb(224,236,250)
    Note over C,R: Paso 5 · Economía y plan de cuotas (include CU-10 y CU-11)
    E->>+R: Carga moneda, operador, precio de venta, costo, vendedor y comisión
    R-->>-E: Calcula ganancia y margen (RN-01)
    E->>+R: Define las cuotas y la seña, con monto y vencimiento
    loop CU-11 A1 · Mientras Σ montos ≠ precio de venta
        R-->>E: Rechaza el plan y muestra la diferencia
        E->>R: Corrige los montos
    end
    Note over R: Guarda los Pagos · Pago → pendiente (T1)
    Note over R: Una Alerta de vencimiento por Pago, un mes antes
    R-->>-E: Plan de pagos guardado
    opt Armar el itinerario de hoteles
        E->>R: Suma los hoteles del viaje (CU-09)
    end
    Note over E,R: Continúa en CU-12: al cobrarse la seña, Viaje → vendido (T2)
    end
```

## Trazabilidad con el caso de uso
Cada franja azul es **un paso del camino principal** de [[CU-07 Confirmar reserva]], en el mismo orden. Los fragmentos son los desvíos y llevan el código del flujo alternativo que los origina.

| Paso de CU-07 | Franja del diagrama | Detalle | Estados que cambia |
|---|---|---|---|
| 1 · Elegir «Confirmar reserva» | Paso 1 | Precondición: oportunidad `ganada` o cotización `aceptada` | — |
| 2 · Cargar los datos del viaje | Paso 2 | Destino desde [[CU-26 Gestionar destinos]] | — |
| 3 · Crear el viaje | Paso 3 | — | [[EST-Viaje]] T1 |
| 4 · Generar alertas de formulario y salida | Paso 4 | Requisitos de [[CU-15 Configurar recordatorios por destino]] | [[EST-Alerta]] T1 |
| 5 · Economía, plan de cuotas e itinerario | Paso 5 | [[CU-10 Registrar economía del viaje]] pasos 2–6 · [[CU-11 Definir plan de cuotas]] pasos 2–6 · [[CU-09 Armar itinerario de hoteles]] | [[EST-Pago]] T1 · [[EST-Alerta]] T1 |

| Flujo alternativo | Fragmento |
|---|---|
| **A1** · Venta directa, sin cotización formal | rama `else` del `alt` en el paso 1 |
| **A2** · Destino sin requisitos | rama `else` del `alt` dentro del `par` en el paso 4 |
| **A3** · Datos faltantes | `break` en el paso 2: el viaje no se crea |
| *CU-11 A1* · La suma no coincide | `loop` en el paso 5 |

Los flujos alternativos propios de [[CU-10 Registrar economía del viaje]] (override de comisión, venta sin vendedor, costo mayor que la venta) **no se dibujan**: no desvían el flujo de CU-07 y quedan para un diagrama propio de CU-10 si se lo necesita.

## Convenciones del diagrama
Las mismas que [[DGM-ACT — De la consulta a la venta#Convenciones del diagrama]]. Además:
- **Nota ámbar sobre el Sistema Rumbo** = acción interna que el sistema hace solo, sin respuesta al empleado.
- El `par` del paso 4 indica que las dos familias de alertas se generan **de forma independiente**; no hay orden entre ellas.

## Cómo mantenerlo
- **Source → output:** la verdad vive en [[CU-07 Confirmar reserva]], [[CU-10 Registrar economía del viaje]] y [[CU-11 Definir plan de cuotas]]. Si cambia el camino principal o un flujo alternativo, se actualiza primero el CU y después este diagrama, **manteniendo la franja por paso** para no perder la trazabilidad.
- **PNG:** `bash "07-Entregables/build/render-diagramas-actividad.sh"` lo regenera en `img/`.
- **Un solo editor a la vez** (el bloque Mermaid es indivisible). Ver [[Guía del Vault#3 · Workflow colaborativo]].

## 🔎 Revisión
> [!warning] Huecos detectados al dibujar (25/09, Nahuel + Claude) — no se resolvieron; se dibujó lo que dice el CU. #accion/decidir
> 1. **Viaje sin seña: nunca pasa a `vendido`.** [[CU-11 Definir plan de cuotas]] dice que la seña es **opcional** y su A2 permite un **pago único** de `tipo = saldo`, pero la guarda de [[EST-Viaje]] T2 exige cobrar un [[Pago]] de `tipo = seña`. Con un plan sin seña, el viaje queda en `reservado` hasta que el saldo llegue a cero, y T3 solo sale de `vendido`: **el viaje quedaría trabado en `reservado` aun totalmente pagado.** Hay que decidir si el primer cobro de cualquier tipo cuenta como seña, o si la seña pasa a ser obligatoria.
> 2. **Precondición de [[CU-10 Registrar economía del viaje]] desactualizada.** Dice que el viaje fue «creado/`vendido` en CU-07», pero CU-07 lo crea en `reservado` y la economía se carga **antes** del cobro de la seña. Debería decir `reservado`.
> 3. **Quién cierra la oportunidad como `ganada`.** La precondición de CU-07 exige una oportunidad **ya** `ganada` (o una cotización `aceptada`), y su postcondición dice que «queda `ganada` y cerrada». Con la cotización aceptada pero la oportunidad todavía `cotizada`, no queda claro si CU-07 hace la transición T4 o si el empleado debe cerrarla antes en [[CU-05 Seguir oportunidad]]. Mismo hueco que el punto 4 de [[DGM-ACT — De la consulta a la venta]].
> 4. **La anticipación de la alerta `salida`** (7 días por default) sigue sin validar con la agencia; ya figura como pendiente en el [[Estado del proyecto]]. No se escribió el valor en el diagrama.
