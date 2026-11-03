"""T-111: pasos del proceso diario que vencen pagos (EST-Pago T3) y cotizaciones (EST-Cotización
T5, CU-06 A5, RF-026).

Supuestos (a confirmar en la review; el ticket no los fija al día):
- Son dos pasos registrados en `proceso_diario.PASOS`: uno con «pago» y otro con «cotizaci» en el
  nombre (en minúsculas).
- Vence cuando la fecha pasó: `vencimiento < fecha` (pago) y `validez_hasta < fecha` (cotización).
  El mismo día del borde todavía NO vence («pasó la medianoche»).
- Solo `pendiente` -> `vencido` y `enviada` -> `vencida`. Un `borrador` no vence (CU-06 A5), ni
  `aceptada`/`rechazada`, ni `pagado`/`anulado`.
- La Alerta asociada no cambia y la Oportunidad no cambia de estado.
"""

from datetime import date

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from rumbo.negocio.servicios import proceso_diario
from tests.fabricas import (
    ClienteFactory,
    CotizacionFactory,
    DestinoFactory,
    OportunidadFactory,
    PagoFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

HOY = date(2026, 11, 2)
AYER = date(2026, 11, 1)
MANANA = date(2026, 11, 3)


def _paso(clave: str) -> proceso_diario.Paso:
    pasos = [p for p in proceso_diario.PASOS if clave in p.nombre.lower()]
    assert len(pasos) == 1, f"tiene que haber un paso de «{clave}» registrado en PASOS"
    return pasos[0]


async def _correr(sesion: AsyncSession, clave: str, fecha: date = HOY) -> str | None:
    return await _paso(clave).ejecutar(sesion, fecha)


async def _viaje(sesion: AsyncSession) -> m.Viaje:
    asesor = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.empleado)
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=asesor.id)
    destino = await crear(sesion, DestinoFactory)
    return await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=asesor.id,
    )


async def _pago(
    sesion: AsyncSession,
    viaje: m.Viaje,
    vencimiento: date,
    estado: m.EstadoPago = m.EstadoPago.pendiente,
    **campos: object,
) -> m.Pago:
    return await crear(
        sesion, PagoFactory, viaje_id=viaje.id, vencimiento=vencimiento, estado=estado, **campos
    )


async def _oportunidad(sesion: AsyncSession) -> m.Oportunidad:
    asesor = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.empleado)
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=asesor.id)
    return await crear(
        sesion, OportunidadFactory, cliente_id=cliente.id, responsable_id=asesor.id
    )


async def _cotizacion(
    sesion: AsyncSession,
    oportunidad: m.Oportunidad,
    validez_hasta: date,
    estado: m.EstadoCotizacion = m.EstadoCotizacion.enviada,
) -> m.Cotizacion:
    return await crear(
        sesion,
        CotizacionFactory,
        oportunidad_id=oportunidad.id,
        fecha=date(2026, 9, 1),
        validez_hasta=validez_hasta,
        estado=estado,
    )


async def _refrescar(sesion: AsyncSession, objeto: m.Pago | m.Cotizacion) -> None:
    await sesion.refresh(objeto)


def test_los_pasos_de_vencimiento_estan_registrados_en_el_proceso_diario() -> None:
    assert _paso("pago").nombre
    assert _paso("cotizaci").nombre


# --- Pagos (EST-Pago T3) ---


async def test_vence_pago_pendiente(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)
    pago = await _pago(sesion, viaje, AYER)

    await _correr(sesion, "pago")

    await _refrescar(sesion, pago)
    assert pago.estado is m.EstadoPago.vencido


async def test_pago_que_vence_hoy_todavia_no_vence(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)
    hoy = await _pago(sesion, viaje, HOY)
    futuro = await _pago(sesion, viaje, MANANA)

    await _correr(sesion, "pago")

    await _refrescar(sesion, hoy)
    await _refrescar(sesion, futuro)
    assert hoy.estado is m.EstadoPago.pendiente
    assert futuro.estado is m.EstadoPago.pendiente


async def test_no_toca_pagados(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)
    pagado = await _pago(
        sesion,
        viaje,
        AYER,
        m.EstadoPago.pagado,
        forma_pago=m.FormaPago.efectivo,
        moneda_pago=m.Moneda.ARS,
        monto_cobrado=300000,
        fecha_cobro=AYER,
    )

    await _correr(sesion, "pago")

    await _refrescar(sesion, pagado)
    assert pagado.estado is m.EstadoPago.pagado


async def test_no_toca_anulados(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)
    anulado = await _pago(sesion, viaje, AYER, m.EstadoPago.anulado)

    await _correr(sesion, "pago")

    await _refrescar(sesion, anulado)
    assert anulado.estado is m.EstadoPago.anulado


async def test_no_toca_los_ya_vencidos(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)
    vencido = await _pago(sesion, viaje, date(2026, 10, 1), m.EstadoPago.vencido)

    await _correr(sesion, "pago")

    await _refrescar(sesion, vencido)
    assert vencido.estado is m.EstadoPago.vencido
    assert vencido.vencimiento == date(2026, 10, 1)


# --- Cotizaciones (EST-Cotización T5, CU-06 A5, RF-026) ---


async def test_rf026_vence_cotizacion_enviada(sesion: AsyncSession) -> None:
    oportunidad = await _oportunidad(sesion)
    cotizacion = await _cotizacion(sesion, oportunidad, AYER)

    await _correr(sesion, "cotizaci")

    await _refrescar(sesion, cotizacion)
    assert cotizacion.estado is m.EstadoCotizacion.vencida


async def test_rf026_la_oportunidad_no_cambia_de_estado(sesion: AsyncSession) -> None:
    oportunidad = await _oportunidad(sesion)
    antes = oportunidad.estado
    await _cotizacion(sesion, oportunidad, AYER)

    await _correr(sesion, "cotizaci")

    await sesion.refresh(oportunidad)
    assert oportunidad.estado is antes


async def test_rf026_cotizacion_vigente_no_vence(sesion: AsyncSession) -> None:
    oportunidad = await _oportunidad(sesion)
    hoy = await _cotizacion(sesion, oportunidad, HOY)  # el último día de validez sigue vigente
    futura = await _cotizacion(sesion, oportunidad, date(2026, 12, 1))

    await _correr(sesion, "cotizaci")

    await _refrescar(sesion, hoy)
    await _refrescar(sesion, futura)
    assert hoy.estado is m.EstadoCotizacion.enviada
    assert futura.estado is m.EstadoCotizacion.enviada


@pytest.mark.parametrize(
    "estado",
    [
        m.EstadoCotizacion.borrador,
        m.EstadoCotizacion.aceptada,
        m.EstadoCotizacion.rechazada,
        m.EstadoCotizacion.vencida,
    ],
)
async def test_rf026_solo_vencen_las_enviadas(
    sesion: AsyncSession, estado: m.EstadoCotizacion
) -> None:
    oportunidad = await _oportunidad(sesion)
    cotizacion = await _cotizacion(sesion, oportunidad, AYER, estado)

    await _correr(sesion, "cotizaci")

    await _refrescar(sesion, cotizacion)
    assert cotizacion.estado is estado


# --- Idempotencia ---


async def test_idempotente(sesion: AsyncSession) -> None:
    viaje = await _viaje(sesion)
    oportunidad = await _oportunidad(sesion)
    pago = await _pago(sesion, viaje, AYER)
    cotizacion = await _cotizacion(sesion, oportunidad, AYER)

    await _correr(sesion, "pago")
    await _correr(sesion, "cotizaci")
    await _correr(sesion, "pago")
    await _correr(sesion, "cotizaci")
    await _correr(sesion, "pago", MANANA)
    await _correr(sesion, "cotizaci", MANANA)

    await _refrescar(sesion, pago)
    await _refrescar(sesion, cotizacion)
    assert pago.estado is m.EstadoPago.vencido
    assert cotizacion.estado is m.EstadoCotizacion.vencida
