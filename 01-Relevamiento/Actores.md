---
tipo: actor
estado: formalizado
responsable: equipo
pc: pc1
actualizado: 17/09/26
---
# Actores

tags:: #tipo/actor #estado/formalizado #pc/pc1

En una PyME una misma persona puede cubrir varios roles.

> Roles y visibilidad definidos en [[DEC-0005 Autenticación y modelo de roles]] y [[DEC-0008 Autenticación propia y rol de vendedor freelance]] (rol `freelance` + autenticación propia).

## Empleado / Asesor — *usuario principal*
Recibe consultas, gestiona clientes, cotiza, arma viajes y controla pagos y alertas. **Ve toda la agencia** (lectura global) y organiza **lo suyo** mediante la vista personal; su agenda de alertas es propia ([[DEC-0005 Autenticación y modelo de roles]]). Se modela como [[Usuario]] con rol `empleado`.
Casos de uso: [[CU-01 De la consulta a la venta]].

## Administrador — *configuración y operación*
Gestiona usuarios y configura parámetros del negocio (p. ej. la **comisión por defecto de cada vendedor**, ver [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]]). **Ve toda la empresa.** [[Usuario]] con rol `admin`.

## Dueño/a — *visión del negocio*
Propietaria de la agencia: visión total, reportes y estadísticas. **Ve toda la empresa.** [[Usuario]] con rol `dueño`.

## Vendedor freelance — *operador externo con acceso acotado*
Vendedor externo que carga sus **propias** ventas y clientes. A diferencia del `empleado`, **ve solo lo suyo** (bloqueo de lectura fuera de sus clientes/operaciones); sí ve el catálogo compartido (sin modificarlo: no da de alta ni edita hoteles ni registra reseñas) y sus propias comisiones. Se modela como [[Usuario]] con rol `freelance` ([[DEC-0008 Autenticación propia y rol de vendedor freelance]]).

## Encargado de redes — *función asignable, no un rol*
Planifica el calendario de contenido y usa el tablero kanban ([[ContenidoRed]]). No es un rol propio: es una **capacidad de acceso al módulo de redes** que `admin` o `dueño` asignan a un `empleado` (o cubren ellos mismos). En una PyME suele concentrarse en una persona.

## Pasajero / Cliente — *actor externo*
Recibe cotizaciones y recordatorios, y deja reseñas post-viaje ([[Reseña]]). **No opera el sistema.** Se modela como [[Cliente]] (dato), no como [[Usuario]] (operador).
