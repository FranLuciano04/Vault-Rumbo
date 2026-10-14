from httpx import ASGITransport, AsyncClient

from rumbo.main import app


async def test_salud_responde_200() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as cliente:
        respuesta = await cliente.get("/api/salud")

    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok"}
