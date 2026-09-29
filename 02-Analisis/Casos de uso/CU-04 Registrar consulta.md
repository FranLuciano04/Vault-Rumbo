---
tipo: caso-uso
estado: formalizado
modulo: [clientes, cotizaciones]
responsable: Francisco
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-04 Registrar consulta

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
El empleado registra una consulta entrante (Instagram, WhatsApp o presencial) capturando pasajeros, destino y fechas tentativas, y crea una [[Oportunidad]] para gestionar el embudo de ventas. Ver [[DEC-0002 Modelar la consulta como Oportunidad]].

## Actor principal
[[Actores|empleado]]

## Actores secundarios
- [[Actores|Pasajero / Cliente]] (externo: origen de la consulta; no opera el sistema).

## Precondiciones
- El empleado está autenticado ([[CU-24 Iniciar sesión]]).
- Llega una consulta por un canal (Instagram, WhatsApp, presencial).

## Flujo principal
1. El empleado abre **Nueva consulta**.
2. **Identifica al [[Cliente]]:** lo busca y selecciona; si no existe, crea la ficha ([[CU-02 Registrar cliente]]).
3. Carga los datos de la consulta: **canal**, **destino tentativo**, **fechas tentativas**, **cantidad de pasajeros** y notas.
4. El sistema crea la [[Oportunidad]] en estado **nueva**, asociada al `Cliente` y al `empleado` que la registra.
5. El sistema confirma el alta y ofrece continuar con la cotización ([[CU-06 Emitir cotización]]).

## Flujos alternativos
- **A1 — Cliente nuevo:** en el paso 2 no existe la ficha → se crea en el momento ([[CU-02 Registrar cliente]]) y se continúa.
- **A2 — Recontacto / duplicado:** si el `Cliente` ya tiene una `Oportunidad` abierta, el sistema lo advierte y ofrece **retomarla** en lugar de crear una nueva.
- **A3 — Datos incompletos:** se guarda la `Oportunidad` en estado **nueva** con lo mínimo (canal + cliente) y se completan los datos más tarde.

## Postcondiciones
- Existe una [[Oportunidad]] en estado **nueva**, asociada al `Cliente` y al `empleado`, lista para seguimiento ([[CU-05 Seguir oportunidad]]) y cotización ([[CU-06 Emitir cotización]]).
- La `Oportunidad` queda con el empleado que la registró como `responsable` (vista "mis oportunidades"); es **legible por toda la agencia** ([[DEC-0005 Autenticación y modelo de roles]]).

## Reglas de negocio aplicadas
- (Ninguna regla económica en este CU; la comisión aplica recién al confirmar el [[Viaje]].)

## Entidades del dominio involucradas
- [[Oportunidad]] · [[Cliente]] · [[Usuario]]

## Diagramas
- [[DGM — Casos de uso]] · (pendiente) diagrama de actividad del alta de consulta.

## Decisiones asociadas
- [[DEC-0002 Modelar la consulta como Oportunidad]]

## 🔎 Revisión
> [!question] Ejemplo de referencia (10/09): ¿los estados de `Oportunidad` (nueva · cotizada · ganada · perdida) alcanzan, o hace falta un estado "en seguimiento" para A2/insistencia?
