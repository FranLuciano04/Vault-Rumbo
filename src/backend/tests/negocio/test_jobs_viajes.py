"""T-112: paso del proceso diario que sugiere el avance del Viaje por fecha (CU-08 paso 3 y A1,
RF-039) con una Alerta `viaje`; el cambio de estado lo confirma una persona.

Supuestos (a confirmar en la review; el ticket no los fija al día):
- El paso se registra en `proceso_diario.PASOS` con un nombre que contiene «viaje».
- Sugerir `en curso`: viaje `confirmado` con `fecha_salida <= fecha` (borde inclusive; si el
  proceso no corrió un día, igual se sugiere). Sugerir `finalizado`: viaje `en_curso` con
  `fecha_regreso <= fecha` (A1: se sigue sugiriendo mientras siga en curso, sin duplicar).
- Otros estados (`reservado`, `vendido`, `finalizado`, `cancelado`) no generan alerta.
- La alerta: tipo `viaje`, estado `pendiente`, `fecha` = la fecha del proceso, `viaje_id` como
  origen, propietario = `responsable_id` del viaje. La `descripcion` nombra el destino de la
  sugerencia: contiene «en curso» o «finalizado» (en minúsculas).
- Dedup por viaje y sugerencia: una alerta `viaje` pendiente o vista (aun pospuesta) con esa
  sugerencia impide otra. La sugerencia `finalizado` no queda tapada por la de `en curso` ya
  atendida.
"""

from datetime import date

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from rumbo.negocio.servicios import proceso_diario
from tests.fabricas import (
    AlertaFactory,
    ClienteFactory,
    DestinoFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

HOY = date(2026, 11, 2)
AYER = date(2026, 11, 1)
MANANA = date(2026, 11, 3)


def _paso() -> proceso_diario.Paso:
    pasos = [p for p in proceso_diario.PASOS if "viaje" in p.nombre.lower()]
    assert len(pasos) == 1, "el paso de viajes tiene que estar registrado en PASOS"
    return pasos[0]


async def _correr(sesion: AsyncSession, fecha: date = HOY) -> str | None:
    return await _paso().ejecutar(sesion, fecha)


async def _viaje(
    sesion: AsyncSession,
    estado: m.EstadoViaje,
    salida: date,
    regreso: date,
    responsable: m.Usuario | None = None,
    **campos: object,
) -> m.Viaje:
    if responsable is None:
        responsable = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.empleado)
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=responsable.id)
    destino = await crear(sesion, DestinoFactory)
    return await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable.id,
        estado=estado,
        fecha_salida=salida,
        fecha_regreso=regreso,
        **campos,
    )


async def _alertas(sesion: AsyncSession, viaje: m.Viaje) -> list[m.Alerta]:
    consulta = select(m.Alerta).where(
        m.Alerta.viaje_id == viaje.id, m.Alerta.tipo == m.TipoAlerta.viaje
    )
    return list(await sesion.scalars(consulta))


async def _total_viaje(sesion: AsyncSession) -> int:
    consulta = select(func.count()).select_from(m.Alerta).where(m.Alerta.tipo == m.TipoAlerta.viaje)
    return await sesion.scalar(consulta) or 0


def test_rf039_el_paso_esta_registrado_en_el_proceso_diario() -> None:
    assert _paso().nombre


async def test_rf039_sugiere_en_curso(sesion: AsyncSession) -> None:
    responsable = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.empleado)
    viaje = await _viaje(sesion, m.EstadoViaje.confirmado, HOY, date(2026, 11, 12), responsable)

    await _correr(sesion)

    [alerta] = await _alertas(sesion, viaje)
    assert alerta.estado is m.EstadoAlerta.pendiente
    assert alerta.fecha == HOY
    assert alerta.propietario_id == responsable.id
    assert "en curso" in alerta.descripcion.lower()


async def test_rf039_sugiere_finalizado(sesion: AsyncSession) -> None:
    responsable = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.empleado)
    viaje = await _viaje(sesion, m.EstadoViaje.en_curso, date(2026, 10, 25), HOY, responsable)

    await _correr(sesion)

    [alerta] = await _alertas(sesion, viaje)
    assert alerta.estado is m.EstadoAlerta.pendiente
    assert alerta.fecha == HOY
    assert alerta.propietario_id == responsable.id
    assert "finalizado" in alerta.descripcion.lower()


async def test_rf039_sugiere_aunque_el_proceso_no_haya_corrido_el_dia_exacto(
    sesion: AsyncSession,
) -> None:
    sale_ayer = await _viaje(sesion, m.EstadoViaje.confirmado, AYER, date(2026, 11, 10))
    volvio_ayer = await _viaje(sesion, m.EstadoViaje.en_curso, date(2026, 10, 20), AYER)

    await _correr(sesion)

    assert len(await _alertas(sesion, sale_ayer)) == 1
    assert len(await _alertas(sesion, volvio_ayer)) == 1


async def test_rf039_no_sugiere_antes_de_la_fecha(sesion: AsyncSession) -> None:
    sale_manana = await _viaje(sesion, m.EstadoViaje.confirmado, MANANA, date(2026, 11, 12))
    vuelve_manana = await _viaje(sesion, m.EstadoViaje.en_curso, date(2026, 10, 25), MANANA)

    await _correr(sesion)

    assert await _alertas(sesion, sale_manana) == []
    assert await _alertas(sesion, vuelve_manana) == []


@pytest.mark.parametrize(
    "estado",
    [
        m.EstadoViaje.reservado,
        m.EstadoViaje.vendido,
        m.EstadoViaje.finalizado,
        m.EstadoViaje.cancelado,
    ],
)
async def test_rf039_solo_sugiere_para_confirmados_y_en_curso(
    sesion: AsyncSession, estado: m.EstadoViaje
) -> None:
    extra: dict[str, object] = {}
    if estado is m.EstadoViaje.cancelado:
        extra = {
            "estado_previo": m.EstadoViaje.reservado,
            "motivo_cancelacion": "Cambio de planes",
            "fecha_cancelacion": date(2026, 10, 1),
        }
    viaje = await _viaje(sesion, estado, AYER, AYER, **extra)

    await _correr(sesion)

    assert await _alertas(sesion, viaje) == []


async def test_no_cambia_estado(sesion: AsyncSession) -> None:
    # A1: el sistema propone, no fuerza.
    por_salir = await _viaje(sesion, m.EstadoViaje.confirmado, HOY, date(2026, 11, 12))
    por_volver = await _viaje(sesion, m.EstadoViaje.en_curso, date(2026, 10, 25), HOY)

    await _correr(sesion)

    await sesion.refresh(por_salir)
    await sesion.refresh(por_volver)
    assert por_salir.estado is m.EstadoViaje.confirmado
    assert por_volver.estado is m.EstadoViaje.en_curso


async def test_a1_vuelo_retrasado_sigue_en_curso_sin_duplicar_la_alerta(
    sesion: AsyncSession,
) -> None:
    viaje = await _viaje(sesion, m.EstadoViaje.en_curso, date(2026, 10, 25), AYER)

    await _correr(sesion, HOY)
    await _correr(sesion, MANANA)

    await sesion.refresh(viaje)
    assert viaje.estado is m.EstadoViaje.en_curso
    assert len(await _alertas(sesion, viaje)) == 1


async def test_idempotente(sesion: AsyncSession) -> None:
    sale = await _viaje(sesion, m.EstadoViaje.confirmado, HOY, date(2026, 11, 12))
    vuelve = await _viaje(sesion, m.EstadoViaje.en_curso, date(2026, 10, 25), HOY)

    await _correr(sesion)
    despues_de_una = await _total_viaje(sesion)
    await _correr(sesion)
    await _correr(sesion, MANANA)  # otro día: la sugerencia sigue abierta

    assert len(await _alertas(sesion, sale)) == 1
    assert len(await _alertas(sesion, vuelve)) == 1
    assert await _total_viaje(sesion) == despues_de_una


@pytest.mark.parametrize(
    ("estado_alerta", "fecha_alerta"),
    [
        (m.EstadoAlerta.pendiente, date(2026, 11, 1)),
        (m.EstadoAlerta.vista, date(2026, 11, 1)),
        (m.EstadoAlerta.pendiente, date(2026, 12, 15)),  # pospuesta al futuro
    ],
)
async def test_no_duplica_si_hay_una_sugerencia_pendiente_o_vista(
    sesion: AsyncSession, estado_alerta: m.EstadoAlerta, fecha_alerta: date
) -> None:
    viaje = await _viaje(sesion, m.EstadoViaje.confirmado, AYER, date(2026, 11, 12))
    await crear(
        sesion,
        AlertaFactory,
        tipo=m.TipoAlerta.viaje,
        propietario_id=viaje.responsable_id,
        viaje_id=viaje.id,
        descripcion="Sugerir pasar el viaje a en curso",
        estado=estado_alerta,
        fecha=fecha_alerta,
    )

    await _correr(sesion)

    assert len(await _alertas(sesion, viaje)) == 1


async def test_la_sugerencia_finalizado_no_queda_tapada_por_la_de_en_curso(
    sesion: AsyncSession,
) -> None:
    viaje = await _viaje(sesion, m.EstadoViaje.en_curso, date(2026, 10, 25), HOY)
    await crear(
        sesion,
        AlertaFactory,
        tipo=m.TipoAlerta.viaje,
        propietario_id=viaje.responsable_id,
        viaje_id=viaje.id,
        descripcion="Sugerir pasar el viaje a en curso",
        estado=m.EstadoAlerta.resuelta,
        resuelta_en=func.now(),
        fecha=date(2026, 10, 25),
    )

    await _correr(sesion)

    alertas = await _alertas(sesion, viaje)
    pendientes = [a for a in alertas if a.estado is m.EstadoAlerta.pendiente]
    assert len(pendientes) == 1
    assert "finalizado" in pendientes[0].descripcion.lower()


async def test_sin_viajes_para_sugerir(sesion: AsyncSession) -> None:
    await _viaje(sesion, m.EstadoViaje.confirmado, MANANA, date(2026, 11, 12))
    antes = await _total_viaje(sesion)

    await _correr(sesion)

    assert await _total_viaje(sesion) == antes
