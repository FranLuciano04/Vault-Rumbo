"""EST-ContenidoRed: idea <-> en_produccion <-> listo -> publicado; descartar es baja lógica
(CU-19, RF-114, RF-117). Rumbo no publica: pasar a `publicado` lo marca la persona (RF-118)."""

from typing import Any

from rumbo.datos.modelos import ContenidoRed, EstadoKanban
from rumbo.negocio.errores import TransicionInvalida

_E = EstadoKanban

# Movimientos del tablero; retroceder una tarjeta es A5 y publicar a mano es A3.
_MOVIMIENTOS: dict[EstadoKanban, frozenset[EstadoKanban]] = {
    _E.idea: frozenset({_E.en_produccion}),
    _E.en_produccion: frozenset({_E.idea, _E.listo}),
    _E.listo: frozenset({_E.en_produccion, _E.publicado}),
}


def _exigir_abierta(pieza: ContenidoRed, accion: str) -> None:
    if pieza.estado_kanban in (_E.publicado, _E.descartado):
        raise TransicionInvalida(f"No se puede {accion} una pieza {pieza.estado_kanban.value}.")


def editar(pieza: ContenidoRed, cambios: dict[str, Any]) -> None:
    """Aplica los cambios o ninguno: valida el movimiento antes de tocar la pieza."""
    _exigir_abierta(pieza, "modificar")
    destino = cambios.get("estado_kanban", pieza.estado_kanban)
    if destino is not pieza.estado_kanban and destino not in _MOVIMIENTOS[pieza.estado_kanban]:
        raise TransicionInvalida(
            f"No se puede pasar una pieza de {pieza.estado_kanban.value} a {destino.value}."
        )
    for campo, valor in cambios.items():
        setattr(pieza, campo, valor)


def descartar(pieza: ContenidoRed) -> None:
    _exigir_abierta(pieza, "descartar")
    pieza.estado_kanban = _E.descartado
