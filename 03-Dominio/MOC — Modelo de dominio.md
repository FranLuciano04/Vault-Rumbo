---
tipo: diagrama
estado: en-revision
modulo: []
responsable: Guardián del dominio
pc: pc1
actualizado: 18/09/26
---
# MOC — Modelo de dominio

tags:: #tipo/diagrama #tipo/modulo #estado/en-revision #pc/pc1

> Mapa de las **13 entidades** y su diagrama de clases. Es la *salida*; la verdad de cada entidad vive en su nota (source). Al cambiar una entidad, actualizar este bloque. Un solo editor por vez (ver [[Guía del Vault#3 · Workflow colaborativo]]).

## Entidades
[[Usuario]] · [[Cliente]] · [[Oportunidad]] · [[Viaje]] · [[Pago]] · [[Hotel]] · [[Reseña]] · [[Alerta]] · [[Cotización]] · [[ContenidoRed]] · [[Destino]] · [[RequisitoDestino]] · [[Operador]] ⚠️(nueva 17/09, [[DEC-0009 Operador-Proveedor como entidad de catálogo]])

## Diagrama de clases (borrador)
```mermaid
classDiagram
    class Usuario {
      +UUID id
      +String nombre
      +String email
      +String rol
    }
    class Cliente {
      +UUID id
      +String nombre
      +String contacto
      +String segmento
      +String[] etiquetas
      +String preferencias
      +Bool noRecontactar
      +UUID asesorAsignadoId
    }
    class Oportunidad {
      +UUID id
      +UUID clienteId
      +String canal
      +String destino
      +Int pasajeros
      +String estado
      +UUID responsableId
    }
    class Cotizacion {
      +UUID id
      +UUID oportunidadId
      +Date fecha
      +String moneda
      +Decimal total
      +String estado
    }
    class Viaje {
      +UUID id
      +UUID clienteId
      +UUID oportunidadId
      +UUID destinoId
      +String estado
      +String moneda
      +Decimal precioVenta
      +Decimal costo
      +Decimal ganancia
      +Decimal margen
      +Decimal comisionVendedor
      +UUID operadorId
      +UUID vendedorId
      +UUID responsableId
    }
    class Destino {
      +UUID id
      +String nombre
      +String pais
      +Bool activo
    }
    class RequisitoDestino {
      +UUID id
      +UUID destinoId
      +String nombre
      +String tipo
      +Bool obligatorio
      +String descripcion
      +Int anticipacionDias
      +Bool activo
    }
    class Operador {
      +UUID id
      +String nombre
      +Bool activo
    }
    class Pago {
      +UUID id
      +UUID viajeId
      +Decimal monto
      +String tipo
      +Date vencimiento
      +String estado
      +String formaPago
      +String monedaPago
      +Decimal tipoCambio
      +Decimal montoCobrado
    }
    class Hotel {
      +UUID id
      +String nombre
      +UUID destinoId
      +String categoria
      +Decimal precioReferencia
      +String servicios
      +String estado
    }
    class Resena {
      +UUID id
      +UUID clienteId
      +UUID hotelId
      +UUID viajeId
      +Int puntaje
      +String comentario
      +Date fecha
      +String estado
    }
    class Alerta {
      +UUID id
      +String tipo
      +Date fecha
      +String estado
      +UUID propietarioId
    }
    class ContenidoRed {
      +UUID id
      +UUID usuarioId
      +String titulo
      +String canal
      +String estadoKanban
      +Date fechaPublicacion
    }

    Cliente "1" --> "0..*" Oportunidad
    Cliente "1" --> "0..*" Viaje
    Cliente "1" --> "0..*" Resena
    Oportunidad "1" --> "0..*" Cotizacion
    Oportunidad "1" --> "0..1" Viaje
    Viaje "1" --> "0..*" Pago
    Viaje "1" --> "0..*" Alerta
    Viaje "0..*" --> "0..*" Hotel : viaje_hotel
    Hotel "1" --> "0..*" Resena
    Destino "1" --> "0..*" Viaje
    Destino "1" --> "0..*" Hotel
    Destino "1" --> "0..*" RequisitoDestino
    Usuario "1" --> "0..*" ContenidoRed
    Usuario "1" --> "0..*" Viaje : gestiona
    Usuario "0..1" --> "0..*" Viaje : vendedor
    Usuario "1" --> "0..*" Oportunidad : responsable
    Usuario "0..1" --> "0..*" Cliente : asesor_asignado
    Usuario "1" --> "0..*" Alerta : propietario
    Operador "0..1" --> "0..*" Viaje : provee
```

> Relación Viaje–Hotel (N:M) y objeto de la Reseña resueltos en [[DEC-0003 Relación Viaje–Hotel y Reseña]].
> `destino` de [[Viaje]] y [[Hotel]] pasó de `String` a FK hacia [[Destino]] (catálogo) — ver [[DEC-0006 Destino como entidad de catálogo]].
> [[Viaje]] gana el bloque económico (`moneda`, `costo`, `ganancia`, `margen`, `vendedor`, `comision_vendedor`) y FK `operador` — ver [[DEC-0007 Modelo económico — ganancia, margen y comisión de vendedor]] y [[DEC-0009 Operador-Proveedor como entidad de catálogo]] (sync 17/09).
> **18/09 (entrevista grill):** se completaron los atributos del diagrama de clases para que quede coherente con las notas fuente ([[Pago]] con `forma_pago`/`moneda_pago`/`tipo_cambio`/`monto_cobrado`/estado `anulado`; [[Cliente]] con `contacto`/`preferencias`/`no_recontactar`; [[Reseña]], [[Cotización]], [[Alerta]] con sus atributos y FKs). `canal` de [[Oportunidad]] suma `presencial` y `segmento` de [[Cliente]] suma `pareja`.

## Diagrama ER
- Ver [[DGM-ER]] (modelo relacional para PostgreSQL).

## Pendientes de este diagrama
- Cardinalidad Viaje–Hotel (N:M) y objeto de la `Reseña` (Hotel) → decidido en [[DEC-0003 Relación Viaje–Hotel y Reseña]] (`en-revision`, ratificar en sync).
