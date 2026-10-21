---
tipo: regla
estado: borrador
modulo: [seguridad]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
---
# RN-10 Visibilidad por propiedad y rol

tags:: #tipo/regla #estado/borrador #pc/pc2

> Borrador del 21/10/26 (C1). Enuncia como regla el RF-151 y el RF-150, que vienen de [[DEC-0005 Autenticación y modelo de roles]] y [[DEC-0008 Autenticación propia y rol de vendedor freelance]]. La matriz completa sigue en esas decisiones; esta nota no la copia. Falta la aprobación del equipo.

## Enunciado
Qué registros ve y modifica cada [[Usuario]] depende de su **rol** y de **quién es el dueño** del registro, y se controla en cada fila, en todos los módulos.

## Criterios
- **Lectura global para colaborar:** `empleado`, `admin` y `dueño` ven toda la agencia.
- **Propiedad para la responsabilidad:** cada registro tiene un responsable, que sirve para la vista personal y el filtro «lo mío».
- **Escritura mayormente abierta:** salvo configuración y moderación, que quedan en `admin` y `dueño`.
- **La [[Alerta]] es personal** por defecto; `admin` y `dueño` pueden ver la agenda de toda la empresa (RF-078).
- **El `freelance` es la excepción:** solo ve lo suyo. Los [[Cliente|Clientes]] que crea quedan asignados a él (RF-150). Ve el catálogo compartido sin modificarlo.

## Aplica en
- Transversal: todos los casos de uso. En especial [[CU-24 Iniciar sesión]] y [[CU-25 Gestionar usuarios y roles]].

## Origen
RF-150 y RF-151 de [[Requisitos funcionales]]; [[DEC-0005 Autenticación y modelo de roles|DEC-0005]] y [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]. Implementado en el backend con T-012.
