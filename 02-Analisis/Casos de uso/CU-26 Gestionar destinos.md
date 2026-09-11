---
tipo: caso-uso
estado: en-revision
modulo: [alertas]
responsable: Nahuel
pc: pc1
actualizado: 10/09/26
---
# CU-26 Gestionar destinos

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Alta, baja y modificación (ABM) de los **destinos** del catálogo. El catálogo de destinos es la base para el `destino` de un [[Viaje]] y para las reglas de recordatorio por destino ([[CU-15 Configurar recordatorios por destino]]).

## Actor principal
[[Actores|admin]]

## Actores secundarios
- [[Actores|dueño]] (ve toda la empresa y accede a configuración; puede gestionar el catálogo).

## Precondiciones
- El [[Usuario]] inició sesión con rol `admin` o `dueño` ([[CU-24 Iniciar sesión]], [[DEC-0005 Autenticación y modelo de roles]]).

## Flujo principal
1. El admin abre el catálogo de destinos.
2. El sistema lista los destinos existentes.
3. **Alta:** el admin crea un destino con sus datos (nombre; opcional país/región y notas).
4. **Modificación:** edita los datos de un destino existente.
5. **Baja:** da de baja un destino que ya no se ofrece.
6. El sistema valida y persiste el cambio en el catálogo compartido.

## Flujos alternativos
- **A1 — Nombre duplicado:** el destino ya existe → el sistema rechaza el alta.
- **A2 — Destino en uso:** si hay [[Viaje|Viajes]], [[Hotel|Hoteles]] o reglas de [[CU-15 Configurar recordatorios por destino]] asociados, el sistema impide la baja física y aplica **baja lógica** (`activo = false`, conserva el historial).
- **A3 — Reactivar:** un destino dado de baja lógica puede reactivarse.

## Postcondiciones
- El catálogo de destinos queda actualizado y disponible para [[CU-07 Confirmar reserva]] y [[CU-15 Configurar recordatorios por destino]].

## Reglas de negocio aplicadas
- Integridad referencial: no eliminar un destino en uso (baja lógica).

## Entidades del dominio involucradas
- [[Destino]] · [[Viaje]]

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!note] Nahuel (10/09): CU nacido de separar el ABM de destino de [[CU-15 Configurar recordatorios por destino]]. **Resuelto:** [[Destino]] se promovió a entidad ([[DEC-0006 Destino como entidad de catálogo]], toca [[Viaje]] y [[Hotel]]); actor fijado en `admin`/`dueño`. Pendiente de sync: ratificar [[DEC-0006 Destino como entidad de catálogo]] (incluye el impacto en [[Hotel]], módulo de Paloma) y confirmar si el módulo del CU se separa como *Configuración/Catálogos*.
