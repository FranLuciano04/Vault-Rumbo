# CLAUDE.md — protocolo de trabajo de Rumbo

Este repositorio es el cerebro compartido del proyecto **Rumbo**, un CRM para agencias de turismo PyME. El historial del chat no es memoria confiable ni compartida: las decisiones, avances y pendientes persistentes deben quedar escritos en el vault y versionados con Git.

Este archivo es un mapa operativo. No reemplaza las fuentes de verdad y debe mantenerse corto.

## Cómo entrar en contexto

Al iniciar cada sesión:

1. Ejecutar `git status` y preservar cualquier cambio local existente.
2. Si el árbol está limpio, ejecutar `git pull --ff-only origin main` para trabajar sobre la última versión.
3. Leer `00-Inicio/Estado del proyecto.md`.
4. Leer `06-Desarrollo/Claude Code — memoria del proyecto.md`.
5. Leer solo las notas relacionadas con la tarea, entrando por el MOC correspondiente.
6. Consultar las decisiones `DEC-` relacionadas antes de proponer o implementar un cambio.

No cargar todo el vault por defecto. Usar rutas, enlaces `[[ ]]`, prefijos e índices para aplicar revelación progresiva.

### Rutas según el tipo de tarea

| Tema | Entrada principal |
|---|---|
| Estado, próximos pasos y bloqueos | `00-Inicio/Estado del proyecto.md` |
| Forma de trabajo del equipo | `00-Inicio/Trabajo en equipo — Git y memoria.md` |
| Necesidades y límites del negocio | `01-Relevamiento/Relevamiento — Fuente de verdad.md` |
| Casos de uso y reglas | `02-Analisis/MOC — Casos de uso.md` |
| Entidades y relaciones | `03-Dominio/MOC — Modelo de dominio.md` |
| Módulos funcionales | `04-Modulos/MOD-*.md` |
| Decisiones técnicas | `05-Diseño/MOC — Decisiones (ADR).md` |
| Arquitectura | `05-Diseño/Arquitectura/ARQ — Vista general.md` |
| Stack y convenciones para código | `05-Diseño/Decisiones/DEC-0001 Stack tecnológico.md` |
| Avances de implementación | `06-Desarrollo/Bitácora técnica.md` |

Seguir los enlaces desde estas notas y abrir únicamente el detalle necesario para la tarea actual.

## Orden de autoridad del cerebro

Cuando haya contradicciones, aplicar este orden:

1. `01-Relevamiento/Relevamiento — Fuente de verdad.md` para hechos y necesidades del negocio.
2. Decisiones `DEC-` aprobadas.
3. Reglas, casos de uso y entidades según su estado de madurez.
4. Diagramas Mermaid, que son salidas derivadas de las notas anteriores.
5. `06-Desarrollo/Claude Code — memoria del proyecto.md`, que es un resumen y puntero.
6. Este `CLAUDE.md`, que define el proceso pero no el dominio.

Una contradicción relevante se señala y se resuelve mediante una `DEC-`; no se elige silenciosamente una versión.

## Reglas de trabajo durante la sesión

- Escribir en español de Argentina, con tildes.
- Usar ARS para importes y `dd/mm/aa` para fechas de negocio.
- Mantener los nombres del lenguaje ubicuo: `Cliente`, `Oportunidad`, `Cotización`, `Viaje`, `Pago`, `Alerta`, `Hotel`, `Reseña`, `Usuario` y `ContenidoRed`.
- Crear diagramas de diseño en Mermaid para que sean versionables.
- Respetar el alcance: no implementar pagos online, publicación automática en redes, GDS/mayoristas ni facturación de fase 2.
- Tratar todo `#accion/decidir`, `pendiente` o documento `en-revision` como una decisión abierta.
- No formalizar una nota ni completar `fecha_aprobacion` sin aprobación explícita del equipo.
- No inventar datos del negocio. Si falta información, avanzar con una propuesta claramente marcada como borrador o pendiente.
- Preservar cambios ajenos y archivos no relacionados. Nunca resolver un conflicto descartando el aporte de otra persona.
- No editar en paralelo un bloque Mermaid compartido; comprobar primero su responsable y el estado del archivo.
- No guardar secretos, tokens, credenciales ni archivos `.env` en Git.
- No modificar `git config user.name` ni `user.email`: cada commit debe conservar la identidad configurada por la persona que usa la sesión.

## Cómo actualizar el cerebro

Todo resultado que deba sobrevivir al chat se guarda según su naturaleza:

| Resultado | Destino |
|---|---|
| Avance, bloqueo o próximo paso | `00-Inicio/Estado del proyecto.md` |
| Decisión y justificación | nueva o existente `05-Diseño/Decisiones/DEC-####` |
| Cambio funcional | caso de uso, regla o módulo correspondiente |
| Cambio de dominio | entidad correspondiente y luego sus diagramas derivados |
| Cambio arquitectónico o de stack | `ARQ — Vista general.md` y una `DEC-` |
| Avance de código desde PC2 | `06-Desarrollo/Bitácora técnica.md` |
| Nueva convención estable para los agentes | memoria lean y, solo si es necesario, este archivo |

Actualizar primero la nota fuente y después sus MOC, enlaces o diagramas. Evitar copiar el mismo contenido en varios lugares; usar punteros.

## Cómo cerrar cada sesión

Antes de considerar terminada una tarea:

1. Verificar que el resultado solicitado esté completo.
2. Actualizar la memoria correspondiente y retirar los `#accion/...` que realmente se hayan resuelto.
3. Revisar `git diff` y `git status`.
4. Comprobar enlaces internos y render de Mermaid si fueron modificados.
5. Crear un commit pequeño y descriptivo con la identidad Git del usuario actual.
6. Ejecutar `git pull --rebase origin main` para integrar cambios remotos.
7. Resolver cualquier conflicto conservando ambos aportes y volver a validar.
8. Ejecutar `git push origin main`, salvo que el usuario haya pedido explícitamente mantener el trabajo local.
9. Informar qué cambió, qué se verificó, el hash del commit y cualquier decisión todavía pendiente.

Para documentación de PC1 se trabaja con commits pequeños sobre `main`. Desde PC2, el código se desarrolla en ramas `feature/...` y se integra mediante pull requests; los commits deben referenciar las reglas o decisiones relevantes.

## Contexto que puede cambiar

No inferir la fase ni la prioridad actual desde este archivo: leer siempre `00-Inicio/Estado del proyecto.md`. El stack detallado vive en `DEC-0001` y la infraestructura de despliegue sigue a definir; el servidor on-premise es solo una alternativa.
