---
tipo: referencia
estado: formalizado
responsable: equipo
actualizado: 10/09/26
---
# Bitácora de sesiones

tags:: #tipo/referencia #estado/formalizado

> Registro cronológico **breve** de cada sesión de trabajo (una entrada por sesión, la más reciente arriba). Es la memoria compartida de "qué se hizo": el vault, no la memoria privada de cada Claude.
>
> **Cómo usarla:** al cerrar la sesión, agregar una entrada corta según [[CLAUDE|CLAUDE.md#Cómo cerrar cada sesión]]. No copiar contenido: enlazar a notas, `DEC-` y commits. Complementa a [[Estado del proyecto]] (que es la foto actual y se mantiene corta).

## Quién es quién (identidad Git)
La **persona** de cada sesión es quien la corre, identificada por su identidad Git (`git config user.name`). Al iniciar sesión, Claude la reconoce y saluda por nombre (ver [[CLAUDE|CLAUDE.md#Cómo entrar en contexto]]).

| Integrante | `user.name` de Git |
|---|---|
| Francisco | `FranLucianoo` |
| Paloma | `palomap2003` |
| Nahuel | _(a completar en su primera sesión)_ |

## Formato
Es **obligatorio** nombrar a la persona que hizo la sesión.
```
## dd/mm/aa — <persona> (<modelo>)
- **Hecho:** …
- **Commits:** <hash>, <hash>
- **Pendiente:** …
```

## 11/09/26 — Francisco (Claude Opus 4.8)
- **Hecho:** **Revisión cruzada de los 17 CU de Paloma y Nahuel** buscando inconsistencias de diseño y gaps de modelado. Resultados: (1) Se resolvió la contradicción de **visibilidad** (Paloma asumía Cliente/calendario globales; Nahuel, cartera propia) definiendo el modelo *lectura global + propiedad para organización* en [[DEC-0005 Autenticación y modelo de roles]] (agrega `asesor_asignado` a [[Cliente]], `responsable` a [[Oportunidad]]/[[Viaje]], `propietario` a [[Alerta]]). (2) Se creó la 12ª entidad **[[RequisitoDestino]]** para cerrar el gap de [[CU-15 Configurar recordatorios por destino]] (actor unificado a `admin`). (3) Se documentó la transición automática `Pago pendiente→vencido` en [[Pago]]. (4) Coherencia de [[Reseña]] entre [[CU-17 Registrar reseña de hotel|CU-17]] (nace `publicada`) y [[CU-29 Eliminar reseña|CU-29]] (baja lógica). (5) Interacción economía↔plan de cuotas ([[CU-10 Registrar economía del viaje|CU-10]] A4 / [[CU-11 Definir plan de cuotas|CU-11]] A5). Se actualizó [[MOC — Modelo de dominio]] (12 entidades, FKs de propiedad) y [[Estado del proyecto]]. **Luego se cruzó el relevamiento en crudo:** la mayoría ya estaba cubierta; se definió el **cotizador por scraping como fuera de alcance**, se creó **[[CU-30 Sugerir recontacto de clientes]]** (CRM proactivo acotado, con opt-out), se modeló el **vencimiento de pago a proveedor por hotel** en `viaje_hotel` ([[DEC-0003 Relación Viaje–Hotel y Reseña]]) y se sumó el **% pagado/checklist** a [[CU-12 Registrar cobro de un pago|CU-12]]. Total: **30 CU** (nuevos atributos: `Cliente.no_recontactar`, `Alerta.tipo=recontacto`, `viaje_hotel.vencimiento_pago_proveedor`).
- **Commits:** a26625d, c8aac09 (revisión CU + tono); + cruce del relevamiento _(este commit)_.
- **Pendiente:** ratificar en la sync con **Paloma y Nahuel** todo lo anterior (impacto de dominio de [[CU-30 Sugerir recontacto de clientes]] y del vencimiento a proveedor); resolver las **preguntas de negocio** abiertas: comisión vs. margen ([[CU-10 Registrar economía del viaje]]), envío de recordatorio al cliente por WhatsApp API (posible CU futuro), y el mecanismo de autenticación (sin definir en [[DEC-0005 Autenticación y modelo de roles]]). Especificar los CU propios de Francisco (siguen en `borrador`, incluido el nuevo [[CU-30 Sugerir recontacto de clientes|CU-30]] y el detalle del vencimiento a proveedor en [[CU-09 Armar itinerario de hoteles|CU-09]]).

## 10/09/26 — Paloma (Claude Opus 4.8)
- **Hecho:** Primera sesión de Paloma. Se configuró su identidad Git (`palomap2003`) y se completó su fila en *Quién es quién*. Especificó sus **8 casos de uso** (todos a `en-revision`): [[CU-02 Registrar cliente|CU-02]] y [[CU-03 Gestionar ficha del cliente|CU-03]] (Clientes); [[CU-16 Gestionar hotel en catálogo|CU-16]], [[CU-17 Registrar reseña de hotel|CU-17]] y [[CU-18 Buscar y recomendar hoteles|CU-18]] (Hoteles); [[CU-19 Planificar contenido en redes|CU-19]] y [[CU-20 Generar propuesta de contenido con IA|CU-20]] (Redes); [[CU-23 Ver calendario de viajes y vencimientos|CU-23]] (Calendario). Ajustes de dominio: [[Hotel]] suma `precio_referencia`, `servicios` y `estado` (activo/cerrado, a ratificar), sincronizado en [[MOC — Modelo de dominio]]; [[ContenidoRed]] fija canales (Instagram · TikTok · WhatsApp ventas) y libera el rol.
- **Commits:** 4d8bb94, 662b582, e6e95e3, 617b5ad, b63c02e.
- **Pendiente:** ratificar en la sync la **visibilidad global** (Cliente, Hotel, calendario) en [[DEC-0005 Autenticación y modelo de roles]]; el atributo `estado` y la política de baja de [[Hotel]]; asignar el rol *Guardián del dominio*. Especificar los CU de Francisco y Nahuel (siguen en `borrador`).

## 10/09/26 — Francisco (Claude Opus 4.8)
- **Hecho:** Se resolvieron tres decisiones de dominio ([[DEC-0003 Relación Viaje–Hotel y Reseña]], [[DEC-0004 Comisión configurable por porcentaje]], [[DEC-0005 Autenticación y modelo de roles]]) y se reconcilió [[Actores]] con los nuevos roles. Se definió el **catálogo completo de casos de uso** (24 CU + núcleo [[CU-01 De la consulta a la venta|CU-01]]) con [[DGM — Casos de uso|diagrama]] y división entre los tres. Se creó el flujo **md-fuente / docx-derivado** ([[Especificación de casos de uso — flujo]]) y la sección [[Entregables — índice]]; se registró **pandoc** en [[Skills compartidas]] y se agregaron punteros en [[CLAUDE|CLAUDE.md]] y el Home. Se instauró esta **bitácora de sesiones** como dinámica de cierre. Se especificó [[CU-04 Registrar consulta]] como ejemplo de referencia y se dejó de versionar `.obsidian/graph.json`. Se amplió el **checklist de PC1** con el set completo de entregables UML (obligatorios vs recomendados), fijando que los diagramas van en Mermaid y el prototipo UI en Figma (MCP). Se agregó la **identidad por sesión**: cada sesión se reconoce por la identidad Git y se registra a nombre de quien la corre (mapa "Quién es quién").
- **Commits:** 20f3cc8, 1bea1f9, f17a0dd, a1dbcf5, 7c6e5fe.
- **Pendiente:** ratificar DEC-0003/0004/0005 y formalizar [[DEC-0001 Stack tecnológico]] en la sync; especificar los CU restantes (en `borrador`); definir mecanismo de autenticación e infraestructura; instalar pandoc al compilar el primer entregable.
