---
tipo: decision
estado: formalizado
modulo: [M2]
decisores: [Francisco]
fecha_aprobacion: 25/10/26
supersede:
actualizado: 25/10/26
---
# DEC-0020 Cliente traído por dos asesores

tags:: #tipo/decision #estado/formalizado #pc/pc2

> ✅ **Decidida por Francisco el 25/10/26.** No se va a consultar a la agencia antes de la entrega, así que el equipo toma la decisión. Si más adelante la agencia pide otra regla, se reemplaza con una `DEC-` nueva.

## Contexto
En [[CU-02 Registrar cliente]] A1, un `freelance` puede dar de alta un cliente aunque el sistema le avise que en la agencia ya hay uno con ese contacto. No le muestra los datos del otro cliente, que pertenece a otro asesor (decidido el 24/10/26). Lo que quedó abierto es **quién se queda con el cliente** cuando dos asesores traen a la misma persona. La pregunta era para la agencia, pero no se la va a consultar antes de la entrega.

## Decisión
1. **Cada asesor conserva el registro que cargó.** El cliente existente sigue con su `asesor_asignado`. Si el `freelance` confirma el alta, se crea **un registro aparte a su nombre**. Así nadie ve ni toma los datos de otro asesor (RF-151).
2. **El sistema no fusiona ni reasigna nada solo.** Un posible duplicado confirmado queda como dos clientes.
3. **Lo resuelve la dueña o un admin**, que ven toda la agencia. Pueden reasignar el `asesor_asignado` de cualquiera de los dos registros desde la ficha ([[CU-03 Gestionar ficha del cliente]]). Rumbo no tiene baja de clientes: el registro que sobre queda, y su historial sigue siendo válido.
4. **La comisión sigue al viaje, no al cliente.** Se le paga al vendedor de cada viaje ([[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor|DEC-0007]]), así que tener dos registros no duplica ni quita comisiones.

## Alternativas consideradas
| Opción | Pros | Contras | ¿Elegida? |
|---|---|---|---|
| Cada uno conserva su registro y la dueña o un admin resuelve | Es lo que el sistema ya hace. No expone datos ajenos. Deja la decisión en manos del negocio | Pueden quedar duplicados hasta que alguien los resuelva | ✅ |
| Gana el primero que lo cargó: se bloquea el alta del segundo | No hay duplicados | El freelance pierde la venta, o tiene que esperar a un admin para registrar a su cliente | ❌ |
| Fusión automática o «cliente compartido» | Un solo registro | Expone datos entre asesores. Es funcionalidad nueva y queda fuera del alcance del PC2 | ❌ |

## Justificación
Es la opción que no inventa una regla comercial. El sistema no decide de quién es el cliente: muestra el posible duplicado y deja que lo resuelva quien tiene esa autoridad en la agencia. No hace falta cambiar código.

## Impacto
- CU: [[CU-02 Registrar cliente]] (A1) y [[CU-03 Gestionar ficha del cliente]] (reasignación de asesor).
- Entidades: [[Cliente]] (`asesor_asignado`).
- Código: ninguno. Ya funciona así desde T-040, T-045 y T-048.

## Decisores y fecha
- Decisores: Francisco.
- Aprobada: 25/10/26.

## Vínculo con el código (a partir de PC2)
- Sin cambios de código.

## Estado / supersesión
Vigente. No reemplaza a ninguna decisión.
