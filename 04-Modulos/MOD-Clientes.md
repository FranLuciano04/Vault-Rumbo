---
tipo: modulo
estado: formalizado
modulo: [clientes]
actualizado: 09/09/26
---
# MOD-Clientes

tags:: #tipo/modulo #modulo/clientes

Ficha, preferencias, historial y segmentación (familia, amigos, individual).

## Entidades
[[Cliente]] · [[Oportunidad]] · [[Reseña]]

## Casos de uso
[[CU-01 De la consulta a la venta]]

## Decisiones
[[DEC-0002 Modelar la consulta como Oportunidad]]

## Todo del módulo (Dataview)
```dataview
LIST FROM #modulo/clientes SORT file.name
```
