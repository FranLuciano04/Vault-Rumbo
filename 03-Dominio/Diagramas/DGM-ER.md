---
tipo: diagrama
estado: borrador
modulo: []
responsable: Guardián del dominio
pc: pc1
actualizado: 09/09/26
---
# DGM-ER

tags:: #tipo/diagrama #estado/borrador #pc/pc1

> Modelo entidad-relación para **PostgreSQL**. Salida del [[MOC — Modelo de dominio|modelo de dominio]]; mantener sincronizado con las notas de entidad.

```mermaid
erDiagram
    USUARIO ||--o{ VIAJE : gestiona
    USUARIO ||--o{ CONTENIDO_RED : crea
    CLIENTE ||--o{ OPORTUNIDAD : genera
    CLIENTE ||--o{ VIAJE : realiza
    CLIENTE ||--o{ RESENA : deja
    OPORTUNIDAD ||--o{ COTIZACION : produce
    OPORTUNIDAD ||--o| VIAJE : deriva
    VIAJE ||--o{ PAGO : tiene
    VIAJE ||--o{ ALERTA : dispara
    VIAJE }o--|{ HOTEL : incluye
    HOTEL ||--o{ RESENA : recibe
```

## Pendiente
- Tabla intermedia Viaje–Hotel (N:M). Claves foráneas y tipos. `#accion/decidir`
