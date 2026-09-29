---
tipo: caso-uso
estado: formalizado
modulo: [configuracion, economia]
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# CU-13 Configurar porcentaje de comisión

tags:: #tipo/caso-uso #estado/formalizado #pc/pc1

## Descripción
Definir la **comisión por defecto de cada vendedor/freelancer**: el valor (**importe o %**) con el que el sistema pre-carga la `comision_vendedor` de cada [[Viaje]] que ese vendedor genere. Cada viaje admite **override** ([[CU-10 Registrar economía del viaje]]). No configura la rentabilidad de la agencia (ganancia/margen se calculan solos). Ver [[RN-01 Comisión automática]] y [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]].

> ℹ️ El nombre histórico "porcentaje de comisión" se conserva por el número de CU, pero tras la sync 17/09 el alcance es la **comisión del vendedor** (puede ser importe o %).

## Actor principal
[[Actores|admin]]

## Actores secundarios
-

## Precondiciones
- El [[Usuario]] tiene rol `admin` ([[DEC-0005 Autenticación y modelo de roles]]).

## Flujo principal
1. El admin abre la configuración de vendedores/comisiones.
2. Selecciona un `vendedor` y define su comisión por defecto: **importe fijo o %** (el % se calcula sobre la ganancia).
3. El sistema valida el valor (importe ≥ 0; si es %, 0–100).
4. El admin confirma y el sistema guarda la comisión por defecto de ese vendedor.
5. El nuevo valor pasa a ser el sugerido para los [[Viaje|Viajes]] que ese vendedor registre a partir de entonces ([[CU-10 Registrar economía del viaje]]); no altera los ya registrados.

## Flujos alternativos
- **A1 — Valor inválido:** importe negativo, o % fuera de 0–100, o no numérico → el sistema rechaza y conserva el valor anterior.
- **A2 — Comisión por viaje (override):** al registrar la economía, el empleado puede fijar una `comision_vendedor` distinta para ese [[Viaje]] puntual; ese override prevalece sobre el default del vendedor ([[CU-10 Registrar economía del viaje]], [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]).

## Postcondiciones
- La comisión por defecto del vendedor queda actualizada como parámetro de negocio.

## Reglas de negocio aplicadas
- [[RN-01 Comisión automática]]

## Entidades del dominio involucradas
- [[Usuario]] (vendedor) · [[Viaje]] (parámetro de cálculo)

## Diagramas
- [[DGM — Casos de uso]] · [[MOC — Modelo de dominio]]

## 🔎 Revisión
> [!success] Sync 17/09 — **reencuadrado**: ya no es un `%` de comisión de empresa, sino la **comisión por defecto de cada vendedor/freelancer** (importe o %, el % sobre la ganancia), con override por viaje. La rentabilidad de la agencia (ganancia/margen) no usa este parámetro. Ver [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (supersede a [[DEC-0004 Comisión configurable por porcentaje]]). Se mantiene: cambiar el default **no recalcula** viajes ya registrados (Nahuel, 10/09).
