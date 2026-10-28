"""T-075: contrato de hoteles y reseñas (CU-16, CU-17, CU-18, CU-29, RF-105).

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

HOTEL = {
    "nombre": "Hotel Llao Llao",
    "destino_id": ID,
    "categoria": "5 estrellas",
    "precio_referencia": "150000.00",
    "servicios": ["wifi", "pileta", "desayuno"],
}
HOTEL_EDITAR = {"categoria": "4 estrellas", "precio_referencia": "120000.00"}
RESENA = {
    "cliente_id": ID,
    "puntaje": 5,
    "comentario": "Excelente atención",
    "fecha": "2026-10-20",
}
RESENA_EDITAR = {"puntaje": 4, "comentario": "Muy bueno, el desayuno flojo"}
OCULTAR = {"motivo_baja": "Contenido ofensivo"}

# (método, ruta del contrato, ruta concreta, cuerpo, caso de uso, es escritura, errores)
OPERACIONES: list[tuple[str, str, str, Any, str, bool, set[str]]] = [
    ("get", "/api/hoteles", "/api/hoteles", None, "CU-18", False, {"422"}),
    ("post", "/api/hoteles", "/api/hoteles", HOTEL, "CU-16", True, {"403", "409", "422"}),
    ("get", "/api/hoteles/{hotel_id}", f"/api/hoteles/{ID}", None, "CU-18", False, {"404"}),
    (
        "patch",
        "/api/hoteles/{hotel_id}",
        f"/api/hoteles/{ID}",
        HOTEL_EDITAR,
        "CU-16",
        True,
        {"403", "404", "409", "422"},
    ),
    (
        "post",
        "/api/hoteles/{hotel_id}/baja",
        f"/api/hoteles/{ID}/baja",
        None,
        "CU-16",
        True,
        {"403", "404", "409"},
    ),
    (
        "get",
        "/api/hoteles/{hotel_id}/resenas",
        f"/api/hoteles/{ID}/resenas",
        None,
        "CU-18",
        False,
        {"403", "404", "422"},
    ),
    (
        "post",
        "/api/hoteles/{hotel_id}/resenas",
        f"/api/hoteles/{ID}/resenas",
        RESENA,
        "CU-17",
        True,
        {"403", "404", "422"},
    ),
    (
        "patch",
        "/api/resenas/{resena_id}",
        f"/api/resenas/{ID}",
        RESENA_EDITAR,
        "CU-17",
        True,
        {"403", "404", "409", "422"},
    ),
    (
        "post",
        "/api/resenas/{resena_id}/ocultar",
        f"/api/resenas/{ID}/ocultar",
        OCULTAR,
        "CU-29",
        True,
        {"403", "404", "409", "422"},
    ),
    (
        "post",
        "/api/resenas/{resena_id}/restaurar",
        f"/api/resenas/{ID}/restaurar",
        None,
        "CU-29",
        True,
        {"403", "404", "409"},
    ),
    (
        "delete",
        "/api/resenas/{resena_id}",
        f"/api/resenas/{ID}",
        None,
        "CU-29",
        True,
        {"403", "404", "409"},
    ),
]
RUTAS_CONTRATO = [(m, r, cu, e) for m, r, _, _, cu, _, e in OPERACIONES]
OPERACIONES_HTTP = [(m, c, cuerpo) for m, _, c, cuerpo, _, _, _ in OPERACIONES]
RUTAS_DE_CONSULTA = [(m, r) for m, r, _, _, _, esc, _ in OPERACIONES if not esc]
RUTAS_DE_ESCRITURA = [(m, r) for m, r, _, _, _, esc, _ in OPERACIONES if esc]
RUTAS_DE_MODERACION = [
    ("post", "/api/resenas/{resena_id}/ocultar"),
    ("post", "/api/resenas/{resena_id}/restaurar"),
    ("delete", "/api/resenas/{resena_id}"),
]
ROLES_DE_ESCRITURA = ["admin", "dueno", "empleado"]
ROLES_DE_MODERACION = ["admin", "dueno"]


def _roles_de(metodo: str, ruta: str, escritura: bool) -> list[str]:
    if (metodo, ruta) in RUTAS_DE_MODERACION:
        return ROLES_DE_MODERACION
    return ROLES_DE_ESCRITURA if escritura else ROLES


CASOS_ROL = [
    (m, c, cuerpo, rol, rol in _roles_de(m, r, esc))
    for m, r, c, cuerpo, _, esc, _ in OPERACIONES
    for rol in ROLES
]


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


def _linea_de_roles(contrato: dict[str, Any], metodo: str, ruta: str) -> str:
    descripcion = contrato["paths"][ruta][metodo]["description"]
    return next(ln for ln in descripcion.splitlines() if "Roles" in ln)


@pytest.mark.parametrize(("metodo", "ruta", "cu", "errores"), RUTAS_CONTRATO)
async def test_cu16_contrato_publica_las_once_rutas(
    contrato: dict[str, Any], metodo: str, ruta: str, cu: str, errores: set[str]
) -> None:
    assert metodo in contrato["paths"][ruta]
    operacion = contrato["paths"][ruta][metodo]
    assert "hoteles" in operacion["tags"]
    assert operacion["security"], "la operación exige token Bearer"
    assert "401" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["401"]["content"]
    assert errores <= set(operacion["responses"])


def test_cu16_son_exactamente_once_rutas() -> None:
    assert len(RUTAS_CONTRATO) == 11
    assert len({(m, r) for m, r, _, _ in RUTAS_CONTRATO}) == 11


@pytest.mark.parametrize(("metodo", "ruta", "cu", "errores"), RUTAS_CONTRATO)
async def test_cu16_contrato_declara_el_caso_de_uso_de_cada_ruta(
    contrato: dict[str, Any], metodo: str, ruta: str, cu: str, errores: set[str]
) -> None:
    assert cu in contrato["paths"][ruta][metodo]["description"]


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_DE_ESCRITURA)
async def test_cu17_escrituras_no_admiten_al_freelance(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    """El freelance solo consulta (DEC-0008): la línea de roles no lo lista."""
    linea = _linea_de_roles(contrato, metodo, ruta)

    assert "admin" in linea
    assert "freelance" not in linea


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_DE_CONSULTA)
async def test_cu18_consultas_admiten_a_los_cuatro_roles(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    linea = _linea_de_roles(contrato, metodo, ruta)

    for rol in ROLES:
        assert rol in linea


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_DE_MODERACION)
async def test_cu29_moderar_resenas_es_solo_de_admin_y_dueno(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    linea = _linea_de_roles(contrato, metodo, ruta)

    assert "admin" in linea
    assert "dueno" in linea
    assert "empleado" not in linea
    assert "freelance" not in linea


async def test_rf105_editar_resena_tiene_los_mismos_roles_que_el_alta(
    contrato: dict[str, Any],
) -> None:
    editar = _linea_de_roles(contrato, "patch", "/api/resenas/{resena_id}")
    alta = _linea_de_roles(contrato, "post", "/api/hoteles/{hotel_id}/resenas")

    assert editar == alta
    assert "empleado" in editar


async def test_cu18_listar_hoteles_publica_filtros_y_paginacion(contrato: dict[str, Any]) -> None:
    operacion = contrato["paths"]["/api/hoteles"]["get"]
    nombres = {p.get("name") or p["$ref"].rsplit("/", 1)[-1] for p in operacion["parameters"]}

    assert {
        "pagina",
        "por_pagina",
        "destino_id",
        "categoria",
        "precio_max",
        "servicio",
        "orden",
        "estado",
    } <= nombres
    esquema = _respuesta(contrato, "get", "/api/hoteles", "200")
    assert _ref(esquema["properties"]["items"]["items"]) == "Hotel"
    assert {"items", "total", "pagina", "por_pagina"} <= set(esquema["required"])


async def test_cu18_orden_y_estado_tienen_valores_acotados(contrato: dict[str, Any]) -> None:
    parametros = {
        p["name"]: p for p in contrato["paths"]["/api/hoteles"]["get"]["parameters"] if "name" in p
    }

    assert _enum(contrato, parametros["orden"]["schema"]) == {"nombre", "valoracion", "precio"}
    assert _enum(contrato, parametros["estado"]["schema"]) == {"activo", "cerrado"}


async def test_cu18_listar_resenas_devuelve_pagina_de_resena(contrato: dict[str, Any]) -> None:
    esquema = _respuesta(contrato, "get", "/api/hoteles/{hotel_id}/resenas", "200")

    assert _ref(esquema["properties"]["items"]["items"]) == "Resena"
    assert {"items", "total", "pagina", "por_pagina"} <= set(esquema["required"])


async def test_cu16_hotel_publica_sus_atributos_y_estado(contrato: dict[str, Any]) -> None:
    propiedades, requeridos = _componer(contrato, "Hotel")

    assert {
        "id",
        "nombre",
        "destino_id",
        "categoria",
        "precio_referencia",
        "servicios",
        "estado",
    } <= set(propiedades)
    assert {"id", "nombre", "destino_id", "estado"} <= requeridos
    assert _enum(contrato, propiedades["estado"]) == {"activo", "cerrado"}
    assert propiedades["estado"]["readOnly"] is True


async def test_cu16_precio_de_referencia_viaja_como_texto_decimal(
    contrato: dict[str, Any],
) -> None:
    """DEC-0007: ningún importe viaja como número."""
    propiedades, _ = _componer(contrato, "Hotel")

    assert _es_texto_decimal(contrato, propiedades["precio_referencia"])


async def test_cu16_alta_de_hotel_exige_nombre_y_destino(contrato: dict[str, Any]) -> None:
    ruta = "/api/hoteles"
    esquema = _cuerpo(contrato, "post", ruta)

    assert {"nombre", "destino_id"} <= set(esquema["required"])
    assert {"categoria", "precio_referencia", "servicios"} <= set(esquema["properties"])
    assert "estado" not in esquema["properties"]
    assert _es_texto_decimal(contrato, esquema["properties"]["precio_referencia"])
    assert _ref(_respuesta(contrato, "post", ruta, "201")) == "Hotel"


async def test_cu16_consultar_editar_y_dar_de_baja_devuelven_el_hotel(
    contrato: dict[str, Any],
) -> None:
    assert _ref(_respuesta(contrato, "get", "/api/hoteles/{hotel_id}", "200")) == "Hotel"
    assert _ref(_respuesta(contrato, "patch", "/api/hoteles/{hotel_id}", "200")) == "Hotel"
    assert _ref(_respuesta(contrato, "post", "/api/hoteles/{hotel_id}/baja", "200")) == "Hotel"


async def test_cu16_la_baja_de_hotel_es_logica_y_no_hay_delete(contrato: dict[str, Any]) -> None:
    """Un Hotel nunca se elimina físicamente: solo pasa a `cerrado`."""
    assert "delete" not in contrato["paths"]["/api/hoteles/{hotel_id}"]


async def test_cu17_resena_publica_sus_atributos_y_estados(contrato: dict[str, Any]) -> None:
    propiedades, requeridos = _componer(contrato, "Resena")

    assert {
        "id",
        "hotel_id",
        "cliente_id",
        "viaje_id",
        "puntaje",
        "comentario",
        "fecha",
        "estado",
        "motivo_baja",
    } <= set(propiedades)
    assert {"id", "hotel_id", "cliente_id", "puntaje", "fecha", "estado"} <= requeridos
    assert "viaje_id" not in requeridos
    assert _enum(contrato, propiedades["estado"]) == {"publicada", "oculta"}
    for campo in ("estado", "motivo_baja"):
        assert propiedades[campo]["readOnly"] is True


async def test_cu17_puntaje_es_entero_de_uno_a_cinco(contrato: dict[str, Any]) -> None:
    propiedades, _ = _componer(contrato, "Resena")

    assert propiedades["puntaje"]["type"] == "integer"
    assert propiedades["puntaje"]["minimum"] == 1
    assert propiedades["puntaje"]["maximum"] == 5


async def test_cu17_alta_de_resena_exige_cliente_puntaje_y_fecha(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/hoteles/{hotel_id}/resenas"
    esquema = _cuerpo(contrato, "post", ruta)

    assert {"cliente_id", "puntaje", "fecha"} <= set(esquema["required"])
    assert {"comentario", "viaje_id"} <= set(esquema["properties"])
    assert "viaje_id" not in esquema["required"]
    assert _ref(_respuesta(contrato, "post", ruta, "201")) == "Resena"


async def test_rf105_editar_resena_publica_puntaje_comentario_y_fecha(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/resenas/{resena_id}"
    esquema = _cuerpo(contrato, "patch", ruta)

    assert {"puntaje", "comentario", "fecha"} <= set(esquema["properties"])
    assert not set(esquema.get("required", []))
    assert "hotel_id" not in esquema["properties"]
    assert "cliente_id" not in esquema["properties"]
    assert esquema["properties"]["puntaje"]["minimum"] == 1
    assert esquema["properties"]["puntaje"]["maximum"] == 5
    assert _ref(_respuesta(contrato, "patch", ruta, "200")) == "Resena"


@pytest.mark.parametrize("accion", ["ocultar", "restaurar"])
async def test_cu29_ocultar_y_restaurar_devuelven_la_resena(
    contrato: dict[str, Any], accion: str
) -> None:
    ruta = f"/api/resenas/{{resena_id}}/{accion}"

    assert _ref(_respuesta(contrato, "post", ruta, "200")) == "Resena"


async def test_cu29_ocultar_acepta_un_motivo_de_baja(contrato: dict[str, Any]) -> None:
    esquema = _cuerpo(contrato, "post", "/api/resenas/{resena_id}/ocultar")

    assert "motivo_baja" in esquema["properties"]


async def test_cu29_eliminar_resena_responde_204_y_409_problem_json(
    contrato: dict[str, Any],
) -> None:
    respuestas = contrato["paths"]["/api/resenas/{resena_id}"]["delete"]["responses"]

    assert "204" in respuestas
    assert PROBLEM_JSON in respuestas["409"]["content"]


async def test_cu16_hotel_y_resena_publican_la_auditoria_de_solo_lectura(
    contrato: dict[str, Any],
) -> None:
    for nombre in ("Hotel", "Resena"):
        propiedades, _ = _componer(contrato, nombre)
        for campo in ("created_by", "updated_by", "created_at", "updated_at"):
            assert propiedades[campo]["readOnly"] is True


@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), OPERACIONES_HTTP)
async def test_cu16_sin_token_responde_401_problem_json(
    cliente_sin_sesion: AsyncClient, metodo: str, ruta: str, cuerpo: Any
) -> None:
    r = await cliente_sin_sesion.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    ("metodo", "ruta", "cuerpo", "rol"),
    [(m, r, c, rol) for m, r, c, rol, permitido in CASOS_ROL if not permitido],
)
async def test_cu16_rol_fuera_del_contrato_responde_403_problem_json(
    cliente_como: FabricaCliente, metodo: str, ruta: str, cuerpo: Any, rol: str
) -> None:
    c = await cliente_como(rol)

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 403


# Rutas ya implementadas: salen de los 501. T-076 (hoteles) lo cubre test_hoteles.py y T-078
# (registrar y editar reseñas) lo cubre test_resenas.py.
IMPLEMENTADAS = {
    ("post", "/api/hoteles"),
    ("get", f"/api/hoteles/{ID}"),
    ("patch", f"/api/hoteles/{ID}"),
    ("post", f"/api/hoteles/{ID}/baja"),
    ("post", f"/api/hoteles/{ID}/resenas"),
    ("patch", f"/api/resenas/{ID}"),
}


@pytest.mark.parametrize(
    ("metodo", "ruta", "cuerpo", "rol"),
    [
        (m, r, c, rol)
        for m, r, c, rol, permitido in CASOS_ROL
        if permitido and (m, r) not in IMPLEMENTADAS
    ],
)
async def test_cu16_rol_del_contrato_responde_501_problem_json(
    cliente_como: FabricaCliente, metodo: str, ruta: str, cuerpo: Any, rol: str
) -> None:
    c = await cliente_como(rol)

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 501
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 501


async def test_cu16_los_roles_de_escritura_salen_de_x_roles(contrato: dict[str, Any]) -> None:
    for metodo, ruta, _, _, _, escritura, _ in OPERACIONES:
        publicados = contrato["paths"][ruta][metodo]["x-roles"]
        assert publicados == _roles_de(metodo, ruta, escritura)


@pytest.mark.parametrize(
    ("metodo", "ruta"), [("post", "/api/hoteles"), ("patch", "/api/hoteles/{hotel_id}")]
)
async def test_cu16_a2_el_409_por_duplicado_trae_el_hotel_existente(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    """CU-16 A2 / RF-099: se ofrece abrir el existente; no hay forma de guardarlo igual."""
    respuesta = contrato["paths"][ruta][metodo]["responses"]["409"]
    problema = respuesta["content"][PROBLEM_JSON]["schema"]
    esquema = contrato["components"]["schemas"][_nombre(problema["$ref"])]
    propiedades, requeridos = _componer(contrato, _nombre(problema["$ref"]))
    existente = _resolver(contrato, propiedades["existente"])

    assert _nombre(problema["$ref"]) == "ProblemaHotelDuplicado"
    assert "existente" in requeridos
    assert {"id", "nombre"} <= set(existente["properties"])
    assert "confirmar_duplicado" not in _cuerpo(contrato, metodo, ruta)["properties"]
    assert esquema


async def test_cu29_las_resenas_ocultas_solo_las_ven_admin_y_dueno(
    contrato: dict[str, Any],
) -> None:
    operacion = contrato["paths"]["/api/hoteles/{hotel_id}/resenas"]["get"]
    parametros = {p["name"]: p for p in operacion["parameters"] if "name" in p}

    assert "403" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["403"]["content"]
    assert _enum(contrato, parametros["estado"]["schema"]) == {"publicada", "oculta"}
    assert "admin y dueño" in operacion["description"]


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("post", "/api/hoteles/{hotel_id}/baja"),
        ("post", "/api/resenas/{resena_id}/ocultar"),
        ("post", "/api/resenas/{resena_id}/restaurar"),
        ("patch", "/api/resenas/{resena_id}"),
    ],
)
async def test_cu29_los_conflictos_de_estado_se_declaran_como_409_problem_json(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    respuestas = contrato["paths"][ruta][metodo]["responses"]

    assert PROBLEM_JSON in respuestas["409"]["content"]


async def test_cu18_puntaje_promedio_es_texto_decimal_de_uno_a_cinco(
    contrato: dict[str, Any],
) -> None:
    propiedades, _ = _componer(contrato, "Hotel")
    promedio = propiedades["puntaje_promedio"]

    assert propiedades["puntaje_promedio"]["readOnly"] is True
    assert _es_texto_decimal(contrato, promedio)
    patron = next(o["pattern"] for o in promedio["anyOf"] if o.get("type") == "string")
    for valido in ("1", "3.5", "4.67", "5", "5.00"):
        assert re.fullmatch(patron, valido), valido
    for invalido in ("0", "0.99", "5.01", "6", "4.675"):
        assert not re.fullmatch(patron, invalido), invalido


@pytest.mark.parametrize(
    ("metodo", "ruta", "cuerpo"),
    [
        ("post", "/api/hoteles", {}),
        ("post", "/api/hoteles", {**HOTEL, "precio_referencia": "caro"}),
        ("post", "/api/hoteles", {**HOTEL, "destino_id": "no-es-uuid"}),
        ("patch", f"/api/hoteles/{ID}", {"precio_referencia": "caro"}),
        ("post", f"/api/hoteles/{ID}/resenas", {}),
        ("post", f"/api/hoteles/{ID}/resenas", {**RESENA, "puntaje": 6}),
        ("post", f"/api/hoteles/{ID}/resenas", {**RESENA, "puntaje": 0}),
        ("post", f"/api/hoteles/{ID}/resenas", {**RESENA, "fecha": "ayer"}),
        ("post", f"/api/hoteles/{ID}/resenas", {**RESENA, "cliente_id": "no-es-uuid"}),
        ("patch", f"/api/resenas/{ID}", {"puntaje": 6}),
        ("patch", f"/api/resenas/{ID}", {"puntaje": 0}),
        ("patch", f"/api/resenas/{ID}", {"fecha": "ayer"}),
    ],
)
async def test_cu17_cuerpo_invalido_responde_422(
    cliente_como: FabricaCliente, metodo: str, ruta: str, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    "params",
    [
        {"por_pagina": 101},
        {"pagina": 0},
        {"estado": "demolido"},
        {"orden": "azar"},
        {"destino_id": "no-es-uuid"},
        {"precio_max": "barato"},
    ],
)
async def test_cu18_listar_hoteles_con_filtros_invalidos_responde_422(
    cliente_como: FabricaCliente, params: dict[str, Any]
) -> None:
    c = await cliente_como("freelance")

    r = await c.get("/api/hoteles", params=params)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("params", [{"por_pagina": 101}, {"pagina": 0}])
async def test_cu18_listar_resenas_con_paginacion_invalida_responde_422(
    cliente_como: FabricaCliente, params: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.get(f"/api/hoteles/{ID}/resenas", params=params)

    assert r.status_code == 422


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("get", "/api/hoteles/no-es-uuid"),
        ("post", "/api/hoteles/no-es-uuid/baja"),
        ("get", "/api/hoteles/no-es-uuid/resenas"),
        ("patch", "/api/resenas/no-es-uuid"),
        ("post", "/api/resenas/no-es-uuid/restaurar"),
        ("delete", "/api/resenas/no-es-uuid"),
    ],
)
async def test_cu16_id_que_no_es_uuid_responde_422(
    cliente_como: FabricaCliente, metodo: str, ruta: str
) -> None:
    c = await cliente_como("admin")

    r = await c.request(metodo, ruta, json={"puntaje": 3} if metodo == "patch" else None)

    assert r.status_code == 422
