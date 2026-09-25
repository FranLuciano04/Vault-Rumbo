---
tipo: diagrama
estado: en-revision
modulo: []
responsable: Guardián del dominio
pc: pc1
actualizado: 21/09/26
---
# MOC — Modelo de dominio

tags:: #tipo/diagrama #tipo/modulo #estado/en-revision #pc/pc1

> Mapa de las **13 entidades** y su diagrama de clases. Es la *salida*; la verdad de cada entidad vive en su nota (source). Al cambiar una entidad, actualizar este bloque. Un solo editor por vez (ver [[Guía del Vault#3 · Workflow colaborativo]]).

## Entidades
[[Usuario]] · [[Cliente]] · [[Oportunidad]] · [[Viaje]] · [[Pago]] · [[Hotel]] · [[Reseña]] · [[Alerta]] · [[Cotización]] · [[ContenidoRed]] · [[Destino]] · [[RequisitoDestino]] · [[Operador]] ⚠️(nueva 17/09, [[DEC-0009 Operador-Proveedor como entidad de catálogo]])

## Diagrama de clases
- Ver [[DGM — Diagrama de clases]] (vista principal + las 18 enumeraciones). **El borrador que vivía acá se movió a esa nota el 21/09**, para que este MOC quede corto y haya una sola fuente del diagrama.
- Cambios respecto del borrador: los FK dejan de listarse como atributos (los expresan las asociaciones), las enumeraciones pasan a clases `<<enumeration>>` y `viaje_hotel` se promueve a la clase asociativa `ViajeHotel`. Detalle y motivo en la sección *Convenciones de lectura* de esa nota.
- Las **4 incoherencias detectadas las resolvió Nahuel el 21/09** (a ratificar en sync) y ya están propagadas a [[DGM-ER]] y a la nota de [[Viaje]]: `Viaje`–`Pago` es **`1..*`** (todo viaje tiene al menos un pago: [[CU-07 Confirmar reserva]] incluye [[CU-11 Definir plan de cuotas|CU-11]]), `Viaje`–`Alerta` es **`0..1` → `0..*`**, el **origen de la `Alerta`** en el ER se modela con **cuatro FK nullable + CHECK** (no polimórfico), y `Cotización.items` **queda como atributo**, sin entidad propia.
- ✅ El [[DGM-ER]] quedó **completo** el 21/09: atributos de las 14 tablas y las 4 relaciones que le faltaban (`USUARIO`–`ALERTA`, `USUARIO`–`CLIENTE`, `USUARIO`–`OPORTUNIDAD`, `DESTINO`–`REQUISITO_DESTINO`). Los dos diagramas usan el motor **ELK** (líneas rectas ortogonales).

> Relación Viaje–Hotel (N:M) y objeto de la Reseña resueltos en [[DEC-0003 Relación Viaje–Hotel y Reseña]].
> `destino` de [[Viaje]] y [[Hotel]] pasó de `String` a FK hacia [[Destino]] (catálogo) — ver [[DEC-0006 Destino como entidad de catálogo]].
> [[Viaje]] gana el bloque económico (`moneda`, `costo`, `ganancia`, `margen`, `vendedor`, `comision_vendedor`) y FK `operador` — ver [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] y [[DEC-0009 Operador-Proveedor como entidad de catálogo]] (sync 17/09).
> **18/09 (entrevista grill):** se completaron los atributos del diagrama de clases para que quede coherente con las notas fuente ([[Pago]] con `forma_pago`/`moneda_pago`/`tipo_cambio`/`monto_cobrado`/estado `anulado`; [[Cliente]] con `contacto`/`preferencias`/`no_recontactar`; [[Reseña]], [[Cotización]], [[Alerta]] con sus atributos y FKs). `canal` de [[Oportunidad]] suma `presencial` y `segmento` de [[Cliente]] suma `pareja`.

## Diagrama ER
- Ver [[DGM-ER]] (modelo relacional para PostgreSQL).

## Imágenes exportadas
Los 11 diagramas de dominio están exportados a PNG en `03-Dominio/Diagramas/img/`: `DGM-clases.png` (vista principal), `DGM-clases-enums-1..3.png` (las tres bandas de enumeraciones), `DGM-ER.png` y `EST-<Clase>.png` para los seis de estado. **La fuente sigue siendo el bloque Mermaid de cada nota**: si se cambia un diagrama, se regeneran todos con `bash "07-Entregables/build/render-diagramas-dominio.sh"`.

## Diagramas de estado
Especificaciones en `03-Dominio/Diagramas/Estados/` — **una nota por clase, autosuficiente**: quien dibuje el diagrama no necesita abrir los CU. Cada una trae estados, transiciones (evento, actor, CU, guarda, efectos), invariantes y los huecos detectados. Cada una suma además **"Para qué se creó cada transición poco obvia"**: el caso concreto que justifica cada flecha que no se explica sola, para no tener que reconstruirlo de memoria en la sync.

| Clase | Nota | Estados | Dibujado |
|---|---|---|---|
| [[Viaje]] | [[EST-Viaje]] | `reservado · vendido · confirmado · en curso · finalizado · cancelado` | ✅ 21/09 |
| [[Oportunidad]] | [[EST-Oportunidad]] | `nueva · en_gestión · cotizada · ganada · perdida` | ✅ 21/09 |
| [[Pago]] | [[EST-Pago]] | `pendiente · pagado · vencido · anulado` | ✅ 21/09 |
| [[Cotización]] | [[EST-Cotización]] | `borrador · enviada · aceptada · rechazada · vencida` ⚠️nuevo | ✅ 21/09 |
| [[Alerta]] | [[EST-Alerta]] | `pendiente · vista · resuelta` | ✅ 21/09 |
| [[ContenidoRed]] | [[EST-ContenidoRed]] | `idea · en producción · listo · publicado · descartado` ⚠️nuevo | ✅ 21/09 |

✅ **Los 6 están especificados y dibujados** (21/09). Convención común (motor ELK, etiqueta `Tn · evento`, `⚙` automática, `↺` corrección, color por tipo de estado): ver la sección *Convenciones del diagrama* de cualquiera de las notas. ✅ Los **25 huecos** detectados al especificarlos **se resolvieron el 21/09** (a ratificar en la sync): ver la sección *"Huecos — resueltos"* de cada nota.

> [[Hotel]] (`activo · cerrado`) y [[Reseña]] (`publicada · oculta`) tienen `estado` pero **no llevan diagrama**: son bajas lógicas de dos estados. [[Destino]], [[Operador]] y [[RequisitoDestino]] usan un `activo` booleano, que tampoco es una máquina de estados.

## Diagramas de actividad
En `03-Dominio/Diagramas/Actividad/` (PNG en `img/`, se regeneran con `render-diagramas-actividad.sh`). Notación en [[DEC-0010 Notación de los diagramas de actividad y de secuencia]].
- [[DGM-ACT — De la consulta a la venta]] · [[DGM-ACT — Confirmar reserva]] · [[DGM-ACT — Registrar cobro de un pago]] · [[DGM-ACT — Cancelar viaje]] · [[DGM-ACT — Proceso automático diario]]

## Diagramas de secuencia
En `03-Dominio/Diagramas/Secuencia/` (PNG en `img/`, se regeneran con `render-diagramas-secuencia.sh`; el de consulta a venta, desde `build-relevamiento.sh`).
- Vista de negocio: [[DGM-SEC — De la consulta a la venta]] (Figura 1 del relevamiento).
- De análisis, con las clases como participantes: [[DGM-SEC — Confirmar reserva]] · [[DGM-SEC — Registrar cobro de un pago]] · [[DGM-SEC — Cancelar viaje]]

## Pendientes de este diagrama
- Cardinalidad Viaje–Hotel (N:M) y objeto de la `Reseña` (Hotel) → decidido en [[DEC-0003 Relación Viaje–Hotel y Reseña]] (`en-revision`, ratificar en sync).
