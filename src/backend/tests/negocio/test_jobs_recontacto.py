"""T-113: paso del proceso diario que detecta clientes inactivos y crea la alerta `recontacto`
(CU-30, RF-027, RF-028, RF-030).

Supuestos (a confirmar en la review; el CU/RF no los fijan al día):
- El paso se registra en `proceso_diario.PASOS` con un nombre que contiene «recontacto».
- «Última actividad» de un cliente = la mayor `fecha_regreso` de sus viajes no cancelados.
- Candidato: tiene al menos un viaje (historial) y su última actividad es
  `<= fecha - recontacto_meses` meses calendario (borde inclusive, `sumar_meses`). Un solo viaje
  alcanza: los recurrentes (>= 2) solo se «priorizan» (RF-027), no son requisito.
- La alerta: tipo `recontacto`, estado `pendiente`, `fecha` = la fecha del proceso, `cliente_id`
  del cliente como origen, propietario = asesor asignado si está activo; si no, un admin activo.
- `descripcion` no lleva datos del cliente (nombre, contacto): eso va en el contexto (T-052).
- Una Oportunidad abierta (`nueva`, `en_gestion` o `cotizada`) saca al cliente de la lista
  (confirmado por Paloma); una cerrada (`ganada` o `perdida`) no lo excluye.
- Dedup: un cliente con alerta `recontacto` pendiente o vista (aun pospuesta) no recibe otra;
  una resuelta no lo impide.
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
    OportunidadFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

HOY = date(2026, 11, 2)
LIMITE_6_MESES = date(2026, 5, 2)  # HOY - 6 meses
VIEJO = date(2026, 1, 15)


def _paso() -> proceso_diario.Paso:
    pasos = [p for p in proceso_diario.PASOS if "recontacto" in p.nombre.lower()]
    assert len(pasos) == 1, "el paso de recontacto tiene que estar registrado en PASOS"
    return pasos[0]


async def _correr(sesion: AsyncSession, fecha: date = HOY) -> str | None:
    return await _paso().ejecutar(sesion, fecha)


async def _meses(sesion: AsyncSession, meses: int) -> None:
    configuracion = await sesion.get(m.Configuracion, 1)
    assert configuracion is not None
    configuracion.recontacto_meses = meses
    await sesion.flush()


async def _usuario(sesion: AsyncSession, rol: str = "empleado", **campos: object) -> m.Usuario:
    return await crear(sesion, UsuarioFactory, rol=m.RolUsuario(rol), **campos)


async def _cliente(sesion: AsyncSession, asesor: m.Usuario | None, **campos: object) -> m.Cliente:
    return await crear(
        sesion,
        ClienteFactory,
        asesor_asignado_id=asesor.id if asesor else None,
        **campos,
    )


async def _viaje(
    sesion: AsyncSession,
    cliente: m.Cliente,
    responsable: m.Usuario,
    regreso: date,
    **campos: object,
) -> m.Viaje:
    destino = await crear(sesion, DestinoFactory)
    return await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=responsable.id,
        fecha_salida=date(regreso.year, regreso.month, 1),
        fecha_regreso=regreso,
        **campos,
    )


async def _alertas(sesion: AsyncSession, cliente: m.Cliente) -> list[m.Alerta]:
    consulta = select(m.Alerta).where(
        m.Alerta.cliente_id == cliente.id, m.Alerta.tipo == m.TipoAlerta.recontacto
    )
    return list(await sesion.scalars(consulta))


async def _total_recontacto(sesion: AsyncSession) -> int:
    consulta = select(func.count()).select_from(m.Alerta).where(
        m.Alerta.tipo == m.TipoAlerta.recontacto
    )
    return await sesion.scalar(consulta) or 0


def test_rf027_el_paso_esta_registrado_en_el_proceso_diario() -> None:
    assert _paso().nombre


async def test_rf027_detecta_inactivo(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, VIEJO)

    await _correr(sesion)

    [alerta] = await _alertas(sesion, cliente)
    assert alerta.estado is m.EstadoAlerta.pendiente
    assert alerta.fecha == HOY


async def test_rf027_detecta_recurrente_con_ultimo_viaje_viejo(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, date(2025, 3, 10))
    await _viaje(sesion, cliente, asesor, VIEJO)

    await _correr(sesion)

    assert len(await _alertas(sesion, cliente)) == 1


async def test_rf027_un_solo_viaje_alcanza_los_recurrentes_solo_se_priorizan(
    sesion: AsyncSession,
) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, VIEJO)

    await _correr(sesion)

    assert len(await _alertas(sesion, cliente)) == 1


async def test_rf027_el_borde_de_los_meses_es_inclusivo(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    justo = await _cliente(sesion, asesor)
    un_dia_menos = await _cliente(sesion, asesor)
    await _viaje(sesion, justo, asesor, LIMITE_6_MESES)
    await _viaje(sesion, un_dia_menos, asesor, date(2026, 5, 3))

    await _correr(sesion)

    assert len(await _alertas(sesion, justo)) == 1
    assert await _alertas(sesion, un_dia_menos) == []


async def test_rf027_no_detecta_al_que_viajo_hace_poco(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, date(2026, 9, 20))

    await _correr(sesion)

    assert await _alertas(sesion, cliente) == []


async def test_rf027_un_viaje_reciente_o_futuro_saca_al_recurrente_de_la_lista(
    sesion: AsyncSession,
) -> None:
    asesor = await _usuario(sesion)
    con_reciente = await _cliente(sesion, asesor)
    con_futuro = await _cliente(sesion, asesor)
    await _viaje(sesion, con_reciente, asesor, VIEJO)
    await _viaje(sesion, con_reciente, asesor, date(2026, 10, 5))
    await _viaje(sesion, con_futuro, asesor, VIEJO)
    await _viaje(sesion, con_futuro, asesor, date(2027, 1, 20))

    await _correr(sesion)

    assert await _alertas(sesion, con_reciente) == []
    assert await _alertas(sesion, con_futuro) == []


async def test_rf027_sin_historial_de_viajes_no_es_candidato(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)

    await _correr(sesion)

    assert await _alertas(sesion, cliente) == []


async def test_rf027_usa_recontacto_meses_de_la_configuracion(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, date(2026, 8, 1))  # hace 3 meses

    await _meses(sesion, 6)
    await _correr(sesion)
    assert await _alertas(sesion, cliente) == []

    await _meses(sesion, 3)
    await _correr(sesion)
    assert len(await _alertas(sesion, cliente)) == 1


async def test_rf028_alerta_al_asesor(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, VIEJO)

    await _correr(sesion)

    [alerta] = await _alertas(sesion, cliente)
    assert alerta.propietario_id == asesor.id
    assert alerta.tipo is m.TipoAlerta.recontacto


async def test_rf028_sin_asesor_activo_va_a_un_admin(sesion: AsyncSession) -> None:
    admin = await _usuario(sesion, "admin")
    de_baja = await _usuario(sesion, activo=False)
    sin_asesor = await _cliente(sesion, None)
    con_asesor_de_baja = await _cliente(sesion, de_baja)
    await _viaje(sesion, sin_asesor, admin, VIEJO)
    await _viaje(sesion, con_asesor_de_baja, admin, VIEJO)

    await _correr(sesion)

    [a_sin] = await _alertas(sesion, sin_asesor)
    [a_baja] = await _alertas(sesion, con_asesor_de_baja)
    for alerta in (a_sin, a_baja):
        propietario = await sesion.get(m.Usuario, alerta.propietario_id)
        assert propietario is not None
        assert propietario.rol is m.RolUsuario.admin
        assert propietario.activo is True


async def test_rf028_la_descripcion_no_lleva_datos_del_cliente(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor, nombre="Zulema Quiroga Beltrán")
    await _viaje(sesion, cliente, asesor, VIEJO)

    await _correr(sesion)

    [alerta] = await _alertas(sesion, cliente)
    assert alerta.descripcion.strip()
    assert "Zulema" not in alerta.descripcion
    assert "Quiroga" not in alerta.descripcion
    assert cliente.contacto not in alerta.descripcion


async def test_rf030_excluye_opt_out(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor, no_recontactar=True)
    await _viaje(sesion, cliente, asesor, VIEJO)

    await _correr(sesion)

    assert await _alertas(sesion, cliente) == []


async def test_rf028_no_duplica_si_hay_una_sugerencia_pendiente_o_vista(
    sesion: AsyncSession,
) -> None:
    asesor = await _usuario(sesion)
    pendiente = await _cliente(sesion, asesor)
    vista = await _cliente(sesion, asesor)
    pospuesta = await _cliente(sesion, asesor)
    for cliente, estado, fecha in (
        (pendiente, m.EstadoAlerta.pendiente, date(2026, 10, 20)),
        (vista, m.EstadoAlerta.vista, date(2026, 10, 20)),
        (pospuesta, m.EstadoAlerta.pendiente, date(2026, 12, 15)),  # pospuesta al futuro
    ):
        await _viaje(sesion, cliente, asesor, VIEJO)
        await crear(
            sesion,
            AlertaFactory,
            tipo=m.TipoAlerta.recontacto,
            propietario_id=asesor.id,
            cliente_id=cliente.id,
            estado=estado,
            fecha=fecha,
        )

    await _correr(sesion)

    for cliente in (pendiente, vista, pospuesta):
        assert len(await _alertas(sesion, cliente)) == 1


async def test_rf028_una_sugerencia_resuelta_no_impide_una_nueva(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, VIEJO)
    await crear(
        sesion,
        AlertaFactory,
        tipo=m.TipoAlerta.recontacto,
        propietario_id=asesor.id,
        cliente_id=cliente.id,
        estado=m.EstadoAlerta.resuelta,
        resuelta_en=func.now(),
        fecha=date(2026, 3, 1),
    )

    await _correr(sesion)

    alertas = await _alertas(sesion, cliente)
    assert [a.estado for a in alertas].count(m.EstadoAlerta.pendiente) == 1
    assert len(alertas) == 2


async def test_sin_candidatos(sesion: AsyncSession) -> None:
    # A4: ningún cliente cumple el criterio -> no se crea nada.
    asesor = await _usuario(sesion)
    reciente = await _cliente(sesion, asesor)
    opt_out = await _cliente(sesion, asesor, no_recontactar=True)
    await _cliente(sesion, asesor)  # sin viajes
    await _viaje(sesion, reciente, asesor, date(2026, 10, 10))
    await _viaje(sesion, opt_out, asesor, VIEJO)
    antes = await _total_recontacto(sesion)

    await _correr(sesion)

    assert await _total_recontacto(sesion) == antes


async def test_idempotente(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, VIEJO)

    await _correr(sesion)
    despues_de_una = await _total_recontacto(sesion)
    await _correr(sesion)
    await _correr(sesion, date(2026, 11, 3))  # otro día: la sugerencia sigue abierta

    assert len(await _alertas(sesion, cliente)) == 1
    assert await _total_recontacto(sesion) == despues_de_una


async def test_rf027_no_cuenta_los_viajes_cancelados_como_actividad(sesion: AsyncSession) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, VIEJO)
    await _viaje(
        sesion,
        cliente,
        asesor,
        date(2026, 10, 20),
        estado=m.EstadoViaje.cancelado,
        estado_previo=m.EstadoViaje.reservado,
        motivo_cancelacion="Cambio de planes",
        fecha_cancelacion=date(2026, 10, 1),
    )

    await _correr(sesion)

    assert len(await _alertas(sesion, cliente)) == 1


async def _oportunidad(
    sesion: AsyncSession, cliente: m.Cliente, responsable: m.Usuario, estado: m.EstadoOportunidad
) -> m.Oportunidad:
    motivo = m.MotivoPerdida.precio if estado is m.EstadoOportunidad.perdida else None
    return await crear(
        sesion,
        OportunidadFactory,
        cliente_id=cliente.id,
        responsable_id=responsable.id,
        estado=estado,
        motivo_perdida=motivo,
    )


@pytest.mark.parametrize(
    "estado",
    [m.EstadoOportunidad.nueva, m.EstadoOportunidad.en_gestion, m.EstadoOportunidad.cotizada],
)
async def test_rf027_una_oportunidad_abierta_saca_al_cliente_de_la_lista(
    sesion: AsyncSession, estado: m.EstadoOportunidad
) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, VIEJO)
    await _oportunidad(sesion, cliente, asesor, estado)

    await _correr(sesion)

    assert await _alertas(sesion, cliente) == []


@pytest.mark.parametrize("estado", [m.EstadoOportunidad.ganada, m.EstadoOportunidad.perdida])
async def test_rf027_una_oportunidad_cerrada_no_excluye_al_cliente(
    sesion: AsyncSession, estado: m.EstadoOportunidad
) -> None:
    asesor = await _usuario(sesion)
    cliente = await _cliente(sesion, asesor)
    await _viaje(sesion, cliente, asesor, VIEJO)
    await _oportunidad(sesion, cliente, asesor, estado)

    await _correr(sesion)

    assert len(await _alertas(sesion, cliente)) == 1
