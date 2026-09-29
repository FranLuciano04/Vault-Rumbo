---
tipo: caso-uso
estado: formalizado
modulo: [configuracion, alertas]
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-15 Configurar recordatorios por destino

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Definir, por destino, qué formularios o requisitos deben recordarse (p. ej. visa, vacunación, documentación) para que el sistema genere automáticamente [[Alerta|Alertas]] de tipo `formulario` en los [[Viaje|Viajes]] a ese destino.

## Actor principal
[[Actores|admin]] (también `dueño`)

## Actores secundarios
-

## Precondiciones
- El [[Usuario]] inició sesión con rol `admin` o `dueño` ([[CU-24 Iniciar sesión]], [[DEC-0005 Autenticación y modelo de roles]]).

## Flujo principal
1. El admin abre la configuración de **recordatorios por destino**.
2. Selecciona un destino del catálogo ([[CU-26 Gestionar destinos]]); el alta/edición del destino se hace allí, no en este flujo.
3. Define uno o más [[RequisitoDestino|requisitos]] a recordar: **nombre**, **tipo** (visa · vacunación · documentación · seguro · formulario · otro), si es **obligatorio** o recomendado, una **descripción/instrucciones** opcional y la **anticipación** (días antes de la salida).
4. El sistema guarda cada [[RequisitoDestino]] asociado al destino.
5. Al crearse o confirmarse un [[Viaje]] a ese destino ([[CU-07 Confirmar reserva]]), el sistema genera automáticamente las [[Alerta|Alertas]] de tipo `formulario` según los [[RequisitoDestino|requisitos]] `activos`.

## Flujos alternativos
- **A1 — Editar regla:** el admin modifica un [[RequisitoDestino]]; el sistema aplica el cambio a los [[Viaje|Viajes]] futuros (no reescribe [[Alerta|Alertas]] ya emitidas).
- **A2 — Destino sin requisitos:** no se configura nada; los [[Viaje|Viajes]] a ese destino no generan [[Alerta|Alertas]] de formulario.
- **A3 — Quitar un requisito:** el admin da de baja lógica un [[RequisitoDestino]] (`activo = false`); deja de generar la [[Alerta]] asociada en viajes nuevos.

## Postcondiciones
- Quedan definidas las reglas de recordatorio por destino que alimentan la generación automática de [[Alerta|Alertas]] `formulario`.

## Reglas de negocio aplicadas
- Generación automática de [[Alerta|Alertas]] `formulario` por destino ([[CU-01 De la consulta a la venta]], A3).

## Entidades del dominio involucradas
- [[RequisitoDestino]] · [[Alerta]] · [[Viaje]] · [[Destino]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!question] Nahuel (10/09): el alta/edición del destino se separó en [[CU-26 Gestionar destinos]] (ABM). Pendiente de sync: (1) **Actor** — lo dejo en `empleado`, pero como es configuración quizá corresponda `admin`; (2) **Modelo** — la regla "destino → requisitos" sigue sin entidad propia en las 10 del dominio; definir si se agrega un catálogo de requisitos por destino o se resuelve como configuración.
>
> [!note] Francisco (11/09) — revisión de inconsistencias: **definido.** Resueltas las dos dudas de Nahuel — (1) **Actor = `admin`/`dueño`** (es configuración, coherente con [[CU-26 Gestionar destinos]] y [[DEC-0005 Autenticación y modelo de roles]]); (2) se crea la **entidad [[RequisitoDestino]]** (12ª del dominio) para cerrar el gap de modelado, con FK a [[Destino]]. Nahuel: para tu conocimiento; ajustable en la sync.
