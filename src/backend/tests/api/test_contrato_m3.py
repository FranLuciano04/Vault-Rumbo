"""T-050: contrato del módulo alertas (CU-14, CU-28, CU-30): rutas, token, roles y 501."""

from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient

PROBLEM_JSON = "application/problem+json"
ID = "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01"
ROLES = ["admin", "dueno", "empleado", "freelance"]
CUERPO_CREAR = {"fecha": "2026-11-05", "descripcion": "Llamar a Ana por la cotización"}

# (método, ruta, cuerpo)
OPERACIONES: list[tuple[str, str, dict[str, Any] | None]] = [
    ("get", "/api/alertas", None),
    ("post", "/api/alertas", CUERPO_CREAR),
    ("get", "/api/alertas/progreso-del-dia", None),
    ("get", f"/api/alertas/{ID}", None),
    ("patch", f"/api/alertas/{ID}", {"descripcion": "Nuevo texto"}),
    ("post", f"/api/alertas/{ID}/vista", None),
    ("post", f"/api/alertas/{ID}/resolver", None),
    ("post", f"/api/alertas/{ID}/posponer", {"fecha": "2026-12-01"}),
]
# Las que todavía responden 501 (ninguna: la agenda, T-052, atender alertas con el progreso,
# T-053, y los recordatorios manuales, T-054, ya están implementadas).
_IMPLEMENTADAS = {
    ("get", "/api/alertas"),
    ("post", "/api/alertas"),
    ("patch", f"/api/alertas/{ID}"),
    ("get", "/api/alertas/progreso-del-dia"),
    ("get", f"/api/alertas/{ID}"),
    ("post", f"/api/alertas/{ID}/vista"),
    ("post", f"/api/alertas/{ID}/resolver"),
    ("post", f"/api/alertas/{ID}/posponer"),
}
OPERACIONES_STUB = [op for op in OPERACIONES if (op[0], op[1]) not in _IMPLEMENTADAS]
RUTAS_CONTRATO = [
    ("get", "/api/alertas"),
    ("post", "/api/alertas"),
    ("get", "/api/alertas/progreso-del-dia"),
    ("get", "/api/alertas/{alerta_id}"),
    ("patch", "/api/alertas/{alerta_id}"),
    ("post", "/api/alertas/{alerta_id}/vista"),
    ("post", "/api/alertas/{alerta_id}/resolver"),
    ("post", "/api/alertas/{alerta_id}/posponer"),
]
# Rutas con alerta_id: el contrato declara 404 (y 403 en las de escritura, DEC-0005).
RUTAS_CON_ID = [r for r in RUTAS_CONTRATO if "{alerta_id}" in r[1]]
RUTAS_DE_ESCRITURA_CON_ID = [r for r in RUTAS_CON_ID if r[0] != "get"]
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
async def test_rf155_contrato_publica_las_ocho_rutas(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    assert metodo in contrato["paths"][ruta]
    operacion = contrato["paths"][ruta][metodo]
    assert "alertas" in operacion["tags"]
    assert operacion["security"], "la operación exige token Bearer"
    assert "401" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["401"]["content"]


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_CONTRATO)
async def test_rf155_contrato_declara_los_roles_y_casos_de_uso(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    descripcion = contrato["paths"][ruta][metodo]["description"]

    for rol in ROLES:
        assert rol in descripcion
    assert "CU-14" in descripcion or "CU-28" in descripcion


async def test_cu14_listar_publica_filtros_y_paginacion(contrato: dict[str, Any]) -> None:
    operacion = contrato["paths"]["/api/alertas"]["get"]
    parametros = {p["name"]: p for p in operacion["parameters"]}

    assert {
        "pagina",
        "por_pagina",
        "hasta",
        "estado",
        "tipo",
        "proximas",
        "propietario_id",
    } <= set(parametros)
    assert parametros["por_pagina"]["schema"]["maximum"] == 100
    assert parametros["pagina"]["schema"]["minimum"] == 1
    assert parametros["proximas"]["schema"]["type"] == "boolean"
    assert {"type": "string", "format": "uuid"} in parametros["propietario_id"]["schema"]["anyOf"]
    assert "422" in operacion["responses"]
    esquema = operacion["responses"]["200"]["content"]["application/json"]["schema"]
    assert _nombre(esquema["properties"]["items"]["items"]["$ref"]) == "Alerta"
    assert {"items", "total", "pagina", "por_pagina"} <= set(esquema["required"])


async def test_cu14_esquema_alerta_tiene_los_campos_de_la_agenda(
    contrato: dict[str, Any],
) -> None:
    alerta = contrato["components"]["schemas"]["Alerta"]
    # El esquema se compone con Auditoria (allOf): se juntan las propiedades.
    propiedades: dict[str, Any] = {}
    requeridos: set[str] = set()
    for parte in alerta.get("allOf", [alerta]):
        parte = _resolver(contrato, parte)
        propiedades |= parte.get("properties", {})
        requeridos |= set(parte.get("required", []))

    assert {
        "id",
        "propietario_id",
        "tipo",
        "descripcion",
        "fecha",
        "estado",
        "resuelta_en",
        "cerrada_por_cancelacion",
        "viaje_id",
        "pago_id",
        "oportunidad_id",
        "cliente_id",
        "viaje_hotel_id",
    } <= set(propiedades)
    assert {"id", "propietario_id", "tipo", "descripcion", "fecha", "estado"} <= requeridos
    tipo = _resolver(contrato, propiedades["tipo"])
    assert set(tipo["enum"]) == {
        "pago",
        "formulario",
        "salida",
        "insistencia",
        "resena",
        "manual",
        "recontacto",
        "viaje",
    }
    estado = _resolver(contrato, propiedades["estado"])
    assert set(estado["enum"]) == {"pendiente", "vista", "resuelta"}


async def test_cu28_crear_exige_fecha_y_descripcion(contrato: dict[str, Any]) -> None:
    operacion = contrato["paths"]["/api/alertas"]["post"]
    esquema = _cuerpo(contrato, "post", "/api/alertas")

    assert {"fecha", "descripcion"} <= set(esquema["required"])
    assert {"viaje_id", "cliente_id", "oportunidad_id"} <= set(esquema["properties"])
    assert "201" in operacion["responses"]
    assert "422" in operacion["responses"]


async def test_cu28_editar_declara_errores_y_esquema_parcial(contrato: dict[str, Any]) -> None:
    ruta = "/api/alertas/{alerta_id}"
    operacion = contrato["paths"][ruta]["patch"]
    esquema = _cuerpo(contrato, "patch", ruta)

    assert {"403", "404", "409", "422"} <= set(operacion["responses"])
    assert not esquema.get("required")
    assert {"fecha", "descripcion"} <= set(esquema["properties"])


async def test_cu14_posponer_exige_fecha_y_declara_errores(contrato: dict[str, Any]) -> None:
    ruta = "/api/alertas/{alerta_id}/posponer"
    operacion = contrato["paths"][ruta]["post"]

    assert "fecha" in _cuerpo(contrato, "post", ruta)["required"]
    assert {"403", "404", "409", "422"} <= set(operacion["responses"])


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_CON_ID)
async def test_cu14_rutas_con_id_declaran_404(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    assert "404" in contrato["paths"][ruta][metodo]["responses"]


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_DE_ESCRITURA_CON_ID)
async def test_cu14_escrituras_declaran_403_y_el_409_con_problem_json(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    """DEC-0005: solo el responsable, admin o dueño; y no se opera sobre una resuelta."""
    respuestas = contrato["paths"][ruta][metodo]["responses"]

    assert "403" in respuestas
    assert PROBLEM_JSON in respuestas["409"]["content"]


async def test_rf155_progreso_del_dia_tiene_esquema_propio(contrato: dict[str, Any]) -> None:
    ok = contrato["paths"]["/api/alertas/progreso-del-dia"]["get"]["responses"]["200"]
    esquema = _resolver(contrato, ok["content"]["application/json"]["schema"])

    assert {"resueltas_hoy", "total_del_dia"} <= set(esquema["properties"])
    assert {"resueltas_hoy", "total_del_dia"} <= set(esquema["required"])


async def test_cu14_alerta_publica_la_auditoria_de_solo_lectura(
    contrato: dict[str, Any],
) -> None:
    auditoria = contrato["components"]["schemas"]["Auditoria"]

    for campo in ("created_by", "updated_by", "created_at", "updated_at"):
        assert auditoria["properties"][campo]["readOnly"] is True


@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), OPERACIONES)
async def test_rf155_sin_token_responde_401_problem_json(
    cliente_sin_sesion: AsyncClient, metodo: str, ruta: str, cuerpo: dict[str, Any] | None
) -> None:
    r = await cliente_sin_sesion.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("rol", ROLES)
@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), OPERACIONES_STUB)
async def test_rf155_con_token_de_cualquier_rol_responde_501_problem_json(
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


async def test_cu14_listar_con_filtros_validos_responde_200(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.get(
        "/api/alertas",
        params={
            "hasta": "2026-11-30",
            "estado": "pendiente",
            "tipo": "recontacto",
            "proximas": "true",
            "propietario_id": ID,
            "pagina": 2,
            "por_pagina": 50,
        },
    )

    assert r.status_code == 200
    assert r.json()["items"] == []


@pytest.mark.parametrize(
    "params",
    [
        {"por_pagina": 101},
        {"pagina": 0},
        {"estado": "archivada"},
        {"tipo": "otro"},
        {"proximas": "quizas"},
        {"propietario_id": "no-es-uuid"},
        {"hasta": "no-es-fecha"},
    ],
)
async def test_cu14_listar_con_filtros_invalidos_responde_422(
    cliente_como: FabricaCliente, params: dict[str, Any]
) -> None:
    c = await cliente_como("admin")

    r = await c.get("/api/alertas", params=params)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    "cuerpo",
    [
        {},
        {"fecha": "2026-11-05"},
        {"descripcion": "Llamar"},
        {**CUERPO_CREAR, "fecha": "mañana"},
        {**CUERPO_CREAR, "viaje_id": ID, "cliente_id": ID},
    ],
)
async def test_cu28_crear_con_cuerpo_invalido_responde_422(
    cliente_como: FabricaCliente, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/alertas", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("cuerpo", [{}, {"fecha": "no-es-fecha"}])
async def test_cu14_posponer_con_cuerpo_invalido_responde_422(
    cliente_como: FabricaCliente, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.post(f"/api/alertas/{ID}/posponer", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_cu14_ver_con_id_que_no_es_uuid_responde_422(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("empleado")

    r = await c.get("/api/alertas/no-es-uuid")

    assert r.status_code == 422
