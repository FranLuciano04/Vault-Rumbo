"""Hotel: categoría y precio de referencia opcionales, servicios vacíos por defecto (T-076).

CU-16 y RF-098 solo exigen nombre y destino para dar de alta un hotel.

Revision ID: 0006
Revises: 0005
"""

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("hotel", "categoria", nullable=True)
    op.alter_column("hotel", "precio_referencia", nullable=True)
    op.alter_column("hotel", "servicios", server_default="")


def downgrade() -> None:
    op.alter_column("hotel", "servicios", server_default=None)
    op.execute("UPDATE hotel SET categoria = '' WHERE categoria IS NULL")
    op.execute("UPDATE hotel SET precio_referencia = 0 WHERE precio_referencia IS NULL")
    op.alter_column("hotel", "precio_referencia", nullable=False)
    op.alter_column("hotel", "categoria", nullable=False)
