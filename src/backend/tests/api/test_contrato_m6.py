"""T-086: contrato de viajes y economía (CU-07 a CU-12, CU-27).

Rutas, esquemas, token, roles y 501.
"""

import re
from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient

PROBLEM_JSON = "application/problem+json"
TRAMO = {
    "hotel_id": "3f6c9b1e-2a47-4d58-8e10-5b7a9c0d1e22",
    "check_in": "2027-02-10",
    "check_out": "2027-02-15",
    "orden": 1,
    "vencimiento_pago_proveedor": "2027-01-20",
}
ID = "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01"
ROLES = ["admin", "dueno", "empleado", "freelance"]
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]

PLAN = {
    "pagos": [
        {"monto": "400000.00", "tipo": "sena", "vencimiento": "2026-12-01"},
        {"monto": "600000.00", "tipo": "saldo", "vencimiento": "2027-01-15"},
    ]
}
CONFIRMAR = {
    "destino_id": ID,
    "fecha_salida": "2027-02-10",
    "fecha_regreso": "2027-02-20",
    "categoria": "individual",
    "economia": {"precio_venta": "1000000.00", "costo": "800000.00"},
    "plan_de_pagos": PLAN,
}
ECONOMIA = {
    "precio_venta": "1000000.00",
    "costo": "800000.00",
    "comision_tipo": "porcentaje",
    "comision_vendedor": "10.00",
}
CANCELACION = {"motivo_cancelacion": "El cliente desistió", "fecha_cancelacion": "2026-11-05"}
COBRO = {
    "fecha_cobro": "2026-12-01",
    "forma_pago": "transferencia",
    "moneda_pago": "USD",
    "tipo_cambio": "1200.0000",
}
DIVIDIR = {"monto_ahora": "100000.00", "vencimiento_resto": "2027-01-20"}

# (método, ruta del contrato, ruta concreta, cuerpo, tag, errores obligatorios)
OPERACIONES: list[tuple[str, str, str, Any, str, set[str]]] = [
    (
        "post",
        "/api/oportunidades/{oportunidad_id}/confirmar-reserva",
        f"/api/oportunidades/{ID}/confirmar-reserva",
        CONFIRMAR,
        "viajes",
        {"403", "404", "409", "422"},
    ),
    ("get", "/api/viajes", "/api/viajes", None, "viajes", {"422"}),
    ("get", "/api/viajes/{viaje_id}", f"/api/viajes/{ID}", None, "viajes", {"404"}),
    (
        "post",
        "/api/viajes/{viaje_id}/iniciar",
        f"/api/viajes/{ID}/iniciar",
        None,
        "viajes",
        {"403", "404", "409"},
    ),
    (
        "post",
        "/api/viajes/{viaje_id}/finalizar",
        f"/api/viajes/{ID}/finalizar",
        None,
        "viajes",
        {"403", "404", "409"},
    ),
    (
        "post",
        "/api/viajes/{viaje_id}/corregir-estado",
        f"/api/viajes/{ID}/corregir-estado",
        None,
        "viajes",
        {"403", "404", "409"},
    ),
    (
        "post",
        "/api/viajes/{viaje_id}/cancelar",
        f"/api/viajes/{ID}/cancelar",
        CANCELACION,
        "viajes",
        {"403", "404", "409", "422"},
    ),
    (
        "post",
        "/api/viajes/{viaje_id}/revertir-cancelacion",
        f"/api/viajes/{ID}/revertir-cancelacion",
        None,
        "viajes",
        {"403", "404", "409"},
    ),
    (
        "get",
        "/api/viajes/{viaje_id}/itinerario",
        f"/api/viajes/{ID}/itinerario",
        None,
        "viajes",
        {"404"},
    ),
    (
        "post",
        "/api/viajes/{viaje_id}/itinerario",
        f"/api/viajes/{ID}/itinerario",
        TRAMO,
        "viajes",
        {"403", "404", "409", "422"},
    ),
    (
        "patch",
        "/api/tramos/{tramo_id}",
        f"/api/tramos/{ID}",
        TRAMO,
        "viajes",
        {"403", "404", "409", "422"},
    ),
    ("delete", "/api/tramos/{tramo_id}", f"/api/tramos/{ID}", None, "viajes", {"403", "404"}),
    (
        "put",
        "/api/viajes/{viaje_id}/economia",
        f"/api/viajes/{ID}/economia",
        ECONOMIA,
        "economia",
        {"403", "404", "409", "422"},
    ),
    (
        "get",
        "/api/viajes/{viaje_id}/pagos",
        f"/api/viajes/{ID}/pagos",
        None,
        "economia",
        {"404"},
    ),
    (
        "put",
        "/api/viajes/{viaje_id}/pagos",
        f"/api/viajes/{ID}/pagos",
        PLAN,
        "economia",
        {"403", "404", "422"},
    ),
    (
        "patch",
        "/api/pagos/{pago_id}",
        f"/api/pagos/{ID}",
        {"vencimiento": "2027-01-20"},
        "economia",
        {"403", "404", "409", "422"},
    ),
    (
        "post",
        "/api/pagos/{pago_id}/anular",
        f"/api/pagos/{ID}/anular",
        None,
        "economia",
        {"403", "404", "409"},
    ),
    (
        "post",
        "/api/pagos/{pago_id}/dividir",
        f"/api/pagos/{ID}/dividir",
        DIVIDIR,
        "economia",
        {"403", "404", "409", "422"},
    ),
    (
        "post",
        "/api/pagos/{pago_id}/cobrar",
        f"/api/pagos/{ID}/cobrar",
        COBRO,
        "economia",
        {"403", "404", "409", "422"},
    ),
    (
        "post",
        "/api/pagos/{pago_id}/revertir-cobro",
        f"/api/pagos/{ID}/revertir-cobro",
        None,
        "economia",
        {"403", "404", "409"},
    ),
]
RUTAS_CONTRATO = [(m, r, tag, errores) for m, r, _, _, tag, errores in OPERACIONES]
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


@pytest.mark.parametrize(("metodo", "ruta", "tag", "errores"), RUTAS_CONTRATO)
async def test_cu07_contrato_publica_las_veinte_rutas(
    contrato: dict[str, Any], metodo: str, ruta: str, tag: str, errores: set[str]
) -> None:
    assert metodo in contrato["paths"][ruta]
    operacion = contrato["paths"][ruta][metodo]
    assert tag in operacion["tags"]
    assert operacion["security"], "la operación exige token Bearer"
    assert "401" in operacion["responses"]
    assert PROBLEM_JSON in operacion["responses"]["401"]["content"]
    assert errores <= set(operacion["responses"])


def test_cu07_son_exactamente_veinte_rutas() -> None:
    assert len(RUTAS_CONTRATO) == 20
    assert len({(m, r) for m, r, _, _ in RUTAS_CONTRATO}) == 20


@pytest.mark.parametrize(("metodo", "ruta", "tag", "errores"), RUTAS_CONTRATO)
async def test_cu09_contrato_declara_los_roles_y_los_casos_de_uso(
    contrato: dict[str, Any], metodo: str, ruta: str, tag: str, errores: set[str]
) -> None:
    descripcion = contrato["paths"][ruta][metodo]["description"]

    for rol in ROLES:
        assert rol in descripcion
    assert "CU-" in descripcion


@pytest.mark.parametrize(("metodo", "ruta"), RUTAS_CON_409)
async def test_cu09_409_por_estado_se_publica_como_problem_json(
    contrato: dict[str, Any], metodo: str, ruta: str
) -> None:
    respuestas = contrato["paths"][ruta][metodo]["responses"]

    assert PROBLEM_JSON in respuestas["409"]["content"]


async def test_cu08_listar_viajes_publica_filtros_y_paginacion(contrato: dict[str, Any]) -> None:
    operacion = contrato["paths"]["/api/viajes"]["get"]
    nombres = {p["name"] for p in operacion["parameters"]}

    assert {"pagina", "por_pagina", "mios", "desde", "hasta", "estado", "cliente_id"} <= nombres
    esquema = _respuesta(contrato, "get", "/api/viajes", "200")
    assert _ref(esquema["properties"]["items"]["items"]) == "Viaje"
    assert {"items", "total", "pagina", "por_pagina"} <= set(esquema["required"])


async def test_cu08_viaje_tiene_los_seis_estados_y_dos_categorias(
    contrato: dict[str, Any],
) -> None:
    propiedades, _ = _componer(contrato, "Viaje")

    assert _enum(contrato, propiedades["estado"]) == {
        "reservado",
        "vendido",
        "confirmado",
        "en_curso",
        "finalizado",
        "cancelado",
    }
    assert _enum(contrato, propiedades["categoria"]) == {"grupal", "individual"}


async def test_cu10_ficha_del_viaje_con_ganancia_margen_comision_y_saldo(
    contrato: dict[str, Any],
) -> None:
    propiedades, requeridos = _componer(contrato, "Viaje")

    assert {
        "id",
        "cliente_id",
        "oportunidad_id",
        "destino_id",
        "operador_id",
        "responsable_id",
        "vendedor_id",
        "fecha_salida",
        "fecha_regreso",
        "categoria",
        "estado",
        "estado_previo",
        "motivo_cancelacion",
        "fecha_cancelacion",
        "moneda",
        "precio_venta",
        "costo",
        "ganancia",
        "margen",
        "comision_tipo",
        "comision_vendedor",
        "saldo_pendiente",
        "porcentaje_pagado",
    } <= set(propiedades)
    assert {
        "id",
        "estado",
        "moneda",
        "precio_venta",
        "costo",
        "ganancia",
        "comision_tipo",
        "comision_vendedor",
        "saldo_pendiente",
        "porcentaje_pagado",
    } <= requeridos


@pytest.mark.parametrize(
    "campo",
    [
        "precio_venta",
        "costo",
        "ganancia",
        "margen",
        "comision_vendedor",
        "saldo_pendiente",
        "porcentaje_pagado",
    ],
)
async def test_cu10_importes_del_viaje_son_texto_decimal(
    contrato: dict[str, Any], campo: str
) -> None:
    """DEC-0007: ningún importe viaja como número (evita errores de punto flotante)."""
    propiedades, _ = _componer(contrato, "Viaje")

    assert _es_texto_decimal(contrato, propiedades[campo])


@pytest.mark.parametrize(
    "campo", ["ganancia", "margen", "saldo_pendiente", "porcentaje_pagado", "estado", "moneda"]
)
async def test_cu10_campos_calculados_y_de_estado_del_viaje_son_de_solo_lectura(
    contrato: dict[str, Any], campo: str
) -> None:
    propiedades, _ = _componer(contrato, "Viaje")

    assert propiedades[campo]["readOnly"] is True


async def test_cu12_porcentaje_pagado_es_una_fraccion_de_cuatro_decimales(
    contrato: dict[str, Any],
) -> None:
    propiedades, _ = _componer(contrato, "Viaje")

    patron = propiedades["porcentaje_pagado"]["pattern"]
    assert re.fullmatch(patron, "0.3333")
    assert re.fullmatch(patron, "1.0000")
    assert not re.fullmatch(patron, "1.5")


async def test_cu10_viaje_tiene_moneda_ars_o_usd(contrato: dict[str, Any]) -> None:
    """DEC-0013: la moneda del viaje se fija al confirmar la reserva."""
    propiedades, _ = _componer(contrato, "Viaje")

    assert _enum(contrato, propiedades["moneda"]) == {"ARS", "USD"}


async def test_cu10_comision_tipo_importe_o_porcentaje(contrato: dict[str, Any]) -> None:
    """DEC-0007: el porcentaje se aplica sobre la ganancia."""
    propiedades, _ = _componer(contrato, "Viaje")

    assert _enum(contrato, propiedades["comision_tipo"]) == {"importe", "porcentaje"}


async def test_cu10_economia_exige_precio_y_costo_como_texto_decimal(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/viajes/{viaje_id}/economia"
    esquema = _cuerpo(contrato, "put", ruta)

    assert {"precio_venta", "costo"} <= set(esquema["required"])
    assert {"operador_id", "vendedor_id", "comision_tipo", "comision_vendedor"} <= set(
        esquema["properties"]
    )
    for campo in ("precio_venta", "costo", "comision_vendedor"):
        assert _es_texto_decimal(contrato, esquema["properties"][campo])
    assert _ref(_respuesta(contrato, "put", ruta, "200")) == "EconomiaRegistrada"


async def test_cu10_registrar_economia_responde_con_advertencias(
    contrato: dict[str, Any],
) -> None:
    esquema = _respuesta(contrato, "put", "/api/viajes/{viaje_id}/economia", "200")
    assert _ref(esquema) == "EconomiaRegistrada"

    propiedades, requeridos = _componer(contrato, "EconomiaRegistrada")

    assert {"id", "ganancia", "margen", "advertencias"} <= set(propiedades)
    assert "advertencias" in requeridos
    items = _resolver(contrato, propiedades["advertencias"]["items"])
    assert set(items["enum"]) == {"ganancia_negativa", "margen_negativo", "plan_desbalanceado"}


async def test_cu07_confirmar_reserva_exige_destino_fechas_categoria_economia_y_plan(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/oportunidades/{oportunidad_id}/confirmar-reserva"
    esquema = _cuerpo(contrato, "post", ruta)

    assert {
        "destino_id",
        "fecha_salida",
        "fecha_regreso",
        "categoria",
        "economia",
        "plan_de_pagos",
    } <= set(esquema["required"])
    assert {"responsable_id", "moneda"} <= set(esquema["properties"])
    assert _ref(_respuesta(contrato, "post", ruta, "201")) == "Viaje"


async def test_cu27_cancelar_exige_motivo_y_fecha(contrato: dict[str, Any]) -> None:
    ruta = "/api/viajes/{viaje_id}/cancelar"
    esquema = _cuerpo(contrato, "post", ruta)

    assert {"motivo_cancelacion", "fecha_cancelacion"} <= set(esquema["required"])
    assert _ref(_respuesta(contrato, "post", ruta, "200")) == "Viaje"


@pytest.mark.parametrize(
    "accion", ["iniciar", "finalizar", "corregir-estado", "revertir-cancelacion"]
)
async def test_cu09_transiciones_de_estado_devuelven_el_viaje(
    contrato: dict[str, Any], accion: str
) -> None:
    ruta = f"/api/viajes/{{viaje_id}}/{accion}"

    assert _ref(_respuesta(contrato, "post", ruta, "200")) == "Viaje"


async def test_cu11_plan_de_pagos_exige_al_menos_un_pago_con_monto_texto(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/viajes/{viaje_id}/pagos"
    plan = _cuerpo(contrato, "put", ruta)
    pagos = plan["properties"]["pagos"]
    item = _resolver(contrato, pagos["items"])

    assert "pagos" in plan["required"]
    assert pagos["minItems"] == 1
    assert {"monto", "tipo", "vencimiento"} <= set(item["required"])
    assert _es_texto_decimal(contrato, item["properties"]["monto"])
    assert _enum(contrato, item["properties"]["tipo"]) == {"sena", "cuota", "saldo"}
    assert _ref(_respuesta(contrato, "put", ruta, "200")["items"]) == "Pago"


async def test_cu11_listar_pagos_devuelve_lista_de_pago(contrato: dict[str, Any]) -> None:
    lista = _respuesta(contrato, "get", "/api/viajes/{viaje_id}/pagos", "200")

    assert lista["type"] == "array"
    assert _ref(lista["items"]) == "Pago"


async def test_cu12_pago_publica_estado_moneda_tipo_de_cambio_y_cobro(
    contrato: dict[str, Any],
) -> None:
    """DEC-0013: moneda del cobro y tipo de cambio cuando difiere de la del viaje."""
    propiedades, requeridos = _componer(contrato, "Pago")

    assert {
        "id",
        "viaje_id",
        "monto",
        "tipo",
        "vencimiento",
        "estado",
        "forma_pago",
        "moneda_pago",
        "tipo_cambio",
        "monto_cobrado",
        "fecha_cobro",
    } <= set(propiedades)
    assert {"id", "viaje_id", "monto", "tipo", "vencimiento", "estado"} <= requeridos
    for campo in ("monto", "tipo_cambio", "monto_cobrado"):
        assert _es_texto_decimal(contrato, propiedades[campo])
    assert _enum(contrato, propiedades["estado"]) == {
        "pendiente",
        "pagado",
        "vencido",
        "anulado",
    }
    assert _enum(contrato, propiedades["moneda_pago"]) == {"ARS", "USD"}
    for campo in ("monto_cobrado", "tipo_cambio", "estado", "fecha_cobro"):
        assert propiedades[campo]["readOnly"] is True


async def test_cu12_cobrar_exige_fecha_forma_y_moneda_con_tipo_de_cambio_texto(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/pagos/{pago_id}/cobrar"
    esquema = _cuerpo(contrato, "post", ruta)

    assert {"fecha_cobro", "forma_pago", "moneda_pago"} <= set(esquema["required"])
    assert "tipo_cambio" in esquema["properties"]
    assert "tipo_cambio" not in esquema["required"]
    assert _es_texto_decimal(contrato, esquema["properties"]["tipo_cambio"])
    assert _enum(contrato, esquema["properties"]["forma_pago"]) == {
        "efectivo",
        "transferencia",
        "tarjeta_credito",
        "tarjeta_debito",
        "cheque",
        "deposito",
    }
    assert _enum(contrato, esquema["properties"]["moneda_pago"]) == {"ARS", "USD"}
    assert _ref(_respuesta(contrato, "post", ruta, "200")) == "Pago"


async def test_cu12_reprogramar_exige_vencimiento(contrato: dict[str, Any]) -> None:
    esquema = _cuerpo(contrato, "patch", "/api/pagos/{pago_id}")

    assert "vencimiento" in esquema["required"]


async def test_cu12_dividir_exige_monto_ahora_texto_y_devuelve_dos_pagos(
    contrato: dict[str, Any],
) -> None:
    ruta = "/api/pagos/{pago_id}/dividir"
    esquema = _cuerpo(contrato, "post", ruta)
    lista = _respuesta(contrato, "post", ruta, "201")

    assert {"monto_ahora", "vencimiento_resto"} <= set(esquema["required"])
    assert _es_texto_decimal(contrato, esquema["properties"]["monto_ahora"])
    assert lista["minItems"] == 2
    assert lista["maxItems"] == 2
    assert _ref(lista["items"]) == "Pago"


@pytest.mark.parametrize("accion", ["anular", "revertir-cobro"])
async def test_cu12_anular_y_revertir_cobro_devuelven_el_pago(
    contrato: dict[str, Any], accion: str
) -> None:
    ruta = f"/api/pagos/{{pago_id}}/{accion}"

    assert _ref(_respuesta(contrato, "post", ruta, "200")) == "Pago"


async def test_cu09_quitar_tramo_responde_204(contrato: dict[str, Any]) -> None:
    assert "204" in contrato["paths"]["/api/tramos/{tramo_id}"]["delete"]["responses"]


async def test_cu10_viaje_y_pago_publican_la_auditoria_de_solo_lectura(
    contrato: dict[str, Any],
) -> None:
    for nombre in ("Viaje", "Pago"):
        propiedades, _ = _componer(contrato, nombre)
        for campo in ("created_by", "updated_by", "created_at", "updated_at"):
            assert propiedades[campo]["readOnly"] is True


@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), OPERACIONES_HTTP)
async def test_cu07_sin_token_responde_401_problem_json(
    cliente_sin_sesion: AsyncClient, metodo: str, ruta: str, cuerpo: Any
) -> None:
    r = await cliente_sin_sesion.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 401
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# Ya no son stubs: registrar_economia (T-090, test_economia.py) y listar y definir el plan de
# pagos (T-092, test_plan_pagos.py)
_IMPLEMENTADAS = {
    ("put", f"/api/viajes/{ID}/economia"),
    ("get", f"/api/viajes/{ID}/pagos"),
    ("put", f"/api/viajes/{ID}/pagos"),
    ("post", f"/api/pagos/{ID}/cobrar"),  # T-094, test_cobros.py
    ("get", f"/api/viajes/{ID}/itinerario"),  # T-097, test_itinerario.py
    ("post", f"/api/viajes/{ID}/itinerario"),  # T-097, test_itinerario.py
    ("patch", f"/api/tramos/{ID}"),  # T-097, test_itinerario.py
    ("delete", f"/api/tramos/{ID}"),  # T-097, test_itinerario.py
    ("post", f"/api/viajes/{ID}/iniciar"),  # T-096, test_viajes_estado.py
    ("post", f"/api/viajes/{ID}/finalizar"),  # T-096, test_viajes_estado.py
    ("post", f"/api/viajes/{ID}/corregir-estado"),  # T-096, test_viajes_estado.py
}
OPERACIONES_STUB = [op for op in OPERACIONES_HTTP if (op[0], op[1]) not in _IMPLEMENTADAS]


@pytest.mark.parametrize("rol", ROLES)
@pytest.mark.parametrize(("metodo", "ruta", "cuerpo"), OPERACIONES_STUB)
async def test_cu07_con_token_de_cualquier_rol_responde_501_problem_json(
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
        ("post", f"/api/viajes/{ID}/cancelar", {}),
        ("post", f"/api/viajes/{ID}/cancelar", {**CANCELACION, "fecha_cancelacion": "ayer"}),
        ("put", f"/api/viajes/{ID}/economia", {"precio_venta": "1000"}),
        ("put", f"/api/viajes/{ID}/economia", {**ECONOMIA, "precio_venta": "mil pesos"}),
        ("put", f"/api/viajes/{ID}/pagos", {"pagos": []}),
        ("patch", f"/api/pagos/{ID}", {}),
        ("post", f"/api/pagos/{ID}/dividir", {"monto_ahora": "100"}),
        ("post", f"/api/pagos/{ID}/cobrar", {**COBRO, "moneda_pago": "EUR"}),
        ("post", f"/api/pagos/{ID}/cobrar", {**COBRO, "forma_pago": "bitcoin"}),
        ("post", f"/api/oportunidades/{ID}/confirmar-reserva", {}),
    ],
)
async def test_cu07_cuerpo_invalido_responde_422(
    cliente_como: FabricaCliente, metodo: str, ruta: str, cuerpo: dict[str, Any]
) -> None:
    c = await cliente_como("empleado")

    r = await c.request(metodo, ruta, json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    "params",
    [{"por_pagina": 101}, {"pagina": 0}, {"estado": "archivado"}, {"cliente_id": "no-es-uuid"}],
)
async def test_cu08_listar_viajes_con_filtros_invalidos_responde_422(
    cliente_como: FabricaCliente, params: dict[str, Any]
) -> None:
    c = await cliente_como("admin")

    r = await c.get("/api/viajes", params=params)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("get", "/api/viajes/no-es-uuid"),
        ("get", "/api/viajes/no-es-uuid/pagos"),
        ("post", "/api/pagos/no-es-uuid/anular"),
    ],
)
async def test_cu09_id_que_no_es_uuid_responde_422(
    cliente_como: FabricaCliente, metodo: str, ruta: str
) -> None:
    c = await cliente_como("empleado")

    r = await c.request(metodo, ruta)

    assert r.status_code == 422
