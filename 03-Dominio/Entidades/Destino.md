---
tipo: entidad
estado: borrador
modulo: [viajes]
responsable:
pc: pc1
actualizado: 10/09/26
---
# Destino

tags:: #tipo/entidad #estado/borrador #pc/pc1

## Responsabilidad
Lugar ofrecido por la agencia (ciudad/país). Catálogo compartido que da consistencia al `destino` de los [[Viaje|Viajes]] y [[Hotel|Hoteles]], y sostiene las reglas de recordatorio por destino. Ver [[DEC-0006 Destino como entidad de catálogo]].

## Atributos
| Atributo | Tipo | Descripción |
|---|---|---|
| id | UUID | Identificador |
| nombre | String | Nombre del destino (ej. Bariloche) |
| pais | String | País |
| region | String | Región / provincia (opcional) |
| activo | Bool | Vigente en el catálogo (baja lógica) |
| notas | String | Observaciones (opcional) |

## Relaciones
- 1 a 0..* con [[Viaje]] (un destino tiene muchos viajes)
- 1 a 0..* con [[Hotel]] (un destino agrupa muchos hoteles)

## Aparece en
- [[CU-26 Gestionar destinos]] · [[CU-15 Configurar recordatorios por destino]] · [[CU-07 Confirmar reserva]] · [[MOC — Modelo de dominio]]
