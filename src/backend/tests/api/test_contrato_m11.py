"""T-174: ajustes del contrato de cotizaciones y reserva (DEC-0028; CU-05 a CU-11).

Un ítem de cotización con hotel, «ganar» eligiendo cotización, advertencias del itinerario al
confirmar la reserva y plan de pagos de la reserva con solo el primer pago.
"""

import re
from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient

ID = "0b8f7a52-4c1e-4f0a-9a57-1d2f6c3b7a01"
RUTA_GANAR = "/api/oportunidades/{oportunidad_id}/ganar"
RUTA_RESERVA = "/api/oportunidades/{oportunidad_id}/confirmar-reserva"
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


def _componer_esquema(
    contrato: dict[str, Any], esquema: dict[str, Any]
) -> tuple[dict[str, Any], set[str]]:
    """Junta propiedades y requeridos de un esquema (allOf con Auditoria)."""
    propiedades: dict[str, Any] = {}
    requeridos: set[str] = set()
    for parte in esquema.get("allOf", [esquema]):
        parte = _resolver(contrato, parte)
        propiedades |= parte.get("properties", {})
        requeridos |= set(parte.get("required", []))
    return propiedades, requeridos


def _componer(contrato: dict[str, Any], nombre: str) -> tuple[dict[str, Any], set[str]]:
    return _componer_esquema(contrato, contrato["components"]["schemas"][nombre])


def _opciones(contrato: dict[str, Any], propiedad: dict[str, Any]) -> list[dict[str, Any]]:
    opciones = propiedad.get("anyOf") or propiedad.get("oneOf") or [propiedad]
    return [_resolver(contrato, o) for o in opciones]


def _acepta_null(contrato: dict[str, Any], propiedad: dict[str, Any]) -> bool:
    return any(o.get("type") == "null" for o in _opciones(contrato, propiedad))


def _formato(contrato: dict[str, Any], propiedad: dict[str, Any]) -> set[str]:
    return {o["format"] for o in _opciones(contrato, propiedad) if "format" in o}


def _item_cotizacion(contrato: dict[str, Any]) -> dict[str, Any]:
    return contrato["components"]["schemas"]["ItemCotizacion"]


def _cuerpo_ganar(contrato: dict[str, Any]) -> dict[str, Any]:
    operacion = contrato["paths"]["/api/oportunidades/{oportunidad_id}/ganar"]["post"]
    assert "requestBody" in operacion, "ganar debe declarar un cuerpo opcional"
    return operacion["requestBody"]


# ---------- ItemCotizacion con hotel (DEC-0028 punto 4.1) ----------


async def test_cu06_item_de_cotizacion_publica_hotel_y_fechas_como_opcionales(
    contrato: dict[str, Any],
) -> None:
    item = _item_cotizacion(contrato)
    propiedades = item["properties"]

    assert {"concepto", "precio", "hotel_id", "check_in", "check_out"} <= set(propiedades)
    assert "uuid" in _formato(contrato, propiedades["hotel_id"])
    assert "date" in _formato(contrato, propiedades["check_in"])
    assert "date" in _formato(contrato, propiedades["check_out"])
    # opcionales: no figuran entre los requeridos
    assert not {"hotel_id", "check_in", "check_out"} & set(item["required"])
    for campo in ("hotel_id", "check_in", "check_out"):
        assert _acepta_null(contrato, propiedades[campo]), f"{campo} admite null"


async def test_cu06_item_sin_hotel_sigue_pidiendo_solo_concepto_y_precio(
    contrato: dict[str, Any],
) -> None:
    assert set(_item_cotizacion(contrato)["required"]) == {"concepto", "precio"}


async def test_cu06_crear_cotizacion_acepta_items_con_hotel_y_fechas(
    cliente_como: FabricaCliente,
) -> None:
    """Un ítem con hotel no se rechaza por tener campos desconocidos: si la oportunidad no
    existe responde 404, no 422."""
    c = await cliente_como("admin")
    cuerpo = {
        "moneda": "ARS",
        "items": [
            {
                "concepto": "Alojamiento",
                "precio": "500000.00",
                "hotel_id": ID,
                "check_in": "2027-02-10",
                "check_out": "2027-02-15",
            },
            {"concepto": "Aéreo", "precio": "850000.00"},
        ],
    }

    r = await c.post(f"/api/oportunidades/{ID}/cotizaciones", json=cuerpo)

    assert r.status_code != 422


# ---------- Ganar eligiendo cotización (DEC-0028 punto 1.3, CU-05 A4) ----------


async def test_cu05_ganar_declara_un_cuerpo_opcional_con_cotizacion_id(
    contrato: dict[str, Any],
) -> None:
    cuerpo = _cuerpo_ganar(contrato)

    assert cuerpo.get("required", False) is False, "sin cuerpo sigue siendo la venta directa"
    esquema = _resolver(contrato, cuerpo["content"]["application/json"]["schema"])
    propiedades, requeridos = _componer_esquema(contrato, esquema)
    assert "cotizacion_id" in propiedades
    assert "uuid" in _formato(contrato, propiedades["cotizacion_id"])
    assert "cotizacion_id" not in requeridos


async def test_cu05_ganar_sigue_devolviendo_la_oportunidad_y_sus_errores(
    contrato: dict[str, Any],
) -> None:
    operacion = contrato["paths"]["/api/oportunidades/{oportunidad_id}/ganar"]["post"]

    assert {"403", "404", "409", "422"} <= set(operacion["responses"])
    esquema = operacion["responses"]["200"]["content"]["application/json"]["schema"]
    assert _nombre(esquema["$ref"]) == "Oportunidad"


async def test_cu05_ganar_describe_la_eleccion_de_cotizacion_y_la_venta_directa(
    contrato: dict[str, Any],
) -> None:
    operacion = contrato["paths"]["/api/oportunidades/{oportunidad_id}/ganar"]["post"]
    texto = f"{operacion.get('summary', '')} {operacion.get('description', '')}".lower()

    assert "cotizacion_id" in texto or "cotización elegida" in texto
    assert "venta directa" in texto or "sin cuerpo" in texto


async def test_cu05_ganar_con_cotizacion_id_que_no_es_uuid_responde_422(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("empleado")

    r = await c.post(f"/api/oportunidades/{ID}/ganar", json={"cotizacion_id": "no-es-uuid"})

    assert r.status_code == 422


async def test_cu05_ganar_con_cotizacion_id_inexistente_responde_404(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("admin")

    r = await c.post(f"/api/oportunidades/{ID}/ganar", json={"cotizacion_id": ID})

    assert r.status_code == 404


async def test_cu05_ganar_sin_cuerpo_sigue_siendo_valido(cliente_como: FabricaCliente) -> None:
    """Venta directa (A4): sin cuerpo no es un 422; la oportunidad inexistente da 404."""
    c = await cliente_como("admin")

    r = await c.post(f"/api/oportunidades/{ID}/ganar")

    assert r.status_code == 404


# ---------- Advertencias del itinerario al confirmar la reserva (DEC-0028 punto 4.3) ----------


def _respuesta_reserva(contrato: dict[str, Any]) -> tuple[dict[str, Any], set[str]]:
    esquema = contrato["paths"][RUTA_RESERVA]["post"]["responses"]["201"]["content"][
        "application/json"
    ]["schema"]
    return _componer_esquema(contrato, _resolver(contrato, esquema))


async def test_cu07_reserva_responde_con_las_advertencias_del_itinerario(
    contrato: dict[str, Any],
) -> None:
    propiedades, requeridos = _respuesta_reserva(contrato)

    assert "advertencias_itinerario" in propiedades
    assert "advertencias_itinerario" in requeridos, "vacía si no hay nada que advertir"
    assert propiedades["advertencias_itinerario"]["type"] == "array"
    assert propiedades["advertencias_itinerario"].get("readOnly") is True


async def test_cu07_reserva_sigue_devolviendo_los_campos_del_viaje(
    contrato: dict[str, Any],
) -> None:
    propiedades, requeridos = _respuesta_reserva(contrato)

    assert {"id", "estado", "precio_venta", "saldo_pendiente", "porcentaje_pagado"} <= set(
        propiedades
    )
    assert {"id", "estado", "precio_venta"} <= requeridos


async def test_cu07_advertencia_del_itinerario_dice_el_hotel_y_el_motivo(
    contrato: dict[str, Any],
) -> None:
    propiedades, _ = _respuesta_reserva(contrato)
    item = _resolver(contrato, propiedades["advertencias_itinerario"]["items"])

    assert {"hotel_id", "motivo"} <= set(item["required"])
    assert "uuid" in _formato(contrato, item["properties"]["hotel_id"])
    motivo = _resolver(contrato, item["properties"]["motivo"])
    assert len(set(motivo["enum"])) == 3, (
        "fuera de las fechas del viaje, superpuesto con otro tramo y hotel cerrado"
    )


# ---------- Plan de pagos de la reserva: alcanza el primer pago (DEC-0028 punto 3) ----------


async def test_cu11_plan_de_pagos_de_la_reserva_dice_que_alcanza_con_el_primer_pago(
    contrato: dict[str, Any],
) -> None:
    cuerpo = _resolver(
        contrato,
        contrato["paths"][RUTA_RESERVA]["post"]["requestBody"]["content"]["application/json"][
            "schema"
        ],
    )
    propiedad = cuerpo["properties"]["plan_de_pagos"]
    descripcion = propiedad.get("description", "").lower()

    assert "plan_de_pagos" in cuerpo["required"]
    assert "primer pago" in descripcion
    assert re.search(r"al menos (uno|un pago)", descripcion)
    assert "no supera" in descripcion or "no puede superar" in descripcion
    assert "precio de venta" in descripcion


async def test_cu11_plan_de_pagos_del_editor_no_cambia_de_descripcion(
    contrato: dict[str, Any],
) -> None:
    """La excepción es solo de la reserva: el editor del viaje sigue exigiendo sumar el precio
    (CU-11 A1), así que su esquema no habla de «primer pago»."""
    operacion = contrato["paths"]["/api/viajes/{viaje_id}/pagos"]["put"]
    esquema = _resolver(contrato, operacion["requestBody"]["content"]["application/json"]["schema"])

    assert "primer pago" not in esquema.get("description", "").lower()
