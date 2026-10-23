"""Índice único sobre el nombre normalizado del operador (T-033, RF-094, DEC-0009).

Misma expresión que `rumbo.datos.modelos.base.nombre_normalizado`, igual que la de destinos
(0002): hace cumplir en la base lo que el servicio chequea antes de insertar.

Revision ID: 0004
Revises: 0003
"""

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
CREATE UNIQUE INDEX operador_nombre_normalizado_uq ON operador (
    regexp_replace(btrim(lower(translate(nombre, 'áéíóúüÁÉÍÓÚÜ', 'aeiouuaeiouu'))), '\\s+', ' ', 'g')
)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX operador_nombre_normalizado_uq")
