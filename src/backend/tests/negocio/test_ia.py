"""T-013 (DEC-0012, RNF-16): cliente de IA con modelo falso. Nunca se llama a la API de Claude."""

import anthropic
import httpx
import pytest
from langchain_core.messages import AIMessage
from pydantic import SecretStr

from rumbo.core import ia
from rumbo.core.config import Settings
from rumbo.core.errores import ServicioExterno

URL = "postgresql+asyncpg://u:p@localhost:5432/x"


def _settings(monkeypatch: pytest.MonkeyPatch, modelo: str | None, clave: str | None) -> Settings:
    monkeypatch.setenv("DATABASE_URL", URL)
    for nombre, valor in (("IA_MODELO", modelo), ("ANTHROPIC_API_KEY", clave)):
        if valor is None:
            monkeypatch.delenv(nombre, raising=False)
        else:
            monkeypatch.setenv(nombre, valor)
    return Settings(_env_file=None)


class _ClienteSentinela:
    async def generar(self, prompt: str) -> str:
        return "sentinela"


async def test_rnf16_el_modelo_falso_devuelve_una_salida_fija() -> None:
    modelo = ia.ModeloFalso("Borrador fijo")

    assert await modelo.generar("tema A") == "Borrador fijo"
    assert await modelo.generar("otro tema") == "Borrador fijo"


async def test_rnf16_el_modelo_falso_cumple_la_interfaz_y_es_determinista() -> None:
    primera = await ia.ModeloFalso().generar("x")
    segunda = await ia.ModeloFalso().generar("x")

    assert isinstance(primera, str)
    assert primera == segunda


async def test_rnf16_ia_modelo_falso_selecciona_el_modelo_falso(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    modelo = ia.obtener_modelo_ia(_settings(monkeypatch, "falso", None))

    assert isinstance(modelo, ia.ModeloFalso)


async def test_rnf16_por_defecto_sin_ia_modelo_se_usa_el_falso(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    modelo = ia.obtener_modelo_ia(_settings(monkeypatch, None, None))

    assert isinstance(modelo, ia.ModeloFalso)


async def test_rnf16_ia_modelo_claude_con_clave_usa_el_cliente_real_con_la_clave_del_entorno(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recibidas: list[str] = []

    def construir(api_key: SecretStr) -> _ClienteSentinela:
        recibidas.append(api_key.get_secret_value())
        return _ClienteSentinela()

    monkeypatch.setattr(ia, "_construir_cliente_claude", construir)

    modelo = ia.obtener_modelo_ia(_settings(monkeypatch, "claude", "clave-de-prueba"))

    assert isinstance(modelo, _ClienteSentinela)
    assert recibidas == ["clave-de-prueba"]


@pytest.mark.parametrize("clave", [None, ""])
async def test_rnf16_ia_modelo_claude_sin_clave_falla_con_servicio_externo(
    monkeypatch: pytest.MonkeyPatch, clave: str | None
) -> None:
    def no_debe_construirse(api_key: SecretStr) -> _ClienteSentinela:
        raise AssertionError("no debe construirse el cliente sin clave")

    monkeypatch.setattr(ia, "_construir_cliente_claude", no_debe_construirse)

    with pytest.raises(ServicioExterno) as error:
        ia.obtener_modelo_ia(_settings(monkeypatch, "claude", clave))

    assert "ANTHROPIC_API_KEY" in error.value.detalle


def test_rnf16_un_valor_invalido_de_ia_modelo_se_rechaza(monkeypatch: pytest.MonkeyPatch) -> None:
    with pytest.raises(ValueError):
        _settings(monkeypatch, "gpt", None)


def test_rnf16_en_los_tests_construir_el_cliente_real_falla(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Guardia (autouse en conftest): ningún test puede construir el cliente real de Claude."""
    with pytest.raises(AssertionError, match="Claude"):
        ia._construir_cliente_claude("clave-de-prueba")


class _ChatQueFalla:
    async def ainvoke(self, prompt: str) -> AIMessage:
        pedido = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
        raise anthropic.APIConnectionError(request=pedido)


class _ChatConBloques:
    async def ainvoke(self, prompt: str) -> AIMessage:
        return AIMessage(
            content=[
                {"type": "text", "text": "Hola "},
                {"type": "text", "text": "mundo"},
            ]
        )


async def test_rnf16_un_error_de_la_api_de_claude_se_traduce_a_servicio_externo() -> None:
    cliente = ia._ClienteClaude(_ChatQueFalla())  # type: ignore[arg-type]

    with pytest.raises(ServicioExterno):
        await cliente.generar("tema")


async def test_rnf16_una_respuesta_con_varios_bloques_devuelve_solo_el_texto() -> None:
    cliente = ia._ClienteClaude(_ChatConBloques())  # type: ignore[arg-type]

    assert await cliente.generar("tema") == "Hola mundo"
