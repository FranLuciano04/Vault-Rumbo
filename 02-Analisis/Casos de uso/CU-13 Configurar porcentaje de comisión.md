---
tipo: caso-uso
estado: en-revision
modulo: [economia]
responsable: Nahuel
pc: pc1
actualizado: 10/09/26
---
# CU-13 Configurar porcentaje de comisión

tags:: #tipo/caso-uso #estado/en-revision #pc/pc1 #accion/revisar

## Descripción
Definir el `%comisión` **por defecto de la empresa**: el valor con el que el sistema pre-calcula la comisión de cada [[Viaje]] nuevo. **No es una comisión única para todos:** cada [[Viaje]] puede tener su propio `%` (override en [[CU-10 Registrar economía del viaje]]). Ver [[RN-01 Comisión automática]] y [[DEC-0004 Comisión configurable por porcentaje]].

## Actor principal
[[Actores|admin]]

## Actores secundarios
-

## Precondiciones
- El [[Usuario]] tiene rol `admin` ([[DEC-0005 Autenticación y modelo de roles]]).

## Flujo principal
1. El admin abre la configuración de la empresa.
2. Edita el `%comisión` por defecto.
3. El sistema valida que sea un porcentaje válido (0–100).
4. El admin confirma y el sistema guarda el nuevo `%comisión`.
5. El nuevo valor pasa a ser el `%` sugerido para los [[Viaje|Viajes]] que se registren a partir de entonces ([[CU-10 Registrar economía del viaje]]); no altera los ya registrados.

## Flujos alternativos
- **A1 — Valor inválido:** fuera de 0–100 o no numérico → el sistema rechaza y conserva el valor anterior.
- **A2 — Comisión por viaje:** al registrar la economía, el empleado puede fijar un `%` distinto para ese [[Viaje]] puntual; ese override prevalece sobre el default de empresa ([[CU-10 Registrar economía del viaje]], [[DEC-0004 Comisión configurable por porcentaje]]).

## Postcondiciones
- El `%comisión` por defecto queda actualizado como parámetro de negocio.

## Reglas de negocio aplicadas
- [[RN-01 Comisión automática]]

## Entidades del dominio involucradas
- [[Usuario]] · [[Viaje]] (parámetro de cálculo)

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!note] Nahuel (10/09): modelo confirmado — **`%` por defecto de empresa + configurable por viaje** (override en [[CU-10 Registrar economía del viaje]]). Cambiar el default **no recalcula** viajes ya registrados. Alineado con [[DEC-0004 Comisión configurable por porcentaje]]; falta su ratificación formal en la sync.
