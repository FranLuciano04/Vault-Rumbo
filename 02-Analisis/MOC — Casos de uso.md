---
tipo: modulo
estado: formalizado
responsable: equipo
pc: pc1
actualizado: 09/09/26
---
# MOC — Casos de uso

tags:: #tipo/modulo #estado/formalizado #pc/pc1

> Índice de casos de uso. Punto de entrada de bajo costo de contexto: desde acá se baja al CU puntual.

## Casos de uso
- [[CU-01 De la consulta a la venta]] — flujo núcleo
- _(CU-02 Registrar cliente — pendiente)_
- _(CU-03 Emitir cotización — pendiente)_

## Reglas de negocio
- [[RN-01 Comisión automática]]

## Estado (Dataview — requiere plugin)
```dataview
TABLE estado, responsable, actualizado
FROM "02-Analisis/Casos de uso"
SORT file.name ASC
```

## Pendiente para PC1
```dataview
LIST FROM #tipo/caso-uso AND #estado/borrador
```
