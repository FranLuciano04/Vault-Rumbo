"""Índice único sobre el nombre normalizado del destino (T-031, RF-090).

Misma expresión que `rumbo.datos.modelos.base.nombre_normalizado`: sin tildes, en minúsculas y
con los espacios colapsados. Hace cumplir en la base lo que el servicio chequea antes de
insertar, para que dos altas simultáneas no dejen dos destinos iguales.

Revision ID: 0002
Revises: 0001
"""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
CREATE UNIQUE INDEX destino_nombre_normalizado_uq ON destino (
    regexp_replace(btrim(lower(translate(nombre, 'áéíóúüÁÉÍÓÚÜ', 'aeiouuaeiouu'))), '\\s+', ' ', 'g')
)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX destino_nombre_normalizado_uq")
