---
tipo: actor
estado: formalizado
responsable: equipo
pc: pc1
actualizado: 09/09/26
---
# Actores

tags:: #tipo/actor #estado/formalizado #pc/pc1

> En una PyME una misma persona puede cubrir varios roles.

## Agente / Asesor — *usuario principal*
Recibe consultas, gestiona clientes, cotiza, arma viajes y controla pagos y alertas. Se modela como [[Usuario]] con rol `asesor`.
Casos de uso: [[CU-01 De la consulta a la venta]].

## Administrador / Dueña — *configuración*
Configura comisiones, gestiona usuarios y consulta reportes y estadísticas. [[Usuario]] con rol `admin`.

## Encargado de redes — *marketing*
Planifica el calendario de contenido, genera propuestas y usa el tablero kanban ([[ContenidoRed]]). [[Usuario]] con rol `marketing`.

## Pasajero / Cliente — *actor externo*
Recibe cotizaciones y recordatorios, y deja reseñas post-viaje. **No opera el sistema.** Se modela como [[Cliente]] (dato), no como [[Usuario]] (operador).
