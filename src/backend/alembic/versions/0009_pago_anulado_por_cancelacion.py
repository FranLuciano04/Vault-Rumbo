"""Pago: marca de los anulados por la cancelación del viaje (T-099, CU-27 A3, EST-Pago T10).

Revertir la cancelación reabre solo los pagos que anuló la cancelación: los que ya estaban
anulados por un cambio del plan (CU-11 A4) siguen anulados. La marca solo vale en un pago
`anulado`.

Revision ID: 0009
Revises: 0008
"""

import sqlalchemy as sa

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "pago",
        sa.Column(
            "anulado_por_cancelacion", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
    )
    op.create_check_constraint(
        "pago_anulado_por_cancelacion_ck",
        "pago",
        "NOT anulado_por_cancelacion OR estado = 'anulado'",
    )


def downgrade() -> None:
    op.drop_constraint("pago_anulado_por_cancelacion_ck", "pago", type_="check")
    op.drop_column("pago", "anulado_por_cancelacion")
