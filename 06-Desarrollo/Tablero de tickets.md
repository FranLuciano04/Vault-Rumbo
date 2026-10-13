---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 12/10/26
---
# Tablero de tickets

tags:: #tipo/referencia #estado/formalizado #pc/pc2

> Vista en vivo de los tickets (Dataview). El proceso está en [[Flujo de implementación]] y las dependencias en [[Grafo de tickets]]. Los estados los cambia `06-Desarrollo/herramientas/tickets.mjs`, no a mano.

## Tomados ahora
```dataview
TABLE WITHOUT ID file.link AS "Ticket", asignado AS "Quién", tomado_el AS "Desde", modulo AS "Módulo", capa AS "Capa", riesgo AS "Riesgo"
FROM "06-Desarrollo/Tickets"
WHERE estado = "tomado"
SORT tomado_el ASC
```

## Bloqueados
```dataview
TABLE WITHOUT ID file.link AS "Ticket", modulo AS "Módulo", depende_de AS "Depende de"
FROM "06-Desarrollo/Tickets"
WHERE estado = "bloqueado"
```

## Todos, por módulo
```dataview
TABLE WITHOUT ID file.link AS "Ticket", estado AS "Estado", asignado AS "Quién", capa AS "Capa", tamaño AS "Tamaño", riesgo AS "Riesgo", depende_de AS "Depende de", modelo_impl AS "Impl."
FROM "06-Desarrollo/Tickets"
WHERE id
SORT modulo ASC, id ASC
```

## Avance por módulo
```dataview
TABLE WITHOUT ID modulo AS "Módulo", length(rows) AS "Tickets", length(filter(rows, (r) => r.estado = "hecho")) AS "Hechos", length(filter(rows, (r) => r.estado = "tomado")) AS "Tomados"
FROM "06-Desarrollo/Tickets"
WHERE id
GROUP BY modulo
SORT modulo ASC
```
