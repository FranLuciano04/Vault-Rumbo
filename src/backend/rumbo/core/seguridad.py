"""Verificación del ID token de Firebase (DEC-0016). Stub del rojo de T-010: sin lógica."""

import uuid
from contextvars import ContextVar
from typing import Protocol


class TokenInvalido(Exception):
    """El token no es válido (firma, formato, emisor) o está vencido."""


class VerificadorDeTokens(Protocol):
    async def verificar(self, token: str) -> str:
        """Devuelve el `firebase_uid` del token; lanza `TokenInvalido` si no sirve."""
        ...


usuario_auditoria: ContextVar[uuid.UUID | None] = ContextVar("usuario_auditoria", default=None)
"""Id del `Usuario` del pedido en curso; lo lee la auditoría (`created_by`/`updated_by`)."""


def obtener_verificador() -> VerificadorDeTokens:
    """Dependencia de FastAPI: el verificador real (los tests la sobrescriben)."""
    raise NotImplementedError
