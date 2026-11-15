"""T-013 (DEC-0012, RNF-16): cliente de IA con modelo falso. Nunca se llama a la API de Claude."""

import json
import logging
from collections.abc import Callable

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


class _ChatConErrorInesperado:
    async def ainvoke(self, prompt: str) -> AIMessage:
        raise ValueError("respuesta inesperada de langchain")


class _ChatSinTexto:
    async def ainvoke(self, prompt: str) -> AIMessage:
        return AIMessage(content="   ")


def test_rnf16_el_chat_de_claude_tiene_tope_de_tokens() -> None:
    """Construir el chat no llama a la API; el tope acota el costo y el largo de la salida."""
    chat = ia._crear_chat(SecretStr("clave-de-prueba"))

    assert chat.max_tokens == ia._MAX_TOKENS == 1024


async def test_rnf16_un_error_que_no_es_de_la_api_tambien_es_servicio_externo() -> None:
    cliente = ia._ClienteClaude(_ChatConErrorInesperado())  # type: ignore[arg-type]

    with pytest.raises(ServicioExterno) as error:
        await cliente.generar("tema")

    assert "langchain" not in error.value.detalle


async def test_rnf16_una_respuesta_sin_texto_es_servicio_externo() -> None:
    cliente = ia._ClienteClaude(_ChatSinTexto())  # type: ignore[arg-type]

    with pytest.raises(ServicioExterno):
        await cliente.generar("tema")


# --- T-182 (DEC-0029): Mistral en NVIDIA ---------------------------------------------------
# Interfaz que fijan estos tests (la sigue el implementador):
#   - `ia._ClienteNvidia(api_key: SecretStr, transport: httpx.AsyncBaseTransport | None = None)`: el
#     transporte se inyecta (los tests le pasan un `httpx.MockTransport`); `generar(prompt)` abre un
#     `httpx.AsyncClient` propio, hace `POST https://integrate.api.nvidia.com/v1/chat/completions`
#     y lo cierra al terminar.
#   - `ia._construir_cliente_nvidia(api_key: SecretStr)`: único punto de construcción del cliente
#     real (crea el `httpx.AsyncClient` con timeout de 60 s); la guardia autouse lo parchea.
#   - `Settings.nvidia_api_key: SecretStr | None` (env NVIDIA_API_KEY); `ia_modelo` acepta "nvidia".

_CLAVE_NVIDIA = "nvapi-clave-secreta"
_PROMPT = "prompt-privado-del-agente"


def _cliente_nvidia(
    handler: Callable[[httpx.Request], httpx.Response],
) -> tuple[ia._ClienteNvidia, list[httpx.Request]]:
    pedidos: list[httpx.Request] = []

    def envoltorio(pedido: httpx.Request) -> httpx.Response:
        pedidos.append(pedido)
        return handler(pedido)

    return ia._ClienteNvidia(SecretStr(_CLAVE_NVIDIA), httpx.MockTransport(envoltorio)), pedidos


def _respuesta_ok(contenido: object = "Texto de Mistral") -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "choices": [
                {"message": {"content": contenido, "reasoning_content": "razonamiento interno"}}
            ]
        },
    )


def _settings_nvidia(monkeypatch: pytest.MonkeyPatch, clave: str | None) -> Settings:
    monkeypatch.setenv("DATABASE_URL", URL)
    monkeypatch.setenv("IA_MODELO", "nvidia")
    if clave is None:
        monkeypatch.delenv("NVIDIA_API_KEY", raising=False)
    else:
        monkeypatch.setenv("NVIDIA_API_KEY", clave)
    return Settings(_env_file=None)


async def test_rnf16_ia_modelo_nvidia_con_clave_usa_el_cliente_de_nvidia(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    recibidas: list[str] = []

    def construir(api_key: SecretStr) -> _ClienteSentinela:
        recibidas.append(api_key.get_secret_value())
        return _ClienteSentinela()

    monkeypatch.setattr(ia, "_construir_cliente_nvidia", construir)

    modelo = ia.obtener_modelo_ia(_settings_nvidia(monkeypatch, "clave-nv"))

    assert isinstance(modelo, _ClienteSentinela)
    assert recibidas == ["clave-nv"]


@pytest.mark.parametrize("clave", [None, ""])
async def test_rnf16_ia_modelo_nvidia_sin_clave_falla_con_servicio_externo(
    monkeypatch: pytest.MonkeyPatch, clave: str | None
) -> None:
    def no_debe_construirse(api_key: SecretStr) -> _ClienteSentinela:
        raise AssertionError("no debe construirse el cliente sin clave")

    monkeypatch.setattr(ia, "_construir_cliente_nvidia", no_debe_construirse)

    with pytest.raises(ServicioExterno) as error:
        ia.obtener_modelo_ia(_settings_nvidia(monkeypatch, clave))

    assert "NVIDIA_API_KEY" in error.value.detalle


def test_rnf16_en_los_tests_construir_el_cliente_real_de_nvidia_falla() -> None:
    """Guardia (autouse en conftest): ningún test puede construir el cliente real de NVIDIA."""
    with pytest.raises(AssertionError, match="NVIDIA"):
        ia._construir_cliente_nvidia(SecretStr("clave-de-prueba"))


async def test_rnf16_nvidia_hace_post_a_chat_completions_con_modelo_y_mensaje_user() -> None:
    cliente, pedidos = _cliente_nvidia(lambda p: _respuesta_ok())

    await cliente.generar(_PROMPT)

    assert len(pedidos) == 1
    assert pedidos[0].method == "POST"
    assert str(pedidos[0].url) == "https://integrate.api.nvidia.com/v1/chat/completions"
    cuerpo = json.loads(pedidos[0].content)
    assert cuerpo["model"] == "mistralai/mistral-large-4-1t-a52b"
    assert cuerpo["messages"] == [{"role": "user", "content": _PROMPT}]
    assert cuerpo["reasoning_effort"] == "low"


async def test_rnf16_nvidia_envia_la_clave_como_bearer() -> None:
    cliente, pedidos = _cliente_nvidia(lambda p: _respuesta_ok())

    await cliente.generar(_PROMPT)

    assert pedidos[0].headers["Authorization"] == f"Bearer {_CLAVE_NVIDIA}"


async def test_rnf16_nvidia_usa_un_tope_de_tokens_mayor_que_el_de_claude() -> None:
    """Mistral razona antes de responder y `max_tokens` incluye ese razonamiento."""
    cliente, pedidos = _cliente_nvidia(lambda p: _respuesta_ok())

    await cliente.generar(_PROMPT)

    assert json.loads(pedidos[0].content)["max_tokens"] >= 4096


async def test_rnf16_nvidia_devuelve_solo_el_content_del_primer_choice() -> None:
    cliente, _ = _cliente_nvidia(lambda p: _respuesta_ok("Borrador listo"))

    assert await cliente.generar(_PROMPT) == "Borrador listo"


@pytest.mark.parametrize("estado", [400, 401, 429, 500, 503])
async def test_rnf16_nvidia_un_error_http_es_servicio_externo(estado: int) -> None:
    cliente, _ = _cliente_nvidia(lambda p: httpx.Response(estado, json={"error": "falla"}))

    with pytest.raises(ServicioExterno) as error:
        await cliente.generar(_PROMPT)

    assert error.value.detalle == ia.FALLA_IA


@pytest.mark.parametrize("excepcion", [httpx.ConnectError, httpx.ReadTimeout])
async def test_rnf16_nvidia_un_error_de_red_o_timeout_es_servicio_externo(
    excepcion: type[httpx.TransportError],
) -> None:
    def falla(pedido: httpx.Request) -> httpx.Response:
        raise excepcion("sin red", request=pedido)

    cliente, _ = _cliente_nvidia(falla)

    with pytest.raises(ServicioExterno) as error:
        await cliente.generar(_PROMPT)

    assert error.value.detalle == ia.FALLA_IA


@pytest.mark.parametrize("contenido", ["", "   ", None])
async def test_rnf16_nvidia_una_respuesta_sin_texto_es_servicio_externo(
    contenido: str | None,
) -> None:
    cliente, _ = _cliente_nvidia(lambda p: _respuesta_ok(contenido))

    with pytest.raises(ServicioExterno):
        await cliente.generar(_PROMPT)


@pytest.mark.parametrize("cuerpo", [{}, {"choices": []}, "no es json"])
async def test_rnf16_nvidia_una_respuesta_malformada_es_servicio_externo(
    cuerpo: object,
) -> None:
    if isinstance(cuerpo, str):
        respuesta = httpx.Response(200, content=cuerpo.encode())
    else:
        respuesta = httpx.Response(200, json=cuerpo)
    cliente, _ = _cliente_nvidia(lambda p: respuesta)

    with pytest.raises(ServicioExterno):
        await cliente.generar(_PROMPT)


async def test_rnf16_nvidia_el_log_de_una_falla_no_incluye_el_prompt_ni_la_clave(
    caplog: pytest.LogCaptureFixture,
) -> None:
    cliente, _ = _cliente_nvidia(lambda p: httpx.Response(500, json={"error": "falla"}))

    with caplog.at_level(logging.DEBUG), pytest.raises(ServicioExterno):
        await cliente.generar(_PROMPT)

    assert caplog.records, "la falla debe quedar en el log"
    assert _PROMPT not in caplog.text
    assert _CLAVE_NVIDIA not in caplog.text


class _TransporteQueRegistraElCierre(httpx.MockTransport):
    def __init__(self, handler: Callable[[httpx.Request], httpx.Response]) -> None:
        super().__init__(handler)
        self.cerrado = False

    async def aclose(self) -> None:
        self.cerrado = True


@pytest.mark.parametrize("estado", [200, 500])
async def test_rnf16_nvidia_cierra_el_cliente_http_tras_generar(estado: int) -> None:
    transporte = _TransporteQueRegistraElCierre(
        lambda p: _respuesta_ok() if estado == 200 else httpx.Response(estado)
    )
    cliente = ia._ClienteNvidia(SecretStr(_CLAVE_NVIDIA), transporte)

    try:
        await cliente.generar(_PROMPT)
    except ServicioExterno:
        pass

    assert transporte.cerrado


def test_rnf16_nvidia_tiene_un_timeout_mayor_que_el_de_claude() -> None:
    assert ia._TIMEOUT_NVIDIA_SEGUNDOS > ia._TIMEOUT_SEGUNDOS
