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
- [[DEC-0004 Comisión configurable por porcentaje]] 🚫 (`obsoleto` — superseded por DEC-0007)
- [[DEC-0005 Autenticación y modelo de roles]]
- [[DEC-0006 Destino como entidad de catálogo]]
- [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] (supersede a [[DEC-0004 Comisión configurable por porcentaje]])
- [[DEC-0008 Autenticación propia y rol de vendedor freelance]] (amplía a [[DEC-0005 Autenticación y modelo de roles]])
- [[DEC-0009 Operador-Proveedor como entidad de catálogo]] (13ª entidad [[Operador]])
- [[DEC-0010 Notación de los diagramas de actividad y de secuencia]] (formalizada 29/09)
- [[DEC-0011 Infraestructura de despliegue on-premise]] (formalizada 29/09)
- [[DEC-0012 Modelo de IA del producto]] (formalizada 29/09)

## Todas (Dataview)
```dataview
TABLE estado, decisores, fecha_aprobacion
FROM "05-Diseño/Decisiones"
SORT file.name ASC
```

## Cómo agregar una decisión
Nueva nota con la plantilla [[PL-Decisión (ADR)]], numeración correlativa `DEC-####`. Si reemplaza a otra, completar `supersede:` y marcar la vieja `#estado/obsoleto`.
