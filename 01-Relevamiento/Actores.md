---
tipo: actor
estado: formalizado
responsable: equipo
pc: pc1
actualizado: 10/09/26
---
# Actores

tags:: #tipo/actor #estado/formalizado #pc/pc1

> En una PyME una misma persona puede cubrir varios roles. Roles y visibilidad definidos en [[DEC-0005 Autenticación y modelo de roles]].

## Empleado / Asesor — *usuario principal*
Recibe consultas, gestiona clientes, cotiza, arma viajes y controla pagos y alertas. **Ve toda la agencia** (lectura global) y organiza **lo suyo** mediante la vista personal; su agenda de alertas es propia ([[DEC-0005 Autenticación y modelo de roles]]). Se modela como [[Usuario]] con rol `empleado`.
Casos de uso: [[CU-01 De la consulta a la venta]].

## Administrador — *configuración y operación*
Gestiona usuarios y configura parámetros del negocio (p. ej. el `%comisión`, ver [[DEC-0004 Comisión configurable por porcentaje]]). **Ve toda la empresa.** [[Usuario]] con rol `admin`.

## Dueño/a — *visión del negocio*
Propietaria de la agencia: visión total, reportes y estadísticas. **Ve toda la empresa.** [[Usuario]] con rol `dueño`.

## Encargado de redes — *función asignable, no un rol*
Planifica el calendario de contenido y usa el tablero kanban ([[ContenidoRed]]). No es un rol propio: es una **capacidad de acceso al módulo de redes** que `admin` o `dueño` asignan a un `empleado` (o cubren ellos mismos). En una PyME suele concentrarse en una persona.

## Pasajero / Cliente — *actor externo*
Recibe cotizaciones y recordatorios, y deja reseñas post-viaje ([[Reseña]]). **No opera el sistema.** Se modela como [[Cliente]] (dato), no como [[Usuario]] (operador).
