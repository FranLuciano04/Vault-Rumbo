---
tipo: entidad
estado: borrador
modulo: [alertas, viajes]
responsable:
pc: pc1
actualizado: 11/09/26
---
# RequisitoDestino

tags:: #tipo/entidad #estado/borrador #pc/pc1

> ⚠️ Entidad nueva (12ª) propuesta por Francisco (11/09) para cerrar el gap de modelado de [[CU-15 Configurar recordatorios por destino]]: la regla "destino → requisitos" no tenía entidad. **A ratificar en la sync con Nahuel** (dueño del módulo de alertas). Si el equipo prefiere, puede elevarse a una `DEC-`.

## Responsabilidad
Requisito o formulario que un [[Destino]] exige recordar (p. ej. visa, vacunación, documentación). Es la **regla de configuración** que dispara automáticamente las [[Alerta|Alertas]] de tipo `formulario` en los [[Viaje|Viajes]] a ese destino. Ver [[CU-15 Configurar recordatorios por destino]].

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| destino | FK → [[Destino]] | Destino al que aplica el requisito |
| nombre | String | Requisito/formulario a recordar (ej. "Visa EE.UU.") |
| anticipacion_dias | Int | Días antes de la salida en que se genera la [[Alerta]] |
| activo | Bool | Vigente (baja lógica; deja de generar alertas en viajes nuevos) |

## Relaciones
- *..1 con [[Destino]] — un destino tiene 0..* requisitos
- Alimenta la generación de [[Alerta|Alertas]] `formulario` al confirmarse un [[Viaje]] al destino ([[CU-07 Confirmar reserva]], [[CU-15 Configurar recordatorios por destino]])

## Reglas / invariantes
- Editar o dar de baja un requisito afecta solo a los [[Viaje|Viajes]] **futuros**; no reescribe [[Alerta|Alertas]] ya emitidas ([[CU-15 Configurar recordatorios por destino]] A1/A3).
- **Visibilidad/gestión:** es configuración → la gestiona `admin`/`dueño`. Ver [[DEC-0005 Autenticación y modelo de roles]].

## Aparece en
- CU: [[CU-15 Configurar recordatorios por destino]] · [[CU-07 Confirmar reserva]]
- Diagramas: [[MOC — Modelo de dominio]] · [[DGM-ER]]
- Módulo: [[MOD-Alertas]]
