"""T-061: contrato de oportunidades y cotizaciones (CU-04, CU-05, CU-06).

Rutas, esquemas, token, roles y 501.
"""

import re
from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient

PROBLEM_JSON = "application/problem+json"
ID = "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01"
ROLES = ["admin", "dueno", "empleado", "freelance"]
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]

CREAR = {
    "cliente_id": ID,
    "canal": "whatsapp",
    "destino_consultado": "Bariloche",
    "pasajeros": 2,
}
EDITAR = {"pasajeros": 3, "notas": "Prefieren febrero"}
PERDER = {"motivo_perdida": "precio"}
INSISTENCIA = {"fecha": "2026-11-10", "descripcion": "Volver a llamar"}
COTIZACION = {
    "moneda": "ARS",
    "items": [{"concepto": "Aéreo", "precio": "850000.00"}],
}

# (método, ruta del contrato, ruta concreta, cuerpo, caso de uso, errores obligatorios)
OPERACIONES: list[tuple[str, str, str, Any, str, set[str]]] = [
    ("get", "/api/oportunidades", "/api/oportunidades", None, "CU-05", {"422"}),
    ("post", "/api/oportunidades", "/api/oportunidades", CREAR, "CU-04", {"422"}),
    (
        "get",
        "/api/oportunidades/{oportunidad_id}",
        f"/api/oportunidades/{ID}",
        None,
        "CU-05",
        {"404"},
    ),
    (
        "patch",
        "/api/oportunidades/{oportunidad_id}",
        f"/api/oportunidades/{ID}",
        EDITAR,
        "CU-05",
        {"403", "404", "422"},
    ),
    (
        "post",
        "/api/oportunidades/{oportunidad_id}/en-gestion",
        f"/api/oportunidades/{ID}/en-gestion",
        None,
        "CU-05",
        {"403", "404", "409"},
    ),
    (
        "post",
        "/api/oportunidades/{oportunidad_id}/insistencias",
        f"/api/oportunidades/{ID}/insistencias",
        INSISTENCIA,
        "CU-05",
        {"403", "404", "422"},
    ),
    (
        "post",
        "/api/oportunidades/{oportunidad_id}/perder",
        f"/api/oportunidades/{ID}/perder",
        PERDER,
        "CU-05",
        {"403", "404", "409", "422"},
    ),
    (
        "post",
        "/api/oportunidades/{oportunidad_id}/reactivar",
        f"/api/oportunidades/{ID}/reactivar",
        None,
        "CU-05",
        {"403", "404", "409"},
    ),
    (
        "post",
        "/api/oportunidades/{oportunidad_id}/ganar",
        f"/api/oportunidades/{ID}/ganar",
        None,
        "CU-05",
        {"403", "404", "409"},
    ),
    (
        "get",
        "/api/oportunidades/{oportunidad_id}/cotizaciones",
        f"/api/oportunidades/{ID}/cotizaciones",
        None,
        "CU-06",
        {"404", "422"},
    ),
    (
        "post",
        "/api/oportunidades/{oportunidad_id}/cotizaciones",
        f"/api/oportunidades/{ID}/cotizaciones",
        COTIZACION,
        "CU-06",
        {"403", "404", "409", "422"},
    ),
    (
        "get",
        "/api/cotizaciones/{cotizacion_id}",
        f"/api/cotizaciones/{ID}",
        None,
        "CU-06",
        {"404"},
    ),
    (
        "get",
        "/api/cotizaciones/{cotizacion_id}/documento",
        f"/api/cotizaciones/{ID}/documento",
        None,
        "CU-06",
        {"404"},
    ),
    (
        "post",
        "/api/cotizaciones/{cotizacion_id}/enviar",
        f"/api/cotizaciones/{ID}/enviar",
        None,
        "CU-06",
        {"403", "404", "409"},
    ),
    (
        "post",
        "/api/cotizaciones/{cotizacion_id}/aceptar",
        f"/api/cotizaciones/{ID}/aceptar",
        None,
        "CU-06",
        {"403", "404", "409"},
    ),
    (
        "post",
        "/api/cotizaciones/{cotizacion_id}/rechazar",
        f"/api/cotizaciones/{ID}/rechazar",
        None,
        "CU-06",
        {"403", "404", "409"},
    ),
]
# Las que todavía responden 501 (listar, ver y editar oportunidades se implementaron en T-063;
# las acciones de estado en T-064).
IMPLEMENTADAS = {
    ("get", "/api/oportunidades"),
    ("get", "/api/oportunidades/{oportunidad_id}"),
    ("patch", "/api/oportunidades/{oportunidad_id}"),
    ("post", "/api/oportunidades/{oportunidad_id}/en-gestion"),
    ("post", "/api/oportunidades/{oportunidad_id}/perder"),
    ("post", "/api/oportunidades/{oportunidad_id}/reactivar"),
    ("post", "/api/oportunidades/{oportunidad_id}/ganar"),
}
OPERACIONES_STUB = [
    (m, c, cuerpo) for m, r, c, cuerpo, _, _ in OPERACIONES if (m, r) not in IMPLEMENTADAS
]
RUTAS_CONTRATO = [(m, r, cu, errores) for m, r, _, _, cu, errores in OPERACIONES]
OPERACIONES_HTTP = [(m, c, cuerpo) for m, _, c, cuerpo, _, _ in OPERACIONES]
RUTAS_CON_409 = [(m, r) for m, r, _, _, _, e in OPERACIONES if "409" in e]


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


def _es_texto_decimal(contrato: dict[str, Any], propiedad: dict[str, Any]) -> bool:
    """Texto (no number), tolerando anyOf/oneOf con null."""
    opciones = propiedad.get("anyOf") or propiedad.get("oneOf") or [propiedad]
    tipos = [_resolver(contrato, o).get("type") for o in opciones]
    return "string" in tipos and "number" not in tipos and "integer" not in tipos


def _enum(contrato: dict[str, Any], propiedad: dict[str, Any]) -> set[str]:
    opciones = propiedad.get("anyOf") or propiedad.get("oneOf") or [propiedad]
    valores: set[str] = set()
    for o in opciones:
        valores |= set(_resolver(contrato, o).get("enum", []))
    return valores


def _cuerpo(contrato: dict[str, Any], metodo: str, ruta: str) -> dict[str, Any]:
    operacion = contrato["paths"][ruta][metodo]
    return _resolver(contrato, operacion["requestBody"]["content"]["application/json"]["schema"])


def _respuesta(contrato: dict[str, Any], metodo: str, ruta: str, codigo: str) -> dict[str, Any]:
    ok = contrato["paths"][ruta][metodo]["responses"][codigo]
    return ok["content"]["application/json"]["schema"]


def _ref(esquema: dict[str, Any]) -> str:
    return _nombre(esquema["$ref"])


@pytest.mark.parametrize(("metodo", "ruta", "cu", "errores"), RUTAS_CONTRATO)
async def test_cu05_contrato_publica_las_dieciseis_rutas(
    contrato: dict[str, Any], metodo: str, ruta: str, cu: str, errores: set[str]
) -> None:
    assert metodo in contrato["paths"][ruta]
    operacion = contrato["paths"][ruta][metodo]
    assert "oportunidades" in operacion["tags"]
    assert operacion["security"], "la operación exige token Bearer"
    assert "401" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["401"]["content"]
    assert errores <= set(operacion["responses"])


def test_cu05_son_exactamente_dieciseis_rutas() -> None:
    assert len(RUTAS_CONTRATO) == 16
    assert len({(m, r) for m, r, _, _ in RUTAS_CONTRATO}) == 16


@pytest.mark.parametrize(("metodo", "ruta", "cu", "errores"), RUTAS_CONTRATO)
async def test_cu05_contrato_declara_los_roles_y_el_caso_de_uso(
    contrato: dict[str, Any], metodo: str, ruta: str, cu: str, errores: set[str]
) -> None:
    descripcion = contrato["paths"][ruta][metodo]["description"]

    for rol in ROLES:
        assert rol in descripcion
    assert cu in descripcion


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_CON_409)
async def test_cu05_409_por_estado_se_publica_como_problem_json(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    respuestas = contrato["paths"][ruta][metodo]["responses"]

    assert PROBLEM_JSON in respuestas["409"]["content"]


async def test_cu05_listar_oportunidades_publica_filtros_y_paginacion(
    contrato: dict[str, Any],
) -> None:
    operacion = contrato["paths"]["/api/oportunidades"]["get"]
    nombres = {p["name"] for p in operacion["parameters"]}

    assert {"pagina", "por_pagina", "mios", "estado", "cliente_id"} <= nombres
    esquema = _respuesta(contrato, "get", "/api/oportunidades", "200")
    assert _ref(esquema["properties"]["items"]["items"]) == "Oportunidad"
    assert {"items", "total", "pagina", "por_pagina"} <= set(esquema["required"])


async def test_cu06_listar_versiones_publica_paginacion_y_devuelve_cotizaciones(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/oportunidades/{oportunidad_id}/cotizaciones"
    operacion = contrato["paths"][ruta]["get"]
    nombres = {p["name"] for p in operacion["parameters"]}

    assert {"pagina", "por_pagina"} <= nombres
    esquema = _respuesta(contrato, "get", ruta, "200")
    assert _ref(esquema["properties"]["items"]["items"]) == "Cotizacion"
    assert {"items", "total", "pagina", "por_pagina"} <= set(esquema["required"])


async def test_cu05_oportunidad_tiene_los_cinco_estados_y_tres_canales(
    contrato: dict[str, Any],
) -> None:
    propiedades, _ = _componer(contrato, "Oportunidad")

    assert _enum(contrato, propiedades["estado"]) == {
        "nueva",
        "en_gestion",
        "cotizada",
        "ganada",
        "perdida",
    }
    assert _enum(contrato, propiedades["canal"]) == {"instagram", "whatsapp", "presencial"}


async def test_cu05_ficha_de_la_oportunidad_publica_sus_campos(
    contrato: dict[str, Any],
) -> None:
    propiedades, requeridos = _componer(contrato, "Oportunidad")

    assert {
        "id",
        "cliente_id",
        "responsable_id",
        "canal",
        "destino_consultado",
        "fecha_desde_tentativa",
        "fecha_hasta_tentativa",
        "pasajeros",
        "estado",
        "motivo_perdida",
        "motivo_perdida_detalle",
        "notas",
    } <= set(propiedades)
    assert {
        "id",
        "cliente_id",
        "responsable_id",
        "canal",
        "destino_consultado",
        "pasajeros",
        "estado",
    } <= requeridos


@pytest.mark.parametrize("campo", ["id", "estado", "motivo_perdida", "motivo_perdida_detalle"])
async def test_cu05_campos_de_estado_de_la_oportunidad_son_de_solo_lectura(
    contrato: dict[str, Any], campo: str
) -> None:
    propiedades, _ = _componer(contrato, "Oportunidad")

    assert propiedades[campo]["readOnly"] is True


async def test_cu05_motivos_de_perdida_son_los_seis_del_catalogo(
    contrato: dict[str, Any],
) -> None:
    esquema = _cuerpo(contrato, "post", "/api/oportunidades/{oportunidad_id}/perder")

    assert _enum(contrato, esquema["properties"]["motivo_perdida"]) == {
        "precio",
        "fechas_disponibilidad",
        "desistio",
        "otra_agencia",
        "sin_respuesta",
        "otro",
    }


async def test_cu04_crear_oportunidad_exige_cliente_canal_destino_y_pasajeros(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/oportunidades"
    esquema = _cuerpo(contrato, "post", ruta)

    assert {"cliente_id", "canal", "destino_consultado", "pasajeros"} <= set(esquema["required"])
    assert esquema["properties"]["pasajeros"]["minimum"] == 1
    assert "responsable_id" not in esquema["properties"], "el responsable es quien la registra"
    assert _ref(_respuesta(contrato, "post", ruta, "201")) == "Oportunidad"


async def test_cu05_editar_oportunidad_acepta_reasignar_responsable(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/oportunidades/{oportunidad_id}"
    esquema = _cuerpo(contrato, "patch", ruta)

    assert "responsable_id" in esquema["properties"]
    assert not esquema.get("required")
    assert _ref(_respuesta(contrato, "patch", ruta, "200")) == "Oportunidad"


async def test_cu05_perder_exige_motivo_y_devuelve_la_oportunidad(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/oportunidades/{oportunidad_id}/perder"
    esquema = _cuerpo(contrato, "post", ruta)

    assert "motivo_perdida" in esquema["required"]
    assert "motivo_perdida_detalle" in esquema["properties"]
    assert _ref(_respuesta(contrato, "post", ruta, "200")) == "Oportunidad"


@pytest.mark.parametrize("accion", ["en-gestion", "reactivar", "ganar"])
async def test_cu05_transiciones_de_estado_devuelven_la_oportunidad(
    contrato: dict[str, Any], accion: str
) -> None:
    ruta = f"/api/oportunidades/{{oportunidad_id}}/{accion}"

    assert _ref(_respuesta(contrato, "post", ruta, "200")) == "Oportunidad"


async def test_cu05_insistencia_exige_fecha_y_descripcion_y_crea_una_alerta(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/oportunidades/{oportunidad_id}/insistencias"
    esquema = _cuerpo(contrato, "post", ruta)

    assert {"fecha", "descripcion"} <= set(esquema["required"])
    assert _ref(_respuesta(contrato, "post", ruta, "201")) == "Alerta"


async def test_cu06_cotizacion_publica_estado_moneda_total_y_validez(
    contrato: dict[str, Any],
) -> None:
    propiedades, requeridos = _componer(contrato, "Cotizacion")
    campos = {
        "id",
        "oportunidad_id",
        "fecha",
        "moneda",
        "items",
        "total",
        "validez_hasta",
        "estado",
    }

    assert campos <= set(propiedades)
    assert campos <= requeridos
    assert _enum(contrato, propiedades["estado"]) == {
        "borrador",
        "enviada",
        "aceptada",
        "rechazada",
        "vencida",
    }
    assert _enum(contrato, propiedades["moneda"]) == {"ARS", "USD"}


async def test_cu06_total_de_la_cotizacion_es_texto_decimal_de_solo_lectura(
    contrato: dict[str, Any],
) -> None:
    """DEC-0007: ningún importe viaja como número (evita errores de punto flotante)."""
    propiedades, _ = _componer(contrato, "Cotizacion")

    assert _es_texto_decimal(contrato, propiedades["total"])
    assert propiedades["total"]["readOnly"] is True
    assert re.fullmatch(propiedades["total"]["pattern"], "1000000.00")
    assert not re.fullmatch(propiedades["total"]["pattern"], "1e6")


@pytest.mark.parametrize("campo", ["id", "oportunidad_id", "fecha", "validez_hasta", "estado"])
async def test_cu06_campos_calculados_y_de_estado_de_la_cotizacion_son_de_solo_lectura(
    contrato: dict[str, Any], campo: str
) -> None:
    propiedades, _ = _componer(contrato, "Cotizacion")

    assert propiedades[campo]["readOnly"] is True


async def test_cu06_item_de_cotizacion_tiene_concepto_y_precio_texto_decimal(
    contrato: dict[str, Any],
) -> None:
    propiedades, _ = _componer(contrato, "Cotizacion")
    item = _resolver(contrato, propiedades["items"]["items"])

    assert propiedades["items"]["minItems"] == 1
    assert {"concepto", "precio"} <= set(item["required"])
    assert _es_texto_decimal(contrato, item["properties"]["precio"])


async def test_cu06_crear_version_exige_moneda_e_items_y_devuelve_la_cotizacion(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/oportunidades/{oportunidad_id}/cotizaciones"
    esquema = _cuerpo(contrato, "post", ruta)

    assert {"moneda", "items"} <= set(esquema["required"])
    assert esquema["properties"]["items"]["minItems"] == 1
    assert _enum(contrato, esquema["properties"]["moneda"]) == {"ARS", "USD"}
    assert _ref(_respuesta(contrato, "post", ruta, "201")) == "Cotizacion"


async def test_cu06_obtener_cotizacion_devuelve_la_cotizacion(contrato: dict[str, Any]) -> None:
    esquema = _respuesta(contrato, "get", "/api/cotizaciones/{cotizacion_id}", "200")

    assert _ref(esquema) == "Cotizacion"


@pytest.mark.parametrize("accion", ["enviar", "aceptar", "rechazar"])
async def test_cu06_acciones_de_estado_devuelven_la_cotizacion(
    contrato: dict[str, Any], accion: str
) -> None:
    ruta = f"/api/cotizaciones/{{cotizacion_id}}/{accion}"

    assert _ref(_respuesta(contrato, "post", ruta, "200")) == "Cotizacion"


async def test_cu06_documento_de_la_cotizacion_es_application_pdf(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/cotizaciones/{cotizacion_id}/documento"
    respuesta = contrato["paths"][ruta]["get"]["responses"]["200"]

    assert "application/pdf" in respuesta["content"]
    assert "application/json" not in respuesta["content"]
    assert respuesta["content"]["application/pdf"]["schema"] == {
        "type": "string",
        "format": "binary",
    }


async def test_cu06_oportunidad_y_cotizacion_publican_la_auditoria_de_solo_lectura(
    contrato: dict[str, Any],
) -> None:
    for nombre in ("Oportunidad", "Cotizacion"):
        propiedades, _ = _componer(contrato, nombre)
        for campo in ("created_by", "updated_by", "created_at", "updated_at"):
            assert propiedades[campo]["readOnly"] is True


@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), OPERACIONES_HTTP)
async def test_cu05_sin_token_responde_401_problem_json(
    cliente_sin_sesion: AsyncClient, metodo: str, ruta: str, cuerpo: Any
) -> None:
    r = await cliente_sin_sesion.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("rol", ROLES)
@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), OPERACIONES_STUB)
async def test_cu05_con_token_de_cualquier_rol_responde_501_problem_json(
    cliente_como: FabricaCliente, rol: str, metodo: str, ruta: str, cuerpo: Any
) -> None:
    c = await cliente_como(rol)

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 501
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 501


@pytest.mark.parametrize(
    ("metodo", "ruta", "cuerpo"),
    [
        ("post", "/api/oportunidades", {}),
        ("post", "/api/oportunidades", {**CREAR, "pasajeros": 0}),
        ("post", "/api/oportunidades", {**CREAR, "canal": "telegrama"}),
        ("post", "/api/oportunidades", {**CREAR, "cliente_id": "no-es-uuid"}),
        ("patch", f"/api/oportunidades/{ID}", {"pasajeros": 0}),
        ("post", f"/api/oportunidades/{ID}/perder", {}),
        ("post", f"/api/oportunidades/{ID}/perder", {"motivo_perdida": "aburrimiento"}),
        ("post", f"/api/oportunidades/{ID}/insistencias", {"fecha": "2026-11-10"}),
        ("post", f"/api/oportunidades/{ID}/insistencias", {**INSISTENCIA, "fecha": "mañana"}),
        ("post", f"/api/oportunidades/{ID}/cotizaciones", {}),
        ("post", f"/api/oportunidades/{ID}/cotizaciones", {**COTIZACION, "items": []}),
        ("post", f"/api/oportunidades/{ID}/cotizaciones", {**COTIZACION, "moneda": "EUR"}),
        (
            "post",
            f"/api/oportunidades/{ID}/cotizaciones",
            {**COTIZACION, "items": [{"concepto": "Aéreo", "precio": "mucho"}]},
        ),
        (
            "post",
            f"/api/oportunidades/{ID}/cotizaciones",
            {**COTIZACION, "items": [{"concepto": "   ", "precio": "850000.00"}]},
        ),
    ],
)
async def test_cu05_cuerpo_invalido_responde_422(
    cliente_como: FabricaCliente, metodo: str, ruta: str, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    ("ruta", "params"),
    [
        ("/api/oportunidades", {"por_pagina": 101}),
        ("/api/oportunidades", {"pagina": 0}),
        ("/api/oportunidades", {"estado": "archivada"}),
        ("/api/oportunidades", {"cliente_id": "no-es-uuid"}),
        (f"/api/oportunidades/{ID}/cotizaciones", {"por_pagina": 101}),
        (f"/api/oportunidades/{ID}/cotizaciones", {"pagina": 0}),
    ],
)
async def test_cu05_listar_con_parametros_invalidos_responde_422(
    cliente_como: FabricaCliente, ruta: str, params: dict[str, Any]
) -> None:
    c = await cliente_como("admin")

    r = await c.get(ruta, params=params)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("get", "/api/oportunidades/no-es-uuid"),
        ("get", "/api/oportunidades/no-es-uuid/cotizaciones"),
        ("post", "/api/oportunidades/no-es-uuid/ganar"),
        ("get", "/api/cotizaciones/no-es-uuid"),
        ("get", "/api/cotizaciones/no-es-uuid/documento"),
        ("post", "/api/cotizaciones/no-es-uuid/aceptar"),
    ],
)
async def test_cu05_id_que_no_es_uuid_responde_422(
    cliente_como: FabricaCliente, metodo: str, ruta: str
) -> None:
    c = await cliente_como("empleado")

    r = await c.request(metodo, ruta)

    assert r.status_code == 422


FECHAS_INVERTIDAS = {"fecha_desde_tentativa": "2027-03-15", "fecha_hasta_tentativa": "2027-03-05"}
FECHAS_IGUALES = {"fecha_desde_tentativa": "2027-03-05", "fecha_hasta_tentativa": "2027-03-05"}


@pytest.mark.parametrize(
    ("metodo", "ruta", "cuerpo"),
    [
        ("post", "/api/oportunidades", {**CREAR, **FECHAS_INVERTIDAS}),
        ("patch", f"/api/oportunidades/{ID}", FECHAS_INVERTIDAS),
    ],
)
async def test_cu04_fechas_tentativas_invertidas_responden_422(
    cliente_como: FabricaCliente, metodo: str, ruta: str, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    "cuerpo",
    [
        {**CREAR, **FECHAS_IGUALES},
        {**CREAR, "fecha_desde_tentativa": "2027-03-05"},
    ],
)
async def test_cu04_fechas_tentativas_iguales_o_incompletas_al_crear_llegan_al_501(
    cliente_como: FabricaCliente, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/oportunidades", json=cuerpo)

    assert r.status_code == 501


@pytest.mark.parametrize(
    "cuerpo",
    [
        FECHAS_IGUALES,
        {"fecha_hasta_tentativa": "2020-01-01"},
        {"fecha_desde_tentativa": "2030-01-01"},
    ],
)
async def test_cu04_fechas_tentativas_iguales_o_incompletas_al_editar_pasan_el_esquema(
    cliente_como: FabricaCliente, cuerpo: dict[str, Any]
) -> None:
    """El esquema las acepta; con un id inexistente la respuesta es 404, no 422."""
    c = await cliente_como("empleado")

    r = await c.patch(f"/api/oportunidades/{ID}", json=cuerpo)

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"motivo_perdida": "otro"},
        {"motivo_perdida": "otro", "motivo_perdida_detalle": None},
        {"motivo_perdida": "otro", "motivo_perdida_detalle": ""},
        {"motivo_perdida": "otro", "motivo_perdida_detalle": "   "},
    ],
)
async def test_cu05_perder_por_otro_sin_detalle_responde_422(
    cliente_como: FabricaCliente, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.post(f"/api/oportunidades/{ID}/perder", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"motivo_perdida": "otro", "motivo_perdida_detalle": "Se mudó de país"},
        {"motivo_perdida": "precio"},
        {"motivo_perdida": "precio", "motivo_perdida_detalle": ""},
    ],
)
async def test_cu05_perder_con_detalle_valido_o_motivo_distinto_pasa_el_esquema(
    cliente_como: FabricaCliente, cuerpo: dict[str, Any]
) -> None:
    """El esquema lo acepta; con un id inexistente la respuesta es 404, no 422."""
    c = await cliente_como("empleado")

    r = await c.post(f"/api/oportunidades/{ID}/perder", json=cuerpo)

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
