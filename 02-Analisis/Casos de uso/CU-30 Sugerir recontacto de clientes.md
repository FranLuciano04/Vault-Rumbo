---
tipo: caso-uso
estado: en-revision
modulo: [clientes, oportunidades]
responsable: Francisco
pc: pc1
actualizado: 17/09/26
---
# CU-30 Sugerir recontacto de clientes

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
**CRM proactivo:** el sistema detecta [[Cliente|Clientes]] **fieles inactivos** (con historial de viajes pero sin actividad reciente) y sugiere al empleado **recontactarlos** para generar una nueva [[Oportunidad]]. La sugerencia es una ayuda, **no un envío automático**, y respeta un **opt-out** para no ser invasiva (nace de la idea original de "detector de oportunidades" del relevamiento, acotada — ver [[Alcance y fuera de alcance]]).

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- Servicio del sistema (proceso que evalúa el criterio de inactividad).

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Existen [[Cliente|Clientes]] con historial de [[Viaje|Viajes]] ([[CU-02 Registrar cliente]]).

## Flujo principal
1. El sistema evalúa periódicamente el historial de cada [[Cliente]] y detecta a los **candidatos a recontacto**: cumplen el criterio de fidelidad/inactividad (ver Reglas) y **no** tienen el opt-out `no_recontactar`.
2. Genera una [[Alerta]] de tipo `recontacto` para el [[Cliente]] (o lo lista en un panel de "clientes a recontactar").
3. El empleado abre la sugerencia y ve el contexto del [[Cliente]] (último viaje, preferencias, historial).
4. Decide: **recontactar** (típicamente registrando una consulta nueva, [[CU-04 Registrar consulta]]), **posponer** o **marcar que no se lo recontacte** (opt-out).
5. El sistema registra la acción y resuelve/actualiza la [[Alerta]].

## Flujos alternativos
- **A1 — Opt-out:** el empleado marca el [[Cliente]] como `no_recontactar` → deja de aparecer como candidato (evita ser molesto, p. ej. cliente de un solo viaje que no quiere seguimiento).
- **A2 — Deriva en oportunidad:** el recontacto prospera → se registra una [[Oportunidad]] nueva ([[CU-04 Registrar consulta]]) y el cliente sale de la lista de inactivos.
- **A3 — Posponer:** el empleado reprograma la sugerencia para más adelante.
- **A4 — Sin candidatos:** ningún cliente cumple el criterio → no se genera nada.

## Postcondiciones
- Los [[Cliente|Clientes]] fieles inactivos quedan visibles como oportunidades de recontacto; los marcados con opt-out no vuelven a sugerirse; las gestiones pueden derivar en nuevas [[Oportunidad|Oportunidades]].

## Reglas de negocio aplicadas
- **Criterio de candidato (agencia, 17/09 — ver [[Relevamiento — respuestas de la agencia (17-09)]], bloque 4):** cliente sin una nueva compra/viaje hace **≈ 6 meses** (umbral **configurable**, default 6). Aplica a **todos** los clientes, pero **prioriza/identifica a los recurrentes** (**≥ 2 [[Viaje|Viajes]]** con la agencia). Se excluye a los `no_recontactar`.
- **Segmentación comercial:** el sistema permite **generar segmentos** de [[Cliente|Clientes]] para acciones dirigidas — por destino/producto (Brasil, Caribe, Europa, cruceros, nacionales) o por tipo (familias, parejas, etc.). Ver [[Cliente]] (`segmento`/etiquetas).
- **Sin envío automático:** el sistema sugiere; el contacto lo hace una persona (coherente con "no reemplaza el asesoramiento", [[Alcance y fuera de alcance]]).

## Entidades del dominio involucradas
- [[Cliente]] (`no_recontactar`) · [[Oportunidad]] · [[Alerta]] (`recontacto`) · [[Viaje]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!note] Francisco (11/09) — nuevo CU nacido del "detector de oportunidades" del relevamiento crudo, acotado a **CRM proactivo** (se descartó el scraping de ofertas, ver [[Alcance y fuera de alcance]]). Impacto de dominio: agrega `no_recontactar` (Bool) a [[Cliente]] (módulo de Paloma) y el tipo `recontacto` al enum de [[Alerta]] (módulo de Nahuel). **A validar el criterio de candidato (X meses, ≥2 viajes) y el impacto en el dominio con Paloma y Nahuel en la sync.**
> [!success] Paloma (17/09) — **criterio resuelto por la agencia y ratificado:** X = **≈ 6 meses** (configurable), aplica a todos priorizando recurrentes (≥ 2 viajes). **Segmentación comercial** de clientes modelada como **etiquetas libres, múltiples y combinables** en [[Cliente]] (`etiquetas`); el perfil queda en `segmento`. Sync 17/09.
