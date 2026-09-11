---
tipo: diagrama
estado: en-revision
modulo: []
responsable: Guardián del dominio
pc: pc1
actualizado: 10/09/26
---
# MOC — Modelo de dominio

tags:: #tipo/diagrama #tipo/modulo #estado/en-revision #pc/pc1

> Mapa de las **12 entidades** y su diagrama de clases. Es la *salida*; la verdad de cada entidad vive en su nota (source). Al cambiar una entidad, actualizar este bloque. Un solo editor por vez (ver [[Guía del Vault#3 · Workflow colaborativo]]).

## Entidades
[[Usuario]] · [[Cliente]] · [[Oportunidad]] · [[Viaje]] · [[Pago]] · [[Hotel]] · [[Reseña]] · [[Alerta]] · [[Cotización]] · [[ContenidoRed]] · [[Destino]] · [[RequisitoDestino]] ⚠️(nueva, ratificar)

## Diagrama de clases (borrador)
```mermaid
classDiagram
    class Usuario {
      +UUID id
      +String nombre
      +String rol
    }
    class Cliente {
      +UUID id
      +String nombre
      +String segmento
      +UUID asesorAsignadoId
    }
    class Oportunidad {
      +UUID id
      +String canal
      +String estado
      +UUID responsableId
    }
    class Cotizacion {
      +UUID id
      +Decimal total
      +String estado
    }
    class Viaje {
      +UUID id
      +UUID destinoId
      +String estado
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
    class Pago {
      +UUID id
      +Decimal monto
      +Date vencimiento
      +String estado
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
      +Int puntaje
    }
    class Alerta {
      +UUID id
      +String tipo
      +Date fecha
      +UUID propietarioId
    }
    class ContenidoRed {
      +UUID id
      +String titulo
      +String estadoKanban
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
    Usuario "1" --> "0..*" Oportunidad : responsable
    Usuario "0..1" --> "0..*" Cliente : asesor_asignado
    Usuario "1" --> "0..*" Alerta : propietario
```

> Relación Viaje–Hotel (N:M) y objeto de la Reseña resueltos en [[DEC-0003 Relación Viaje–Hotel y Reseña]].
> `destino` de [[Viaje]] y [[Hotel]] pasó de `String` a FK hacia [[Destino]] (catálogo) — ver [[DEC-0006 Destino como entidad de catálogo]].

## Diagrama ER
- Ver [[DGM-ER]] (modelo relacional para PostgreSQL).

## Pendientes de este diagrama
- Cardinalidad Viaje–Hotel (N:M) y objeto de la `Reseña` (Hotel) → decidido en [[DEC-0003 Relación Viaje–Hotel y Reseña]] (`en-revision`, ratificar en sync).
