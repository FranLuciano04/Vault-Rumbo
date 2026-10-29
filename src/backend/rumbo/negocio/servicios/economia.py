"""Servicio del módulo economía: registro de la economía del viaje (CU-10, RN-01, DEC-0007)."""

import uuid
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Usuario, Viaje

GANANCIA_NEGATIVA = "ganancia_negativa"
MARGEN_NEGATIVO = "margen_negativo"
PLAN_DESBALANCEADO = "plan_desbalanceado"


@dataclass
class ResultadoEconomia:
    viaje: Viaje
    advertencias: list[str] = field(default_factory=list)


async def registrar_economia(
    sesion: AsyncSession, actor: Usuario, viaje_id: uuid.UUID, datos: dict[str, Any]
) -> ResultadoEconomia:
    raise NotImplementedError("no implementado")
