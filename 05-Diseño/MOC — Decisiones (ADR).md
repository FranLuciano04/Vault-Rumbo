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
- [[DEC-0013 Datos que faltaban en el ER]] (formalizada el 30/09/26)
- [[DEC-0014 Flujo de implementación con agentes]] (formalizada el 12/10/26; ajusta la estructura de DEC-0001 a `src/`)
- [[DEC-0015 Decisiones de implementación]] (formalizada el 13/10/26; grill de la fase 0: sesión, contraseñas, UI, contrato por módulo, CI y calidad; sus §2 y §3 los reemplaza DEC-0016)
- [[DEC-0016 Autenticación con Firebase]] (formalizada el 13/10/26; reemplaza DEC-0008 §1 y DEC-0015 §2 y §3)
- [[DEC-0017 Contacto mínimo del cliente]] (formalizada el 22/10/26): el contacto mínimo es teléfono/WhatsApp o email; el usuario de Instagram se guarda como dato opcional.
- [[DEC-0018 Revocación de sesiones de Firebase]] (formalizada el 23/10/26): la API no comprueba la revocación del token en cada pedido; el acceso se corta con `Usuario.activo` y se acepta una ventana de hasta 1 h para los cortes hechos solo en Firebase.
- [[DEC-0019 Las fallas se arreglan al encontrarlas]] (formalizada el 24/10/26): una falla se arregla en el ticket en curso o en una rama `fix/…`, sin crear un ticket; vale también para los hallazgos de Codex. Reemplaza en parte a DEC-0014.
- [[DEC-0020 Cliente traído por dos asesores]] (formalizada el 25/10/26): cuando dos asesores traen al mismo cliente, cada uno conserva su registro y la dueña o un admin resuelve el duplicado reasignando el asesor. El sistema no fusiona nada solo.
- [[DEC-0021 Correcciones del viaje y monto de un pago]] (formalizada el 25/10/26): la corrección del viaje sigue a EST-Viaje T7 (desde `en curso` y `finalizado`; al deshacer un finalizado se cierra la alerta de reseña), y el monto de un pago se cambia rebalanceando el plan o dividiendo, no con el PATCH del pago.
- [[DEC-0022 Suite completa solo en el CI]] (en revisión, borrador del 27/10/26): el paso 6 de `/implementar-ticket` corre en la PC solo lint, type-check y los tests del ticket y sus vecinos; la suite completa y la cobertura quedan para el CI, salvo que el ticket toque código compartido.
- [[DEC-0023 Datos mínimos de la consulta]] (en revisión, borrador del 27/10/26): propone que destino y pasajeros sean opcionales al registrar una consulta, para que el contrato coincida con CU-04 A3 y RF-013 (mínimo: cliente y canal).

## Todas (Dataview)
```dataview
TABLE estado, decisores, fecha_aprobacion
FROM "05-Diseño/Decisiones"
SORT file.name ASC
```

## Cómo agregar una decisión
Nueva nota con la plantilla [[PL-Decisión (ADR)]], numeración correlativa `DEC-####`. Si reemplaza a otra, completar `supersede:` y marcar la vieja `#estado/obsoleto`.
