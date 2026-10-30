"""T-119: contrato de calendario, dashboard y reportes (CU-21, CU-22, CU-23).

Rutas, parámetros, formatos, token, roles y 501.
"""

from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient

PROBLEM_JSON = "application/problem+json"
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
ROLES = ["admin", "dueno", "empleado", "freelance"]
ROLES_REPORTES = ["admin", "dueno"]
ROLES_SIN_REPORTES = ["empleado", "freelance"]
REPORTE = "ventas"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]

# (método, ruta del contrato, ruta concreta, tag, roles del texto, CU, errores obligatorios)
OPERACIONES: list[tuple[str, str, str, str, list[str], str, set[str]]] = [
    ("get", "/api/dashboard", "/api/dashboard", "dashboard", ROLES, "CU-21", {"422"}),
    ("get", "/api/reportes", "/api/reportes", "dashboard", ROLES_REPORTES, "CU-22", {"403"}),
    (
        "get",
        "/api/reportes/{reporte_id}",
        f"/api/reportes/{REPORTE}",
        "dashboard",
        ROLES_REPORTES,
        "CU-22",
        {"403", "404", "422"},
    ),
    ("get", "/api/calendario", "/api/calendario", "calendario", ROLES, "CU-23", {"422"}),
]
RUTAS_CONTRATO = [(m, r, tag, roles, cu, e) for m, r, _, tag, roles, cu, e in OPERACIONES]
RUTAS_HTTP = [(m, c) for m, _, c, _, _, _, _ in OPERACIONES]
RUTAS_SOLO_ADMIN_Y_DUENO = [
    ("get", "/api/reportes"),
    ("get", f"/api/reportes/{REPORTE}"),
]
RUTAS_PARA_TODOS = [("get", "/api/dashboard"), ("get", "/api/calendario")]


@pytest.fixture
async def contrato(cliente_sin_sesion: AsyncClient) -> dict[str, Any]:
    r = await cliente_sin_sesion.get("/api/openapi.json")
    assert r.status_code == 200
    return r.json()


def _parametros(contrato: dict[str, Any], ruta: str) -> dict[str, dict[str, Any]]:
    return {p["name"]: p for p in contrato["paths"][ruta]["get"]["parameters"]}


def _tipo(parametro: dict[str, Any]) -> dict[str, Any]:
    esquema = parametro["schema"]
    for opcion in esquema.get("anyOf", []):
        if opcion.get("type") != "null":
            return opcion
    return esquema


@pytest.mark.parametrize(("metodo", "ruta", "tag", "roles", "cu", "errores"), RUTAS_CONTRATO)
async def test_cu21_contrato_publica_las_rutas_del_modulo(
    contrato: dict[str, Any],
    metodo: str,
    ruta: str,
    tag: str,
    roles: list[str],
    cu: str,
    errores: set[str],
) -> None:
    assert metodo in contrato["paths"][ruta]
    operacion = contrato["paths"][ruta][metodo]
    assert tag in operacion["tags"]
    assert operacion["security"], "la operación exige token Bearer"
    assert "401" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["401"]["content"]
    assert errores <= set(operacion["responses"])


def test_cu21_son_exactamente_cuatro_rutas() -> None:
    assert len(RUTAS_CONTRATO) == 4
    assert len({(m, r) for m, r, *_ in RUTAS_CONTRATO}) == 4


@pytest.mark.parametrize(("metodo", "ruta", "tag", "roles", "cu", "errores"), RUTAS_CONTRATO)
async def test_cu21_contrato_declara_los_roles_y_el_caso_de_uso(
    contrato: dict[str, Any],
    metodo: str,
    ruta: str,
    tag: str,
    roles: list[str],
    cu: str,
    errores: set[str],
) -> None:
    descripcion = contrato["paths"][ruta][metodo]["description"]

    for rol in roles:
        assert rol in descripcion
    assert cu in descripcion


@pytest.mark.parametrize("ruta", ["/api/dashboard", "/api/calendario"])
async def test_cu21_filtros_de_periodo_son_fechas_opcionales(
    contrato: dict[str, Any], ruta: str
) -> None:
    parametros = _parametros(contrato, ruta)

    for nombre in ("desde", "hasta"):
        assert nombre in parametros
        assert not parametros[nombre].get("required")
        assert _tipo(parametros[nombre])["format"] == "date"


async def test_cu21_dashboard_solo_filtra_por_periodo(contrato: dict[str, Any]) -> None:
    assert set(_parametros(contrato, "/api/dashboard")) == {"desde", "hasta"}


async def test_cu23_calendario_publica_filtros_de_responsable_tipo_y_vista_personal(
    contrato: dict[str, Any],
) -> None:
    parametros = _parametros(contrato, "/api/calendario")

    assert {"desde", "hasta", "mios", "tipo", "responsable_id"} <= set(parametros)
    assert _tipo(parametros["tipo"])["enum"] == ["viaje", "vencimiento"]
    assert _tipo(parametros["responsable_id"])["format"] == "uuid"
    assert _tipo(parametros["mios"])["type"] == "boolean"


async def test_cu22_reporte_admite_periodo_comparacion_y_formato(
    contrato: dict[str, Any],
) -> None:
    parametros = _parametros(contrato, "/api/reportes/{reporte_id}")

    assert {
        "reporte_id",
        "desde",
        "hasta",
        "comparar_desde",
        "comparar_hasta",
        "formato",
    } <= set(parametros)
    assert parametros["reporte_id"]["in"] == "path"
    assert parametros["reporte_id"]["required"] is True
    for nombre in ("desde", "hasta", "comparar_desde", "comparar_hasta"):
        assert _tipo(parametros[nombre])["format"] == "date"
    formato = _tipo(parametros["formato"])
    assert formato["enum"] == ["json", "xlsx", "pdf"]
    assert formato["default"] == "json"


async def test_cu22_reporte_responde_en_json_excel_y_pdf(contrato: dict[str, Any]) -> None:
    contenido = contrato["paths"]["/api/reportes/{reporte_id}"]["get"]["responses"]["200"][
        "content"
    ]

    assert {"application/json", XLSX, "application/pdf"} <= set(contenido)
    assert contenido[XLSX]["schema"] == {"type": "string", "format": "binary"}
    assert contenido["application/pdf"]["schema"] == {"type": "string", "format": "binary"}


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_HTTP)
async def test_cu21_sin_token_responde_401_problem_json(
    cliente_sin_sesion: AsyncClient, metodo: str, ruta: str
) -> None:
    r = await cliente_sin_sesion.request(metodo, ruta)

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("rol", ROLES_SIN_REPORTES)
@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_SOLO_ADMIN_Y_DUENO)
async def test_cu22_reportes_vedados_a_empleado_y_freelance_responden_403(
    cliente_como: FabricaCliente, rol: str, metodo: str, ruta: str
) -> None:
    c = await cliente_como(rol)

    r = await c.request(metodo, ruta)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 403


@pytest.mark.parametrize("rol", ROLES_REPORTES)
@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_SOLO_ADMIN_Y_DUENO)
async def test_cu22_reportes_con_admin_o_dueno_responden_501_problem_json(
    cliente_como: FabricaCliente, rol: str, metodo: str, ruta: str
) -> None:
    c = await cliente_como(rol)

    r = await c.request(metodo, ruta)

    assert r.status_code == 501
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 501


@pytest.mark.parametrize("formato", ["json", "xlsx", "pdf"])
async def test_cu22_reporte_en_cualquier_formato_responde_501_mientras_no_se_implemente(
    cliente_como: FabricaCliente, formato: str
) -> None:
    c = await cliente_como("dueno")

    r = await c.get(f"/api/reportes/{REPORTE}", params={"formato": formato})

    assert r.status_code == 501
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_cu22_reporte_con_periodo_y_comparacion_valida_responde_501(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("admin")

    r = await c.get(
        f"/api/reportes/{REPORTE}",
        params={
            "desde": "2026-01-01",
            "hasta": "2026-06-30",
            "comparar_desde": "2025-01-01",
            "comparar_hasta": "2025-06-30",
        },
    )

    assert r.status_code == 501


@pytest.mark.parametrize("rol", ROLES)
@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_PARA_TODOS)
async def test_cu21_dashboard_y_calendario_con_cualquier_rol_responden_501_problem_json(
    cliente_como: FabricaCliente, rol: str, metodo: str, ruta: str
) -> None:
    c = await cliente_como(rol)

    r = await c.request(metodo, ruta)

    assert r.status_code == 501
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 501


async def test_cu23_calendario_con_todos_los_filtros_validos_responde_501(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("empleado")

    r = await c.get(
        "/api/calendario",
        params={
            "desde": "2026-11-01",
            "hasta": "2026-11-30",
            "mios": "true",
            "tipo": "vencimiento",
            "responsable_id": "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01",
        },
    )

    assert r.status_code == 501


@pytest.mark.parametrize(
    ("ruta", "params"),
    [
        ("/api/dashboard", {"desde": "ayer"}),
        ("/api/dashboard", {"hasta": "2026-13-45"}),
        ("/api/calendario", {"desde": "ayer"}),
        ("/api/calendario", {"hasta": "no-es-fecha"}),
        ("/api/calendario", {"tipo": "cumpleanos"}),
        ("/api/calendario", {"responsable_id": "no-es-uuid"}),
        ("/api/calendario", {"mios": "quizas"}),
        (f"/api/reportes/{REPORTE}", {"formato": "csv"}),
        (f"/api/reportes/{REPORTE}", {"desde": "ayer"}),
        (f"/api/reportes/{REPORTE}", {"comparar_desde": "ayer"}),
        (f"/api/reportes/{REPORTE}", {"comparar_hasta": "ayer"}),
    ],
)
async def test_cu21_filtros_invalidos_responden_422_problem_json(
    cliente_como: FabricaCliente, ruta: str, params: dict[str, Any]
) -> None:
    c = await cliente_como("admin")

    r = await c.get(ruta, params=params)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
