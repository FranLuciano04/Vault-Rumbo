"""T-011: la auditoría funciona de punta a punta en un pedido HTTP (RF-152)."""

from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.db import SesionDep, obtener_sesion
from rumbo.datos.modelos import Destino, Usuario
from rumbo.presentacion.dependencias import usuario_actual

RUTA = "/api/_sonda_alta"


async def test_rf152_pedido_http_registra_autor(
    app_de_tests: FastAPI,
    cliente_como: Callable[[str], Awaitable[AsyncClient]],
    sesion: AsyncSession,
) -> None:
    async def _sesion_con_commit() -> AsyncIterator[AsyncSession]:
        # Como `sesion_por_pedido`: commit al final del pedido (la sesión de test no lo hace).
        yield sesion
        await sesion.commit()

    app_de_tests.dependency_overrides[obtener_sesion] = _sesion_con_commit
    router = APIRouter()

    @router.post(RUTA)
    async def _alta(
        _: Annotated[Usuario, Depends(usuario_actual)], sesion_del_pedido: SesionDep
    ) -> None:
        # Sin flush: lo guarda el commit de `SesionDep`, que corre antes del reset de la ContextVar.
        sesion_del_pedido.add(Destino(nombre="Bariloche", pais="Argentina"))

    app_de_tests.include_router(router)
    c = await cliente_como("empleado")

    r = await c.post(RUTA)

    assert r.status_code == 200
    autor = await sesion.scalar(select(Destino.created_by).where(Destino.nombre == "Bariloche"))
    assert autor == c.usuario.id  # type: ignore[attr-defined]
