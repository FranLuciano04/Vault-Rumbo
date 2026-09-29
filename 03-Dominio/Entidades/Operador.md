---
tipo: entidad
estado: formalizado
modulo: [economia, viajes]
responsable: Nahuel
pc: pc1
actualizado: 29/09/26
fecha_aprobacion: 29/09/26
---
# Operador

tags:: #tipo/entidad #estado/formalizado #pc/pc1

## Responsabilidad
**Operador/proveedor** (mayorista, operador turístico) al que la agencia le compra el viaje: es la **contraparte del `costo`** del [[Viaje]]. Catálogo compartido con ABM. Habilita reportes de **ventas por operador** y **pendiente de pago a operadores**. Ver [[DEC-0009 Operador-Proveedor como entidad de catálogo]].

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| nombre | String | Razón social / nombre comercial |
| contacto | String | Teléfono / email / ejecutivo de cuentas (opcional) |
| activo | Bool | Baja **lógica**: un operador en uso no se elimina físicamente |

## Relaciones
- 1..* con [[Viaje]] (`operador`): un operador provee muchos viajes; un viaje tiene un operador ([[DEC-0009 Operador-Proveedor como entidad de catálogo]]).

## Reglas / invariantes
- Catálogo **compartido** (lectura global); ABM y baja lógica en manos de `admin` (mismo criterio que [[Destino]], [[DEC-0005 Autenticación y modelo de roles]]).
- No confundir con [[Hotel]] (ítem del itinerario con su propio `vencimiento_pago_proveedor`): el `Operador` es la contraparte del paquete/costo del viaje.

## Aparece en
- [[CU-22 Generar reportes y estadísticas]] · [[CU-21 Ver dashboard y embudo]] · [[MOC — Modelo de dominio]] · [[DGM-ER]] · [[MOD-Economia-Pagos]]

> ⚠️ **Entidad nueva (sync 17/09, [[DEC-0009 Operador-Proveedor como entidad de catálogo]]).** Su ABM es [[CU-31 Gestionar operadores]]. ✅ Formalizada en la sync del 29/09/26 junto con el resto de las entidades.
