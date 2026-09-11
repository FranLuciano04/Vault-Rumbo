---
tipo: caso-uso
estado: en-revision
modulo: [alertas]
responsable: Nahuel
pc: pc1
actualizado: 10/09/26
---
# CU-15 Configurar recordatorios por destino

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Definir, por destino, qué formularios o requisitos deben recordarse (p. ej. visa, vacunación, documentación) para que el sistema genere automáticamente [[Alerta|Alertas]] de tipo `formulario` en los [[Viaje|Viajes]] a ese destino.

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|admin]] (si la configuración de destinos se restringe a administración — ver Revisión).

## Precondiciones
- El [[Usuario]] inició sesión ([[CU-24 Iniciar sesión]]).

## Flujo principal
1. El empleado abre la configuración de **recordatorios por destino**.
2. Selecciona un destino del catálogo ([[CU-26 Gestionar destinos]]); el alta/edición del destino se hace allí, no en este flujo.
3. Define los requisitos a recordar (nombre del formulario/requisito y anticipación respecto de la salida).
4. El sistema guarda la regla de recordatorio para ese destino.
5. Al crearse o confirmarse un [[Viaje]] a ese destino ([[CU-07 Confirmar reserva]]), el sistema genera automáticamente las [[Alerta|Alertas]] de tipo `formulario` según la regla.

## Flujos alternativos
- **A1 — Editar regla:** el empleado modifica los requisitos de un destino; el sistema aplica el cambio a los [[Viaje|Viajes]] futuros (no reescribe [[Alerta|Alertas]] ya emitidas).
- **A2 — Destino sin requisitos:** no se configura nada; los [[Viaje|Viajes]] a ese destino no generan [[Alerta|Alertas]] de formulario.
- **A3 — Quitar un requisito:** deja de generar la [[Alerta]] asociada en viajes nuevos.

## Postcondiciones
- Quedan definidas las reglas de recordatorio por destino que alimentan la generación automática de [[Alerta|Alertas]] `formulario`.

## Reglas de negocio aplicadas
- Generación automática de [[Alerta|Alertas]] `formulario` por destino ([[CU-01 De la consulta a la venta]], A3).

## Entidades del dominio involucradas
- [[Alerta]] · [[Viaje]] · [[Destino]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!question] Nahuel (10/09): el alta/edición del destino se separó en [[CU-26 Gestionar destinos]] (ABM). Pendiente de sync: (1) **Actor** — lo dejo en `empleado`, pero como es configuración quizá corresponda `admin`; (2) **Modelo** — la regla "destino → requisitos" sigue sin entidad propia en las 10 del dominio; definir si se agrega un catálogo de requisitos por destino o se resuelve como configuración.
