"""T-108: la semilla de demo de M6 (viajes ficticios con su economía y sus pagos) queda registrada
en `datos-iniciales --demo` y es idempotente, también entre días.

Supuestos: la semilla es `sembrar_viajes(sesion)` en `rumbo.datos.semillas.viajes`, se registra en
`SEMILLAS` después de la de clientes y la de configuración, y crea un viaje por cada estado de
EST-Viaje. Las fechas son relativas a `hoy()` (se lo mueve con monkeypatch en el módulo de la
semilla); correrla otro día no debe duplicar viajes ni pagos.
"""

from datetime import timedelta
from decimal import Decimal

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos import semillas
from rumbo.datos.modelos import EstadoPago, Pago, Viaje
from rumbo.datos.semillas.clientes import sembrar_clientes
from rumbo.datos.semillas.configuracion import sembrar_configuracion
from rumbo.datos.semillas.viajes import sembrar_viajes


async def _preparar(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)
    await sembrar_clientes(sesion)
    await sembrar_viajes(sesion)


async def _viajes(sesion: AsyncSession) -> list[Viaje]:
    return list((await sesion.scalars(select(Viaje))).all())


async def _pagos_de(sesion: AsyncSession, viaje: Viaje) -> list[Pago]:
    return list((await sesion.scalars(select(Pago).where(Pago.viaje_id == viaje.id))).all())


async def _contar(sesion: AsyncSession, modelo: type) -> int:
    return await sesion.scalar(select(func.count()).select_from(modelo)) or 0


def test_rf032_la_semilla_de_viajes_esta_registrada_en_la_cli() -> None:
    assert sembrar_viajes in semillas.SEMILLAS


def test_rf032_la_semilla_de_viajes_corre_despues_de_clientes_y_configuracion() -> None:
    posicion = semillas.SEMILLAS.index(sembrar_viajes)
    assert posicion > semillas.SEMILLAS.index(sembrar_clientes)
    assert posicion > semillas.SEMILLAS.index(sembrar_configuracion)


async def test_rf032_hay_un_viaje_por_cada_estado_de_est_viaje(sesion: AsyncSession) -> None:
    await _preparar(sesion)

    estados = [v.estado.value for v in await _viajes(sesion)]
    esperados = {"reservado", "vendido", "confirmado", "en_curso", "finalizado", "cancelado"}
    assert set(estados) == esperados
    assert len(estados) == len(esperados), f"un viaje por estado, hay {estados}"


async def test_rf060_los_pagos_de_cada_viaje_suman_el_precio_de_venta(
    sesion: AsyncSession,
) -> None:
    await _preparar(sesion)

    viajes = await _viajes(sesion)
    assert viajes
    for viaje in viajes:
        pagos = await _pagos_de(sesion, viaje)
        assert pagos, f"el viaje {viaje.estado.value} no tiene pagos"
        assert sum((p.monto for p in pagos), Decimal("0")) == viaje.precio_venta


async def test_rf067_lo_pagado_coincide_con_el_estado_del_viaje(sesion: AsyncSession) -> None:
    await _preparar(sesion)

    for viaje in await _viajes(sesion):
        pagos = await _pagos_de(sesion, viaje)
        pagado = sum((p.monto for p in pagos if p.estado is EstadoPago.pagado), Decimal("0"))
        estado = viaje.estado.value
        if estado == "reservado":
            assert pagado == 0, "un viaje reservado no tiene cobros"
        elif estado == "vendido":
            assert 0 < pagado < viaje.precio_venta, "un viaje vendido tiene cobros parciales"
        elif estado in {"confirmado", "en_curso", "finalizado"}:
            assert pagado == viaje.precio_venta, f"un viaje {estado} tiene el saldo en 0"


async def test_rf032_la_semilla_es_idempotente(sesion: AsyncSession) -> None:
    await _preparar(sesion)
    viajes = await _contar(sesion, Viaje)
    pagos = await _contar(sesion, Pago)
    assert viajes > 0
    assert pagos > 0

    await sembrar_viajes(sesion)

    assert await _contar(sesion, Viaje) == viajes
    assert await _contar(sesion, Pago) == pagos


async def test_rf032_correrla_otro_dia_no_duplica_viajes_ni_pagos(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    await _preparar(sesion)
    viajes = await _contar(sesion, Viaje)
    pagos = await _contar(sesion, Pago)

    manana = hoy() + timedelta(days=1)
    monkeypatch.setattr("rumbo.datos.semillas.viajes.hoy", lambda: manana)
    await sembrar_viajes(sesion)

    assert await _contar(sesion, Viaje) == viajes, "la semilla duplicó viajes al correr otro día"
    assert await _contar(sesion, Pago) == pagos, "la semilla duplicó pagos al correr otro día"
