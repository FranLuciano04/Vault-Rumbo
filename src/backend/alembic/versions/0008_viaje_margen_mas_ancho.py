"""Viaje: `margen` admite márgenes negativos extremos (T-090).

CU-10 A3: la economía se guarda aunque el costo supere la venta. Con `numeric(7,4)` un margen
menor a -999,9999 (p. ej. venta 1, costo 5000) desbordaba la columna generada. Postgres no deja
cambiar el tipo de una columna generada: se borra y se vuelve a crear con la misma expresión.
El downgrade vuelve a `numeric(7,4)` y falla si algún viaje tiene un margen que no entra.

Revision ID: 0008
Revises: 0007
"""

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def _recrear_margen(tipo: str) -> None:
    op.execute("ALTER TABLE viaje DROP COLUMN margen")
    op.execute(
        f"ALTER TABLE viaje ADD COLUMN margen {tipo} GENERATED ALWAYS AS ("
        "CASE WHEN precio_venta > 0 THEN (precio_venta - costo) / precio_venta END"
        ") STORED"
    )


def upgrade() -> None:
    _recrear_margen("numeric(20,4)")


def downgrade() -> None:
    _recrear_margen("numeric(7,4)")
