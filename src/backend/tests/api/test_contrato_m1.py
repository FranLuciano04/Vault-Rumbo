"""T-026: contrato de usuarios (seguridad) y configuración del PC1, publicado como stubs 501.

La tabla RUTAS sale de `05-Diseño/API/openapi.json` (PC1): método, ruta, `x-roles` y CU.
Sin `restablecer-password` ni `login`/`logout` (DEC-0016).
"""

from collections.abc import Awaitable, Callable
from typing import Any
from uuid import uuid4

import pytest
from httpx import AsyncClient, Response

from rumbo.main import crear_app

PROBLEM_JSON = "application/problem+json"
TODOS = ("admin", "dueno", "empleado", "freelance")
GESTION = ("admin", "dueno")

# (método, ruta con prefijo /api, roles del contrato, módulo, CU)
RUTAS: list[tuple[str, str, tuple[str, ...], str, str]] = [
    ("GET", "/api/usuarios", GESTION, "seguridad", "CU-25"),
    ("POST", "/api/usuarios", GESTION, "seguridad", "CU-25"),
    ("GET", "/api/usuarios/{usuario_id}", GESTION, "seguridad", "CU-25"),
    ("PATCH", "/api/usuarios/{usuario_id}", GESTION, "seguridad", "CU-25"),
    ("POST", "/api/usuarios/{usuario_id}/baja", GESTION, "seguridad", "CU-25"),
    ("GET", "/api/configuracion", GESTION, "configuracion", "CU-06"),
    ("PUT", "/api/configuracion", GESTION, "configuracion", "CU-06"),
    ("PUT", "/api/usuarios/{usuario_id}/comision-por-defecto", GESTION, "configuracion", "CU-13"),
    ("GET", "/api/destinos", TODOS, "configuracion", "CU-26"),
    ("POST", "/api/destinos", GESTION, "configuracion", "CU-26"),
    ("GET", "/api/destinos/{destino_id}", TODOS, "configuracion", "CU-26"),
    ("PATCH", "/api/destinos/{destino_id}", GESTION, "configuracion", "CU-26"),
    ("POST", "/api/destinos/{destino_id}/baja", GESTION, "configuracion", "CU-26"),
    ("POST", "/api/destinos/{destino_id}/reactivar", GESTION, "configuracion", "CU-26"),
    ("GET", "/api/destinos/{destino_id}/requisitos", TODOS, "configuracion", "CU-15"),
    ("POST", "/api/destinos/{destino_id}/requisitos", GESTION, "configuracion", "CU-15"),
    ("PATCH", "/api/requisitos-destino/{requisito_id}", GESTION, "configuracion", "CU-15"),
    ("POST", "/api/requisitos-destino/{requisito_id}/baja", GESTION, "configuracion", "CU-15"),
    ("GET", "/api/operadores", TODOS, "configuracion", "CU-31"),
    ("POST", "/api/operadores", GESTION, "configuracion", "CU-31"),
    ("GET", "/api/operadores/{operador_id}", TODOS, "configuracion", "CU-31"),
    ("PATCH", "/api/operadores/{operador_id}", GESTION, "configuracion", "CU-31"),
    ("POST", "/api/operadores/{operador_id}/baja", GESTION, "configuracion", "CU-31"),
    ("POST", "/api/operadores/{operador_id}/reactivar", GESTION, "configuracion", "CU-31"),
]

RF_POR_RUTA = {
    ("GET", "/api/usuarios"): "RF-144",
    ("POST", "/api/usuarios"): "RF-144",
    ("GET", "/api/usuarios/{usuario_id}"): "RF-144",
    ("PATCH", "/api/usuarios/{usuario_id}"): "RF-147",
    ("POST", "/api/usuarios/{usuario_id}/baja"): "RF-148",
    ("GET", "/api/configuracion"): "RF-022",
    ("PUT", "/api/configuracion"): "RF-022",
    ("PUT", "/api/usuarios/{usuario_id}/comision-por-defecto"): "RF-083",
    ("GET", "/api/destinos"): "RF-089",
    ("POST", "/api/destinos"): "RF-089",
    ("GET", "/api/destinos/{destino_id}"): "RF-089",
    ("PATCH", "/api/destinos/{destino_id}"): "RF-089",
    ("POST", "/api/destinos/{destino_id}/baja"): "RF-091",
    ("POST", "/api/destinos/{destino_id}/reactivar"): "RF-092",
    ("GET", "/api/destinos/{destino_id}/requisitos"): "RF-086",
    ("POST", "/api/destinos/{destino_id}/requisitos"): "RF-086",
    ("PATCH", "/api/requisitos-destino/{requisito_id}"): "RF-087",
    ("POST", "/api/requisitos-destino/{requisito_id}/baja"): "RF-088",
    ("GET", "/api/operadores"): "RF-093",
    ("POST", "/api/operadores"): "RF-093",
    ("GET", "/api/operadores/{operador_id}"): "RF-093",
    ("PATCH", "/api/operadores/{operador_id}"): "RF-093",
    ("POST", "/api/operadores/{operador_id}/baja"): "RF-095",
    ("POST", "/api/operadores/{operador_id}/reactivar"): "RF-096",
}
IDS = [f"{RF_POR_RUTA[(m, r)]} {m} {r}" for m, r, *_ in RUTAS]
METODO_Y_RUTA = [(m, r) for m, r, *_ in RUTAS]
CASOS_403 = [(m, r, rol) for m, r, roles, *_ in RUTAS for rol in TODOS if rol not in roles]
CASOS_501 = [(m, r, rol) for m, r, roles, *_ in RUTAS for rol in roles]

Fabrica = Callable[[str], Awaitable[AsyncClient]]


def _url(ruta: str) -> str:
    for nombre in ("usuario_id", "destino_id", "requisito_id", "operador_id"):
        ruta = ruta.replace("{" + nombre + "}", str(uuid4()))
    return ruta


def _resolver_ref(contrato: dict[str, Any], esquema: dict[str, Any]) -> dict[str, Any]:
    while "$ref" in esquema:
        nodo: Any = contrato
        for parte in esquema["$ref"].removeprefix("#/").split("/"):
            nodo = nodo[parte]
        esquema = nodo
    return esquema


def _ejemplo(contrato: dict[str, Any], esquema: dict[str, Any]) -> Any:
    """Valor mínimo válido para el esquema (solo campos requeridos)."""
    esquema = _resolver_ref(contrato, esquema)
    if "enum" in esquema:
        return esquema["enum"][0]
    if "anyOf" in esquema or "oneOf" in esquema:
        return _ejemplo(contrato, (esquema.get("anyOf") or esquema["oneOf"])[0])
    tipo = esquema.get("type")
    if tipo == "object" or "properties" in esquema:
        props = esquema.get("properties", {})
        return {n: _ejemplo(contrato, props[n]) for n in esquema.get("required", []) if n in props}
    if tipo == "array":
        return []
    if tipo in ("integer", "number"):
        return max(esquema.get("minimum", 1), 1)
    if tipo == "boolean":
        return True
    ejemplos = {
        "uuid": str(uuid4()),
        "date": "2026-01-15",
        "date-time": "2026-01-15T10:00:00Z",
        "email": "prueba@rumbo.test",
    }
    return ejemplos.get(esquema.get("format", ""), "texto")


def _operacion(contrato: dict[str, Any], metodo: str, ruta: str) -> dict[str, Any]:
    # El contrato puede publicar la ruta con /api o relativa al server; se aceptan ambas.
    paths = contrato["paths"]
    clave = ruta if ruta in paths else ruta.removeprefix("/api")
    assert clave in paths, f"el contrato no publica {ruta}"
    assert metodo.lower() in paths[clave], f"el contrato no publica {metodo} {ruta}"
    return paths[clave][metodo.lower()]


async def _pedir(c: AsyncClient, contrato: dict[str, Any], metodo: str, ruta: str) -> Response:
    """Pide la ruta con un cuerpo válido según el contrato publicado (si lo declara)."""
    kwargs: dict[str, Any] = {}
    paths = contrato["paths"]
    clave = ruta if ruta in paths else ruta.removeprefix("/api")
    cuerpo = paths.get(clave, {}).get(metodo.lower(), {}).get("requestBody")
    if cuerpo:
        esquema = cuerpo["content"]["application/json"]["schema"]
        kwargs["json"] = _ejemplo(contrato, esquema)
    return await c.request(metodo, _url(ruta), **kwargs)


@pytest.fixture(scope="module")
def contrato() -> dict[str, Any]:
    """El OpenAPI de la app, generado una vez por módulo y sin tocar la base."""
    return crear_app().openapi()


@pytest.mark.parametrize(("metodo", "ruta", "roles", "modulo", "cu"), RUTAS, ids=IDS)
async def test_rf151_contrato_publica_la_ruta_con_seguridad_roles_y_errores(
    contrato: dict[str, Any],
    metodo: str,
    ruta: str,
    roles: tuple[str, ...],
    modulo: str,
    cu: str,
) -> None:
    operacion = _operacion(contrato, metodo, ruta)

    assert operacion["tags"] == [modulo]
    assert operacion["security"], "la operación debe declarar seguridad"
    assert "401" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["401"]["content"]
    if roles != TODOS:
        assert "403" in operacion["responses"]
        assert PROBLEM_JSON in operacion["responses"]["403"]["content"]
    for rol in roles:
        assert rol in operacion["description"], f"la descripción debe nombrar el rol {rol}"
    assert cu in operacion["description"]
    assert sorted(operacion["x-roles"]) == sorted(roles)
    assert cu in operacion["x-casos-de-uso"]


async def test_rf151_el_contrato_no_publica_restablecer_password_dec0016(
    contrato: dict[str, Any],
) -> None:
    rutas = list(contrato["paths"])

    assert not [r for r in rutas if "restablecer" in r or "password" in r]
    assert not [r for r in rutas if r.endswith("/auth/login") or r.endswith("/auth/logout")]


async def test_rf151_el_contrato_publica_exactamente_las_rutas_del_modulo(
    contrato: dict[str, Any],
) -> None:
    publicadas = {
        (m.upper(), r.removeprefix("/api"))
        for r, ops in contrato["paths"].items()
        for m in ops
        if set(ops[m].get("tags", [])) & {"seguridad", "configuracion"}
    }
    esperadas = {(m, r.removeprefix("/api")) for m, r in METODO_Y_RUTA} | {("GET", "/auth/yo")}

    assert publicadas == esperadas


@pytest.mark.parametrize(("metodo", "ruta"), METODO_Y_RUTA, ids=IDS)
async def test_rf151_sin_token_responde_401_problem_json(
    cliente_sin_sesion: AsyncClient, metodo: str, ruta: str
) -> None:
    r = await cliente_sin_sesion.request(metodo, _url(ruta))

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 401


@pytest.mark.parametrize(("metodo", "ruta"), METODO_Y_RUTA, ids=IDS)
async def test_rf151_con_token_invalido_responde_401_problem_json(
    cliente_sin_sesion: AsyncClient, metodo: str, ruta: str
) -> None:
    r = await cliente_sin_sesion.request(
        metodo, _url(ruta), headers={"Authorization": "Bearer token-que-no-existe"}
    )

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    ("metodo", "ruta", "rol"),
    CASOS_403,
    ids=[f"{RF_POR_RUTA[(m, r)]} {m} {r} {rol}" for m, r, rol in CASOS_403],
)
async def test_rf151_rol_fuera_del_contrato_responde_403_problem_json(
    cliente_como: Fabrica, contrato: dict[str, Any], metodo: str, ruta: str, rol: str
) -> None:
    c = await cliente_como(rol)

    r = await _pedir(c, contrato, metodo, ruta)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 403


@pytest.mark.parametrize(
    ("metodo", "ruta", "rol"),
    CASOS_501,
    ids=[f"{RF_POR_RUTA[(m, r)]} {m} {r} {rol}" for m, r, rol in CASOS_501],
)
async def test_rf151_rol_del_contrato_responde_501_problem_json(
    cliente_como: Fabrica, contrato: dict[str, Any], metodo: str, ruta: str, rol: str
) -> None:
    c = await cliente_como(rol)

    r = await _pedir(c, contrato, metodo, ruta)

    assert r.status_code == 501
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 501


# Campos NOT NULL de la base en cada PATCH: omitirlos vale, un null explícito es 422.
NULOS_EN_OBLIGATORIOS = [
    ("/api/usuarios/{usuario_id}", "rol"),
    ("/api/usuarios/{usuario_id}", "acceso_redes"),
    ("/api/destinos/{destino_id}", "nombre"),
    ("/api/destinos/{destino_id}", "pais"),
    ("/api/requisitos-destino/{requisito_id}", "nombre"),
    ("/api/requisitos-destino/{requisito_id}", "tipo"),
    ("/api/requisitos-destino/{requisito_id}", "obligatorio"),
    ("/api/requisitos-destino/{requisito_id}", "anticipacion_dias"),
    ("/api/operadores/{operador_id}", "nombre"),
]
# Los anulables sí aceptan null (vaciar el dato).
NULOS_EN_ANULABLES = [
    ("/api/destinos/{destino_id}", "region"),
    ("/api/destinos/{destino_id}", "notas"),
    ("/api/requisitos-destino/{requisito_id}", "descripcion"),
    ("/api/operadores/{operador_id}", "contacto"),
]


@pytest.mark.parametrize(("ruta", "campo"), NULOS_EN_OBLIGATORIOS)
async def test_rf151_patch_con_null_en_campo_obligatorio_responde_422(
    cliente_como: Fabrica, ruta: str, campo: str
) -> None:
    c = await cliente_como("admin")

    r = await c.patch(_url(ruta), json={campo: None})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(("ruta", "campo"), NULOS_EN_OBLIGATORIOS)
async def test_rf151_el_contrato_no_publica_null_en_campo_obligatorio_del_patch(
    contrato: dict[str, Any], ruta: str, campo: str
) -> None:
    cuerpo = _operacion(contrato, "PATCH", ruta)["requestBody"]["content"]["application/json"]
    esquema = _resolver_ref(contrato, cuerpo["schema"])["properties"][campo]

    assert "anyOf" not in esquema
    assert "default" not in esquema


@pytest.mark.parametrize(("ruta", "campo"), NULOS_EN_ANULABLES)
async def test_rf151_patch_con_null_en_campo_anulable_llega_al_501(
    cliente_como: Fabrica, ruta: str, campo: str
) -> None:
    c = await cliente_como("admin")

    r = await c.patch(_url(ruta), json={campo: None})

    assert r.status_code == 501


COMISIONES_INCOHERENTES = [
    {"comision_default_tipo": "importe", "comision_default_valor": None},
    {"comision_default_tipo": None, "comision_default_valor": "10.00"},
    {"comision_default_tipo": "porcentaje", "comision_default_valor": "100.01"},
    {"comision_default_tipo": "importe", "comision_default_valor": "-1"},
    {"comision_default_tipo": "importe", "comision_default_valor": "10.123"},
    {"comision_default_tipo": "otro", "comision_default_valor": "10"},
]


@pytest.mark.parametrize("cuerpo", COMISIONES_INCOHERENTES)
async def test_rf083_comision_por_defecto_incoherente_responde_422(
    cliente_como: Fabrica, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("admin")

    r = await c.put(_url("/api/usuarios/{usuario_id}/comision-por-defecto"), json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"comision_default_tipo": None, "comision_default_valor": None},
        {"comision_default_tipo": "porcentaje", "comision_default_valor": "100"},
        {"comision_default_tipo": "importe", "comision_default_valor": "15000.50"},
    ],
)
async def test_rf083_comision_por_defecto_coherente_llega_al_501(
    cliente_como: Fabrica, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("admin")

    r = await c.put(_url("/api/usuarios/{usuario_id}/comision-por-defecto"), json=cuerpo)

    assert r.status_code == 501


@pytest.mark.parametrize(
    ("ruta", "cuerpo"),
    [
        ("/api/destinos", {"nombre": "   ", "pais": "Italia"}),
        ("/api/destinos", {"nombre": "Roma", "pais": " "}),
        ("/api/operadores", {"nombre": "	"}),
        ("/api/usuarios", {"nombre": "Ana", "email": "sin-arroba", "rol": "empleado"}),
        ("/api/usuarios", {"nombre": "Ana", "email": "a b@rumbo.test", "rol": "empleado"}),
        ("/api/usuarios", {"nombre": "  ", "email": "ana@rumbo.test", "rol": "empleado"}),
    ],
)
async def test_rf144_textos_vacios_o_email_mal_formado_responden_422(
    cliente_como: Fabrica, ruta: str, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("admin")

    r = await c.post(ruta, json=cuerpo)

    assert r.status_code == 422
