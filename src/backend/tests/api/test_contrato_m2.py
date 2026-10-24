"""T-039: contrato del módulo clientes (CU-02, CU-03, RF-031): rutas, token, roles y 501."""

from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient

PROBLEM_JSON = "application/problem+json"
ID = "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01"
ROLES = ["admin", "dueno", "empleado", "freelance"]
CUERPO_ALTA = {"nombre": "Ana Pérez", "contacto": "ana@mail.test", "segmento": "pareja"}

# (método, ruta, cuerpo)
OPERACIONES: list[tuple[str, str, dict[str, Any] | None]] = [
    ("get", "/api/clientes", None),
    ("post", "/api/clientes", CUERPO_ALTA),
    ("get", f"/api/clientes/{ID}", None),
    ("patch", f"/api/clientes/{ID}", {"nombre": "Ana P."}),
    ("get", f"/api/clientes/{ID}/historial", None),
]
RUTAS_CONTRATO = [
    ("get", "/api/clientes"),
    ("post", "/api/clientes"),
    ("get", "/api/clientes/{cliente_id}"),
    ("patch", "/api/clientes/{cliente_id}"),
    ("get", "/api/clientes/{cliente_id}/historial"),
]
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]


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


def _cuerpo(contrato: dict[str, Any], metodo: str, ruta: str) -> dict[str, Any]:
    operacion = contrato["paths"][ruta][metodo]
    return _resolver(contrato, operacion["requestBody"]["content"]["application/json"]["schema"])


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_CONTRATO)
async def test_rf031_contrato_publica_las_cinco_rutas(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    assert metodo in contrato["paths"][ruta]
    operacion = contrato["paths"][ruta][metodo]
    assert "clientes" in operacion["tags"]
    assert operacion["security"], "la operación exige token Bearer"
    assert "401" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["401"]["content"]


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_CONTRATO)
async def test_rf031_contrato_declara_los_roles_y_casos_de_uso(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    descripcion = contrato["paths"][ruta][metodo]["description"]

    for rol in ROLES:
        assert rol in descripcion
    assert "CU-0" in descripcion


async def test_rf031_buscar_publica_filtros_y_paginacion(contrato: dict[str, Any]) -> None:
    operacion = contrato["paths"]["/api/clientes"]["get"]
    parametros = {p["name"] for p in operacion["parameters"]}

    assert {"buscar", "etiquetas", "mios", "pagina", "por_pagina"} <= parametros
    assert "etiqueta" not in parametros
    assert "422" in operacion["responses"]
    esquema = operacion["responses"]["200"]["content"]["application/json"]["schema"]
    nombre = _nombre(esquema["$ref"])
    assert nombre.startswith("Pagina")
    pagina = contrato["components"]["schemas"][nombre]
    assert _nombre(pagina["properties"]["items"]["items"]["$ref"]) == "ClienteListado"


async def test_rf031_por_pagina_tiene_maximo_100_en_el_contrato(
    contrato: dict[str, Any],
) -> None:
    parametros = {p["name"]: p for p in contrato["paths"]["/api/clientes"]["get"]["parameters"]}

    assert parametros["por_pagina"]["schema"]["maximum"] == 100
    assert parametros["pagina"]["schema"]["minimum"] == 1
    assert parametros["mios"]["schema"]["type"] == "boolean"


async def test_rf031_esquema_cliente_tiene_los_campos_de_la_ficha(
    contrato: dict[str, Any],
) -> None:
    cliente = contrato["components"]["schemas"]["Cliente"]

    assert {
        "id",
        "nombre",
        "contacto",
        "segmento",
        "etiquetas",
        "preferencias",
        "no_recontactar",
        "asesor_asignado_id",
    } <= set(cliente["properties"])
    assert {"id", "nombre", "contacto", "segmento", "etiquetas", "no_recontactar"} <= set(
        cliente["required"]
    )
    segmento = _resolver(contrato, cliente["properties"]["segmento"])
    assert set(segmento["enum"]) == {"familia", "amigos", "individual", "pareja"}


async def test_rf031_alta_exige_nombre_contacto_y_segmento(contrato: dict[str, Any]) -> None:
    operacion = contrato["paths"]["/api/clientes"]["post"]

    assert {"nombre", "contacto", "segmento"} <= set(
        _cuerpo(contrato, "post", "/api/clientes")["required"]
    )
    assert "201" in operacion["responses"]
    assert "422" in operacion["responses"]


async def test_rf031_alta_contempla_duplicado_y_confirmacion_explicita(
    contrato: dict[str, Any],
) -> None:
    """CU-02 A1: 409 por posible duplicado; se reintenta con `confirmar_duplicado`."""
    operacion = contrato["paths"]["/api/clientes"]["post"]
    esquema = _cuerpo(contrato, "post", "/api/clientes")

    assert "409" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["409"]["content"]
    assert esquema["properties"]["confirmar_duplicado"]["type"] == "boolean"
    assert "confirmar_duplicado" not in esquema["required"]


async def test_rf031_409_del_alta_trae_los_posibles_duplicados(contrato: dict[str, Any]) -> None:
    respuesta = contrato["paths"]["/api/clientes"]["post"]["responses"]["409"]
    esquema = _resolver(contrato, respuesta["content"][PROBLEM_JSON]["schema"])

    assert "duplicados" in esquema["properties"]
    assert _nombre(esquema["properties"]["duplicados"]["items"]["$ref"]) == "Cliente"


@pytest.mark.parametrize(
    "ruta", ["/api/clientes/{cliente_id}", "/api/clientes/{cliente_id}/historial"]
)
async def test_rf031_ver_y_historial_declaran_404(contrato: dict[str, Any], ruta: str) -> None:
    assert "404" in contrato["paths"][ruta]["get"]["responses"]


async def test_rf031_editar_declara_404_422_y_esquema_parcial(contrato: dict[str, Any]) -> None:
    ruta = "/api/clientes/{cliente_id}"
    operacion = contrato["paths"][ruta]["patch"]
    esquema = _cuerpo(contrato, "patch", ruta)

    assert {"404", "422"} <= set(operacion["responses"])
    assert not esquema.get("required")
    assert "no_recontactar" in esquema["properties"]


async def test_rf031_historial_tiene_esquema_propio(contrato: dict[str, Any]) -> None:
    ok = contrato["paths"]["/api/clientes/{cliente_id}/historial"]["get"]["responses"]["200"]
    esquema = _resolver(contrato, ok["content"]["application/json"]["schema"])

    assert {"oportunidades", "viajes", "resenas"} <= set(esquema["properties"])


@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), OPERACIONES)
async def test_rf031_sin_token_responde_401_problem_json(
    cliente_sin_sesion: AsyncClient, metodo: str, ruta: str, cuerpo: dict[str, Any] | None
) -> None:
    r = await cliente_sin_sesion.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


IMPLEMENTADAS = {
    ("post", "/api/clientes"),  # T-040
    ("get", "/api/clientes"),  # T-041
    ("get", f"/api/clientes/{ID}"),  # T-041
    ("get", f"/api/clientes/{ID}/historial"),  # T-043
}
OPERACIONES_501 = [op for op in OPERACIONES if op[:2] not in IMPLEMENTADAS]


@pytest.mark.parametrize("rol", ROLES)
@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), OPERACIONES_501)
async def test_rf031_con_token_de_cualquier_rol_responde_501_problem_json(
    cliente_como: FabricaCliente,
    rol: str,
    metodo: str,
    ruta: str,
    cuerpo: dict[str, Any] | None,
) -> None:
    c = await cliente_como(rol)

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 501
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 501


async def test_rf031_buscar_con_filtros_validos_responde_200(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.get(
        "/api/clientes",
        params={
            "buscar": "ana",
            "etiquetas": "luna de miel",
            "mios": "true",
            "pagina": 2,
            "por_pagina": 50,
        },
    )

    assert r.status_code == 200


@pytest.mark.parametrize("params", [{"por_pagina": 101}, {"pagina": 0}, {"mios": "quizas"}])
async def test_rf031_buscar_con_filtros_invalidos_responde_422(
    cliente_como: FabricaCliente, params: dict[str, Any]
) -> None:
    c = await cliente_como("admin")

    r = await c.get("/api/clientes", params=params)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    "cuerpo",
    [
        {},
        {"nombre": "Ana"},
        {**CUERPO_ALTA, "segmento": "otro"},
        {**CUERPO_ALTA, "nombre": "x" * 121},
    ],
)
async def test_rf031_alta_con_cuerpo_invalido_responde_422(
    cliente_como: FabricaCliente, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/clientes", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf031_ver_con_id_que_no_es_uuid_responde_422(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes/no-es-uuid")

    assert r.status_code == 422


@pytest.mark.parametrize("campo", ["nombre", "contacto", "segmento", "etiquetas", "no_recontactar"])
async def test_cu03_a2_editar_con_null_explicito_responde_422(
    cliente_como: FabricaCliente, campo: str
) -> None:
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/clientes/{ID}", json={campo: None})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_cu03_editar_acepta_null_en_preferencias_y_asesor(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("empleado")

    r = await c.patch(
        f"/api/clientes/{ID}", json={"preferencias": None, "asesor_asignado_id": None}
    )

    assert r.status_code == 501


async def test_cu03_a2_el_contrato_no_publica_como_nullable_lo_que_no_admite_null(
    contrato: dict[str, Any],
) -> None:
    propiedades = _cuerpo(contrato, "patch", "/api/clientes/{cliente_id}")["properties"]

    for campo in ("nombre", "contacto", "etiquetas", "no_recontactar"):
        assert "anyOf" not in propiedades[campo], campo
    assert "anyOf" in propiedades["preferencias"]


async def test_rf031_buscar_filtra_por_segmento(
    cliente_como: FabricaCliente, contrato: dict[str, Any]
) -> None:
    parametros = {p["name"] for p in contrato["paths"]["/api/clientes"]["get"]["parameters"]}
    c = await cliente_como("empleado")

    r = await c.get("/api/clientes", params={"segmento": "pareja"})
    invalido = await c.get("/api/clientes", params={"segmento": "otro"})

    assert "segmento" in parametros
    assert r.status_code == 200
    assert invalido.status_code == 422


async def test_rf031_cliente_publica_la_auditoria_de_solo_lectura(
    contrato: dict[str, Any],
) -> None:
    cliente = contrato["components"]["schemas"]["Cliente"]

    for campo in ("created_by", "updated_by", "created_at", "updated_at"):
        assert cliente["properties"][campo]["readOnly"] is True
    assert {"created_at", "updated_at"} <= set(cliente["required"])
