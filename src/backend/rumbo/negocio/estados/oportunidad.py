"""EST-Oportunidad (stub del test-writer: la lógica la escribe el implementador, T-064)."""

from rumbo.datos.modelos import MotivoPerdida, Oportunidad


def pasar_a_en_gestion(oportunidad: Oportunidad) -> None:
    raise NotImplementedError


def perder(oportunidad: Oportunidad, motivo: MotivoPerdida, detalle: str | None = None) -> None:
    raise NotImplementedError


def reactivar(oportunidad: Oportunidad) -> None:
    raise NotImplementedError


def ganar(oportunidad: Oportunidad) -> None:
    raise NotImplementedError
