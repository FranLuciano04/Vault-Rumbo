---
tipo: decision
estado: en-revision
modulo: [economia, configuracion, seguridad]
decisores: [Nahuel]
fecha_aprobacion:
supersede:
actualizado: 29/09/26
---
# DEC-0013 Datos que faltaban en el ER

tags:: #tipo/decision #estado/en-revision #pc/pc1

> ⏳ **Aprobada por Nahuel el 29/09/26**, al escribir el script SQL (F2) y el contrato OpenAPI (F1). Se ratifica con el equipo en el cierre del día 2 (A6), junto con ARQ.

## Contexto
Al pasar el [[DGM-ER]] a SQL aparecieron cuatro datos que los casos de uso y las decisiones ya piden, pero que el ER no tenía dónde guardar:
1. [[CU-12 Registrar cobro de un pago|CU-12]] pide la **fecha efectiva del cobro**, y `PAGO` no tenía esa columna.
2. La **vigencia de la cotización** (1 mes), la **anticipación de la alerta `salida`** (7 días) y el **plazo del recontacto** (6 meses) son configurables por `admin` ([[CU-06 Emitir cotización|CU-06]], [[CU-07 Confirmar reserva|CU-07]], [[CU-30 Sugerir recontacto de clientes|CU-30]]), pero no había tabla de parámetros.
3. La comisión del vendedor es **importe o porcentaje**, con **default por vendedor** y override por viaje ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]], [[CU-13 Configurar porcentaje de comisión|CU-13]]), pero el ER solo tenía `VIAJE.comision_vendedor` como número, sin tipo y sin default en `USUARIO`.
4. El **acceso al módulo de redes** es una capacidad que asigna `admin` ([[DEC-0005 Autenticación y modelo de roles|DEC-0005]]), pero `USUARIO` no tenía dónde guardarla.

## Decisión
1. **`PAGO.fecha_cobro`** (`date`, nullable): se carga al cobrar, junto con `forma_pago` y `moneda_pago`, y se borra si se revierte el cobro.
2. **Tabla `CONFIGURACION` de una sola fila**, con columnas tipadas y los valores validados con la agencia como default: `vigencia_cotizacion_meses` = 1, `anticipacion_salida_dias` = 7 y `recontacto_meses` = 6. Es una tabla de parámetros, **no una entidad del dominio**: el dominio sigue teniendo 13 entidades. La edita `admin`.
3. **Comisión con tipo y valor:** nuevo enum `tipo_comision` (`importe`, `porcentaje`; el porcentaje es sobre la ganancia). `USUARIO` suma `comision_default_tipo` y `comision_default_valor` (ambos nullable, porque no todo usuario vende). `VIAJE` suma `comision_tipo` junto a `comision_vendedor`. Cambiar el default de un vendedor no recalcula los viajes ya registrados.
4. **`USUARIO.acceso_redes`** (`boolean`, default `false`). `admin` y `dueño` tienen acceso por su rol, sin importar el valor.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Fecha del cobro = `updated_at` del pago | Sin columna nueva | Se pierde si se cobra con fecha anterior o se edita después | ❌ |
| Parámetros en variables de entorno | Simple | No los puede cambiar `admin` desde la app | ❌ |
| Parámetros como tabla clave-valor | Flexible | Pierde los tipos y los CHECK de la base | ❌ |
| Guardar siempre la comisión como importe ya calculado | Más simple | Se pierde qué porcentaje se aplicó | ❌ |

## Impacto
- [[DGM-ER]], [[DGM — Diagrama de clases]] (nuevo enum `TipoComision`: son 19) y las notas de [[Pago]], [[Usuario]] y [[Viaje]].
- [[Modelo de datos SQL]]: pasa a 15 tablas y 19 enumeraciones.
- Contrato OpenAPI (F1): los esquemas de `Viaje` y `Pago` y los endpoints de configuración.

## Decisores y fecha
- Nahuel — aprobada el 29/09/26; a ratificar con el equipo.

## Vínculo con el código (a partir de PC2)
- Rama: `-` · Commits: `-`
