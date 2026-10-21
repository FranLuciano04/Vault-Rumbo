---
tipo: regla
estado: formalizado
modulo: [seguridad]
responsable: Francisco
pc: pc2
actualizado: 21/10/26
fecha_aprobacion: 21/10/26
---
# RN-10 Visibilidad por propiedad y rol

tags:: #tipo/regla #estado/formalizado #pc/pc2

## Enunciado
Los registros que cada [[Usuario]] puede ver y modificar dependen de su rol y del responsable de cada registro. El control se aplica registro por registro, en todos los módulos.

## Criterios
- **Lectura global para colaborar:** los roles `empleado`, `admin` y `dueño` ven toda la agencia.
- **Propiedad para la responsabilidad:** cada registro tiene un responsable, que define la vista personal de cada usuario.
- **Escritura mayormente abierta:** la configuración y la moderación quedan reservadas a `admin` y `dueño`.
- **Alertas personales:** cada [[Alerta]] pertenece a un usuario; `admin` y `dueño` pueden consultar la agenda de toda la empresa (RF-078).
- **Excepción del `freelance`:** solo ve lo propio. Los [[Cliente|Clientes]] que crea quedan asignados a él (RF-150). Consulta el catálogo compartido sin modificarlo.

## Aplica en
- Alcance transversal: todos los casos de uso, en particular [[CU-24 Iniciar sesión]] y [[CU-25 Gestionar usuarios y roles]].

## Origen
RF-150 y RF-151 de [[Requisitos funcionales]]. Los roles se describen en [[Actores]].

## 🔎 Revisión
> ✅ **Aprobado y formalizado en la sync del 21/10/26.** Redactado el 21/10/26 (Francisco, recomendado C1 del PC1). Enuncia como regla RF-150 y RF-151, que vienen de [[DEC-0005 Autenticación y modelo de roles|DEC-0005]] y [[DEC-0008 Autenticación propia y rol de vendedor freelance|DEC-0008]]; la matriz completa de visibilidad sigue en esas decisiones. En el backend se implementó con T-012.
