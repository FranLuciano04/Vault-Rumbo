"""T-129: contrato de redes e IA (CU-19, CU-20).

Rutas, esquemas, token, acceso a redes (nunca freelance) y 501.
"""

from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

PROBLEM_JSON = "application/problem+json"
ID = "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01"
ROLES_CON_ACCESO = ["admin", "dueno", "empleado"]
CANALES = ["instagram", "tiktok", "whatsapp_ventas"]
ESTADOS = ["idea", "en_produccion", "listo", "publicado", "descartado"]
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]

CONTENIDO = {
    "titulo": "Tres playas del Caribe para tu luna de miel",
    "texto": "Arena blanca y agua tibia.",
    "canal": "instagram",
    "fecha_publicacion": "2026-12-01",
}
EDICION = {"estado_kanban": "en_produccion", "fecha_publicacion": "2026-12-05"}
PEDIDO_IA = {"tema": "Caribe en temporada baja", "canal": "tiktok", "tono": "cercano"}

# (método, ruta del contrato, ruta concreta, cuerpo, CU, errores obligatorios)
OPERACIONES: list[tuple[str, str, str, Any, list[str], set[str]]] = [
    ("get", "/api/contenidos", "/api/contenidos", None, ["CU-19"], {"403", "422"}),
    (
        "post",
        "/api/contenidos",
        "/api/contenidos",
        CONTENIDO,
        ["CU-19", "CU-20"],
        {"403", "422"},
    ),
    (
        "get",
        "/api/contenidos/{contenido_id}",
        f"/api/contenidos/{ID}",
        None,
        ["CU-19"],
        {"403", "404"},
    ),
    (
        "patch",
        "/api/contenidos/{contenido_id}",
        f"/api/contenidos/{ID}",
        EDICION,
        ["CU-19", "CU-20"],
        {"403", "404", "409", "422"},
    ),
    (
        "post",
        "/api/contenidos/{contenido_id}/descartar",
        f"/api/contenidos/{ID}/descartar",
        None,
        ["CU-19"],
        {"403", "404", "409"},
    ),
    (
        "post",
        "/api/contenidos/propuestas-ia",
        "/api/contenidos/propuestas-ia",
        PEDIDO_IA,
        ["CU-20"],
        {"403", "422", "502"},
    ),
]
RUTAS_CONTRATO = [(m, r, cu, e) for m, r, _, _, cu, e in OPERACIONES]
RUTAS_HTTP = [(m, c, cuerpo) for m, _, c, cuerpo, _, _ in OPERACIONES]


@pytest.fixture
async def contrato(cliente_sin_sesion: AsyncClient) -> dict[str, Any]:
    r = await cliente_sin_sesion.get("/api/openapi.json")
    assert r.status_code == 200
    return r.json()


def _nombre(ref: str) -> str:
    return ref.rsplit("/", 1)[-1]


def _resolver(contrato: dict[str, Any], esquema: dict[str, Any]) -> dict[str, Any]:
    if "$ref" in esquema:
        return contrato["components"]["schemas"][_nombre(esquema["$ref"])]
    return esquema


def _componer(contrato: dict[str, Any], nombre: str) -> tuple[dict[str, Any], set[str]]:
    """Junta propiedades y requeridos de un esquema (allOf con Auditoria)."""
    esquema = contrato["components"]["schemas"][nombre]
    propiedades: dict[str, Any] = {}
    requeridos: set[str] = set()
    for parte in esquema.get("allOf", [esquema]):
        parte = _resolver(contrato, parte)
        propiedades |= parte.get("properties", {})
        requeridos |= set(parte.get("required", []))
    return propiedades, requeridos


def _enum(contrato: dict[str, Any], propiedad: dict[str, Any]) -> list[str]:
    opciones = propiedad.get("anyOf") or propiedad.get("oneOf") or [propiedad]
    for opcion in opciones:
        resuelta = _resolver(contrato, opcion)
        if "enum" in resuelta:
            return list(resuelta["enum"])
    return []


def _esquema_json(operacion: dict[str, Any], donde: str) -> dict[str, Any]:
    if donde == "request":
        return operacion["requestBody"]["content"]["application/json"]["schema"]
    return operacion["responses"][donde]["content"]["application/json"]["schema"]


def _parametros(contrato: dict[str, Any], ruta: str) -> dict[str, dict[str, Any]]:
    resueltos = {}
    for p in contrato["paths"][ruta]["get"]["parameters"]:
        if "$ref" in p:
            p = contrato["components"]["parameters"][_nombre(p["$ref"])]
        resueltos[p["name"]] = p
    return resueltos


@pytest.mark.parametrize(("metodo", "ruta", "cu", "errores"), RUTAS_CONTRATO)
async def test_cu19_contrato_publica_las_rutas_del_modulo(
    contrato: dict[str, Any], metodo: str, ruta: str, cu: list[str], errores: set[str]
) -> None:
    assert metodo in contrato["paths"][ruta]
    operacion = contrato["paths"][ruta][metodo]
    assert "redes" in operacion["tags"]
    assert operacion["security"], "la operación exige token Bearer"
    assert "401" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["401"]["content"]
    assert errores <= set(operacion["responses"])


async def test_cu19_son_exactamente_seis_operaciones(contrato: dict[str, Any]) -> None:
    publicadas = {
        (metodo, ruta)
        for ruta, operaciones in contrato["paths"].items()
        for metodo, operacion in operaciones.items()
        if "redes" in operacion.get("tags", [])
    }

    assert publicadas == {(m, r) for m, r, *_ in RUTAS_CONTRATO}
    assert len(publicadas) == 6


@pytest.mark.parametrize(("metodo", "ruta", "cu", "errores"), RUTAS_CONTRATO)
async def test_cu19_contrato_declara_roles_sin_freelance_y_caso_de_uso(
    contrato: dict[str, Any], metodo: str, ruta: str, cu: list[str], errores: set[str]
) -> None:
    operacion = contrato["paths"][ruta][metodo]

    assert operacion["x-roles"] == ROLES_CON_ACCESO
    assert "freelance" not in operacion["description"]
    assert operacion["x-casos-de-uso"] == cu
    assert all(caso in operacion["description"] for caso in cu)
    assert "acceso al módulo de redes" in operacion["description"]


async def test_cu20_propuesta_ia_declara_502_si_falla_la_ia(contrato: dict[str, Any]) -> None:
    respuesta = contrato["paths"]["/api/contenidos/propuestas-ia"]["post"]["responses"]["502"]

    assert PROBLEM_JSON in respuesta["content"]
    assert "DEC-0012" in respuesta["description"]


async def test_cu19_listar_publica_filtros_de_estado_canal_y_periodo(
    contrato: dict[str, Any],
) -> None:
    parametros = _parametros(contrato, "/api/contenidos")

    assert {"pagina", "por_pagina", "desde", "hasta", "estado_kanban", "canal"} <= set(parametros)
    assert _enum(contrato, parametros["estado_kanban"]["schema"]) == ESTADOS
    assert _enum(contrato, parametros["canal"]["schema"]) == CANALES


async def test_cu19_listar_devuelve_pagina_de_contenido_red(contrato: dict[str, Any]) -> None:
    esquema = _esquema_json(contrato["paths"]["/api/contenidos"]["get"], "200")

    assert {"items", "total", "pagina", "por_pagina"} <= set(esquema["required"])
    assert esquema["properties"]["items"]["items"]["$ref"].endswith("/ContenidoRed")


async def test_cu19_contenido_red_publica_los_atributos_de_la_entidad(
    contrato: dict[str, Any],
) -> None:
    propiedades, requeridos = _componer(contrato, "ContenidoRed")

    assert {
        "id",
        "usuario_id",
        "titulo",
        "texto",
        "canal",
        "estado_kanban",
        "fecha_publicacion",
    } <= set(propiedades)
    assert {"id", "titulo", "canal", "estado_kanban", "fecha_publicacion"} <= requeridos
    assert _enum(contrato, propiedades["canal"]) == CANALES
    assert _enum(contrato, propiedades["estado_kanban"]) == ESTADOS
    assert propiedades["fecha_publicacion"]["format"] == "date"
    for campo in ("created_by", "updated_by", "created_at", "updated_at"):
        assert propiedades[campo]["readOnly"] is True


async def test_cu19_crear_exige_titulo_canal_y_fecha_y_texto_es_opcional(
    contrato: dict[str, Any],
) -> None:
    operacion = contrato["paths"]["/api/contenidos"]["post"]
    propiedades, requeridos = _componer(
        contrato, _nombre(_esquema_json(operacion, "request")["$ref"])
    )

    assert {"titulo", "canal", "fecha_publicacion"} <= requeridos
    assert "texto" in propiedades
    assert "texto" not in requeridos
    assert "usuario_id" not in propiedades
    assert "id" not in propiedades
    assert _esquema_json(operacion, "201")["$ref"].endswith("/ContenidoRed")


async def test_cu19_editar_mueve_en_el_tablero_y_reprograma_sin_requeridos(
    contrato: dict[str, Any],
) -> None:
    operacion = contrato["paths"]["/api/contenidos/{contenido_id}"]["patch"]
    propiedades, requeridos = _componer(
        contrato, _nombre(_esquema_json(operacion, "request")["$ref"])
    )

    assert {"titulo", "texto", "canal", "estado_kanban", "fecha_publicacion"} <= set(propiedades)
    assert not requeridos
    parametro = operacion["parameters"][0]
    assert parametro["name"] == "contenido_id"
    assert parametro["in"] == "path"
    assert parametro["schema"]["format"] == "uuid"


async def test_cu20_propuesta_ia_pide_tema_canal_y_tono(contrato: dict[str, Any]) -> None:
    operacion = contrato["paths"]["/api/contenidos/propuestas-ia"]["post"]
    propiedades, requeridos = _componer(
        contrato, _nombre(_esquema_json(operacion, "request")["$ref"])
    )

    assert {"tema", "canal", "tono"} <= set(propiedades)
    assert {"tema", "canal"} <= requeridos
    assert _enum(contrato, propiedades["canal"]) == CANALES


async def test_cu20_propuesta_ia_devuelve_borradores_sin_guardar(contrato: dict[str, Any]) -> None:
    operacion = contrato["paths"]["/api/contenidos/propuestas-ia"]["post"]
    propiedades, requeridos = _componer(contrato, _nombre(_esquema_json(operacion, "200")["$ref"]))

    assert "borradores" in requeridos
    assert propiedades["borradores"]["type"] == "array"
    assert "id" not in propiedades, "la propuesta no es una pieza guardada (CU-20 A2)"


@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), RUTAS_HTTP)
async def test_cu19_sin_token_responde_401_problem_json(
    cliente_sin_sesion: AsyncClient, metodo: str, ruta: str, cuerpo: Any
) -> None:
    r = await cliente_sin_sesion.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    ("rol", "acceso_redes"),
    [("admin", True), ("admin", False), ("dueno", True), ("dueno", False), ("empleado", True)],
)
@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), RUTAS_HTTP)
async def test_cu19_con_acceso_a_redes_responde_501_problem_json(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    rol: str,
    acceso_redes: bool,
    metodo: str,
    ruta: str,
    cuerpo: Any,
) -> None:
    c = await cliente_como(rol)
    c.usuario.acceso_redes = acceso_redes  # type: ignore[attr-defined]
    await sesion.flush()

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 501
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 501


@pytest.mark.parametrize("acceso_redes", [True, False])
@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), RUTAS_HTTP)
async def test_cu19_freelance_nunca_entra_a_redes_ni_con_la_capacidad_responde_403(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    acceso_redes: bool,
    metodo: str,
    ruta: str,
    cuerpo: Any,
) -> None:
    c = await cliente_como("freelance")
    c.usuario.acceso_redes = acceso_redes  # type: ignore[attr-defined]
    await sesion.flush()

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 403


@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), RUTAS_HTTP)
async def test_cu19_empleado_sin_acceso_a_redes_responde_403(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    metodo: str,
    ruta: str,
    cuerpo: Any,
) -> None:
    c = await cliente_como("empleado")
    c.usuario.acceso_redes = False  # type: ignore[attr-defined]
    await sesion.flush()

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    ("metodo", "ruta", "cuerpo"),
    [
        ("post", "/api/contenidos", {}),
        ("post", "/api/contenidos", {**CONTENIDO, "canal": "facebook"}),
        ("post", "/api/contenidos", {**CONTENIDO, "fecha_publicacion": "mañana"}),
        ("patch", f"/api/contenidos/{ID}", {"estado_kanban": "archivado"}),
        ("post", "/api/contenidos/propuestas-ia", {}),
        ("post", "/api/contenidos/propuestas-ia", {**PEDIDO_IA, "canal": "facebook"}),
    ],
)
async def test_cu19_cuerpo_invalido_responde_422(
    cliente_como: FabricaCliente, metodo: str, ruta: str, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("admin")

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    "consulta", [{"canal": "facebook"}, {"estado_kanban": "archivado"}, {"desde": "ayer"}]
)
async def test_cu19_listar_con_filtro_invalido_responde_422(
    cliente_como: FabricaCliente, consulta: dict[str, str]
) -> None:
    c = await cliente_como("admin")

    r = await c.get("/api/contenidos", params=consulta)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
