"""Oportunidad: destino y pasajeros opcionales al registrar la consulta (T-167).

CU-04 A3 y DEC-0023: una consulta se registra solo con cliente y canal. `destino_consultado` y
`pasajeros` admiten nulo; el CHECK de pasajeros solo aplica si hay valor. Para cotizar siguen
siendo obligatorios (lo exige el servicio).

Revision ID: 0007
Revises: 0006
"""

from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("oportunidad", "destino_consultado", nullable=True)
    op.alter_column("oportunidad", "pasajeros", nullable=True)
    op.drop_constraint("oportunidad_pasajeros_check", "oportunidad", type_="check")
    op.create_check_constraint(
        "oportunidad_pasajeros_check",
        "oportunidad",
        "pasajeros IS NULL OR pasajeros >= 1",
    )


def downgrade() -> None:
    op.execute("UPDATE oportunidad SET destino_consultado = '' WHERE destino_consultado IS NULL")
    op.execute("UPDATE oportunidad SET pasajeros = 1 WHERE pasajeros IS NULL")
    op.drop_constraint("oportunidad_pasajeros_check", "oportunidad", type_="check")
    op.create_check_constraint("oportunidad_pasajeros_check", "oportunidad", "pasajeros >= 1")
    op.alter_column("oportunidad", "pasajeros", nullable=False)
    op.alter_column("oportunidad", "destino_consultado", nullable=False)
