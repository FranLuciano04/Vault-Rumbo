---
tipo: regla
estado: borrador
modulo: [seguridad]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# RN-09 Protección del último administrador

tags:: #tipo/regla #estado/borrador #pc/pc2

> Borrador del 21/10/26 (C1). Sube a regla el RF-149, formalizado el 29/09. Falta la aprobación del equipo.

## Enunciado
La agencia nunca queda sin administración: el sistema impide quitarle el rol `admin` al último [[Usuario]] que lo tiene, y también impide darlo de baja.

## Aplica en
- [[Usuario]]
- [[CU-25 Gestionar usuarios y roles]]

## Origen
RF-149 de [[Requisitos funcionales]]. Roles en [[Actores]].
