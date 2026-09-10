---
tipo: modulo
estado: formalizado
responsable: Escriba de decisiones
actualizado: 09/09/26
---
# MOC — Decisiones (ADR)

tags:: #tipo/modulo #estado/formalizado

> Registro de decisiones de diseño (Architecture Decision Records). Toda elección no obvia va acá para que quede el *porqué* y la trazabilidad.

## Decisiones
- [[DEC-0001 Stack tecnológico]]
- [[DEC-0002 Modelar la consulta como Oportunidad]]
- [[DEC-0003 Relación Viaje–Hotel y Reseña]]
- [[DEC-0004 Comisión configurable por porcentaje]]
- [[DEC-0005 Autenticación y modelo de roles]]

## Todas (Dataview)
```dataview
TABLE estado, decisores, fecha_aprobacion
FROM "05-Diseño/Decisiones"
SORT file.name ASC
```

## Cómo agregar una decisión
Nueva nota con la plantilla [[PL-Decisión (ADR)]], numeración correlativa `DEC-####`. Si reemplaza a otra, completar `supersede:` y marcar la vieja `#estado/obsoleto`.
