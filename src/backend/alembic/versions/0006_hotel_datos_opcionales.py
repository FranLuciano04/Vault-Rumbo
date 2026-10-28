"""Hotel: datos opcionales, servicios como lista e índice único del nombre (T-076).

CU-16 y RF-098 solo exigen nombre y destino para dar de alta un hotel: `categoria` y
`precio_referencia` admiten nulo y `servicios` pasa de texto a `text[]` (vacío por defecto). El
índice único parcial hace cumplir en la base el duplicado de RF-099 (mismo destino y nombre
normalizado, solo hoteles activos), como el de `destino` en 0002.

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
    op.execute("ALTER TABLE hotel ALTER COLUMN servicios DROP DEFAULT")
    op.execute(
        """
ALTER TABLE hotel ALTER COLUMN servicios TYPE text[] USING
    CASE WHEN btrim(servicios) = '' THEN '{}'::text[]
         ELSE regexp_split_to_array(btrim(servicios), '\s*,\s*') END
        """
    )
    op.execute("ALTER TABLE hotel ALTER COLUMN servicios SET DEFAULT '{}'")
    op.execute(
        """
CREATE UNIQUE INDEX hotel_destino_nombre_normalizado_uq ON hotel (
    destino_id,
    regexp_replace(btrim(lower(translate(nombre, 'áéíóúüÁÉÍÓÚÜ', 'aeiouuaeiouu'))), '\s+', ' ', 'g')
) WHERE estado = 'activo'
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX hotel_destino_nombre_normalizado_uq")
    op.execute("ALTER TABLE hotel ALTER COLUMN servicios DROP DEFAULT")
    op.execute(
        "ALTER TABLE hotel ALTER COLUMN servicios TYPE text USING array_to_string(servicios, ', ')"
    )
    op.execute("UPDATE hotel SET categoria = '' WHERE categoria IS NULL")
    op.execute("UPDATE hotel SET precio_referencia = 0 WHERE precio_referencia IS NULL")
    op.alter_column("hotel", "precio_referencia", nullable=False)
    op.alter_column("hotel", "categoria", nullable=False)
