---
tipo: decision
estado: en-revision
modulo: [seguridad]
decisores: [Francisco]
fecha_aprobacion:
supersede:
actualizado: 10/09/26
---
# DEC-0005 Autenticación y modelo de roles

tags:: #tipo/decision #estado/en-revision #pc/pc1

## Contexto
[[ARQ — Vista general]] dejaba abierta la autenticación y los roles de [[Usuario]]. El negocio necesita que **cada empleado vea solo su propio trabajo**, pero que el catálogo de hoteles y reseñas sea **compartido** por todos.

## Decisión (parte resuelta)
1. **Roles operativos:** `admin`, `empleado`, `dueño`.
2. **Visibilidad segmentada (autorización a nivel de fila):**
   - El **`empleado`** ve y gestiona **solo lo suyo**: sus [[Oportunidad|Oportunidades]], [[Viaje|Viajes]], [[Cliente|Clientes]] en seguimiento, [[Pago|Pagos]] y [[Alerta|Alertas]] derivados.
   - El **catálogo de [[Hotel|Hoteles]] y [[Reseña|Reseñas]] es compartido**: todos los perfiles lo consultan y aportan.
   - **`admin` y `dueño`** ven todo (toda la empresa) y acceden a configuración y reportes.

## Reconciliación con [[Actores]] (resuelta 10/09/26)
La nota [[Actores]] se actualizó para reflejar estos roles:
- `empleado` reemplaza a `asesor` (usuario principal, ve solo su cartera).
- Se **separa** `admin` (configuración/operación) de `dueño` (visión del negocio); antes eran el mismo actor.
- El **encargado de redes** deja de ser un rol: pasa a ser una **capacidad de acceso al módulo de redes** ([[ContenidoRed]]) que `admin`/`dueño` asignan.

## Pendiente `#accion/decidir`
- **Mecanismo de autenticación:** autenticación propia de la app y/o inicio con **Google (OAuth)**. Aún **no definido** — se decide más adelante.
- **Infraestructura de despliegue:** sigue pendiente, ver [[DEC-0001 Stack tecnológico]] y [[ARQ — Vista general]].

## Impacto
- Afecta: [[Usuario]] (enum `rol`), [[Actores]], [[ARQ — Vista general]] y, de forma transversal, casi todos los casos de uso (filtros por propietario).

## Decisores y fecha
- Decisores: Francisco (10/09/26) — Aprobada: _(pendiente sync)_
