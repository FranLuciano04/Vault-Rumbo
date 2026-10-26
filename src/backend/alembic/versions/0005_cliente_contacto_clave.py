"""Clave canónica del contacto del cliente, para detectar duplicados (RF-003, DEC-0019).

Revision ID: 0005
Revises: 0004
"""

import sqlalchemy as sa

from alembic import op
from rumbo.core.contacto import clave_contacto

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cliente", sa.Column("contacto_clave", sa.String(length=200), nullable=True))
    conexion = op.get_bind()
    filas = conexion.execute(sa.text("SELECT id, contacto FROM cliente")).all()
    for id_, contacto in filas:
        conexion.execute(
            sa.text("UPDATE cliente SET contacto_clave = :clave WHERE id = :id"),
            {"clave": clave_contacto(contacto), "id": id_},
        )
    op.alter_column("cliente", "contacto_clave", nullable=False)
    op.create_index("ix_cliente_contacto_clave", "cliente", ["contacto_clave"])


def downgrade() -> None:
    op.drop_index("ix_cliente_contacto_clave", table_name="cliente")
    op.drop_column("cliente", "contacto_clave")
