"""T-012: visibilidad por fila y permisos por rol (RF-151, RF-150, DEC-0005, DEC-0008).

Contrato supuesto:
- `visibilidad(actor) -> FiltroVisibilidad`; `filtro.aplicar(select, Modelo) -> select`.
- `RepositorioBase[T]` (subclase con `modelo = ...`, sin estado, `Repo()`):
  `obtener(sesion, id, *, visibilidad)` lanza `NoEncontrado` si la fila no es visible;
  `listar(sesion, *, visibilidad)`. `visibilidad` sin valor por defecto.
- `exigir_rol(actor, *roles)` y `exigir_escritura(actor, registro)` lanzan `SinPermiso`.
"""

import inspect
import uuid
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from rumbo.datos.repositorios.base import RepositorioBase
from rumbo.negocio.errores import NoEncontrado, SinPermiso
from rumbo.negocio.politicas import exigir_escritura, exigir_rol, visibilidad
from tests.fabricas import (
    AlertaFactory,
    ClienteFactory,
    CotizacionFactory,
    DestinoFactory,
    HotelFactory,
    OportunidadFactory,
    PagoFactory,
    ResenaFactory,
    UsuarioFactory,
    ViajeFactory,
    ViajeHotelFactory,
    crear,
)

ROLES = ["admin", "empleado", "dueno", "freelance"]


class RepoClientes(RepositorioBase[m.Cliente]):
    modelo = m.Cliente


class RepoOportunidades(RepositorioBase[m.Oportunidad]):
    modelo = m.Oportunidad


class RepoViajes(RepositorioBase[m.Viaje]):
    modelo = m.Viaje


class RepoAlertas(RepositorioBase[m.Alerta]):
    modelo = m.Alerta


class RepoHoteles(RepositorioBase[m.Hotel]):
    modelo = m.Hotel


class RepoCotizaciones(RepositorioBase[m.Cotizacion]):
    modelo = m.Cotizacion


class RepoPagos(RepositorioBase[m.Pago]):
    modelo = m.Pago


class RepoViajeHoteles(RepositorioBase[m.ViajeHotel]):
    modelo = m.ViajeHotel


class RepoResenas(RepositorioBase[m.Resena]):
    modelo = m.Resena


def _actor(rol: str) -> m.Usuario:
    return UsuarioFactory.build(id=uuid.uuid4(), rol=m.RolUsuario(rol))


async def _escenario(sesion: AsyncSession) -> dict[str, Any]:
    """Un freelance con su cliente, otro freelance con el suyo y un cliente sin asesor."""
    free_a = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.freelance)
    free_b = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.freelance)
    cli_a = await crear(sesion, ClienteFactory, asesor_asignado_id=free_a.id)
    cli_b = await crear(sesion, ClienteFactory, asesor_asignado_id=free_b.id)
    cli_sin = await crear(sesion, ClienteFactory)
    return {"free_a": free_a, "free_b": free_b, "cli_a": cli_a, "cli_b": cli_b, "cli_sin": cli_sin}


# --- Visibilidad: clientes -------------------------------------------------------------


async def test_rf151_freelance_solo_ve_lo_propio(sesion: AsyncSession) -> None:
    e = await _escenario(sesion)
    vistos = await RepoClientes().listar(sesion, visibilidad=visibilidad(e["free_a"]))
    assert {c.id for c in vistos} == {e["cli_a"].id}


async def test_rf151_freelance_no_ve_clientes_sin_asesor(sesion: AsyncSession) -> None:
    e = await _escenario(sesion)
    vistos = await RepoClientes().listar(sesion, visibilidad=visibilidad(e["free_a"]))
    assert e["cli_sin"].id not in {c.id for c in vistos}


@pytest.mark.parametrize("rol", ["empleado", "admin", "dueno"])
async def test_rf151_empleado_ve_toda_la_agencia(sesion: AsyncSession, rol: str) -> None:
    e = await _escenario(sesion)
    actor = await crear(sesion, UsuarioFactory, rol=m.RolUsuario(rol))
    vistos = await RepoClientes().listar(sesion, visibilidad=visibilidad(actor))
    ids = {c.id for c in vistos}
    assert {e["cli_a"].id, e["cli_b"].id, e["cli_sin"].id} <= ids


async def test_rf151_fila_ajena_da_404(sesion: AsyncSession) -> None:
    e = await _escenario(sesion)
    with pytest.raises(NoEncontrado):
        await RepoClientes().obtener(sesion, e["cli_b"].id, visibilidad=visibilidad(e["free_a"]))


async def test_rf151_fila_propia_se_obtiene(sesion: AsyncSession) -> None:
    e = await _escenario(sesion)
    fila = await RepoClientes().obtener(sesion, e["cli_a"].id, visibilidad=visibilidad(e["free_a"]))
    assert fila.id == e["cli_a"].id


async def test_rf151_fila_inexistente_da_404(sesion: AsyncSession) -> None:
    e = await _escenario(sesion)
    with pytest.raises(NoEncontrado):
        await RepoClientes().obtener(sesion, uuid.uuid4(), visibilidad=visibilidad(e["free_a"]))


async def test_rf151_empleado_obtiene_cliente_ajeno(sesion: AsyncSession) -> None:
    e = await _escenario(sesion)
    empleado = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.empleado)
    fila = await RepoClientes().obtener(sesion, e["cli_b"].id, visibilidad=visibilidad(empleado))
    assert fila.id == e["cli_b"].id


# --- Visibilidad del freelance: cliente propio O responsable propio (DEC-0008 §3) -------


async def _operaciones(sesion: AsyncSession) -> dict[str, Any]:
    e = await _escenario(sesion)
    otro = await crear(sesion, UsuarioFactory)
    destino = await crear(sesion, DestinoFactory)
    fa = e["free_a"].id
    # cliente propio / responsable ajeno; cliente ajeno / responsable propio; ninguno
    e["op_cliente"] = await crear(
        sesion, OportunidadFactory, cliente_id=e["cli_a"].id, responsable_id=otro.id
    )
    e["op_resp"] = await crear(
        sesion, OportunidadFactory, cliente_id=e["cli_b"].id, responsable_id=fa
    )
    e["op_ninguno"] = await crear(
        sesion, OportunidadFactory, cliente_id=e["cli_b"].id, responsable_id=otro.id
    )
    kw = {"destino_id": destino.id}
    e["v_cliente"] = await crear(
        sesion, ViajeFactory, cliente_id=e["cli_a"].id, responsable_id=otro.id, **kw
    )
    e["v_resp"] = await crear(
        sesion, ViajeFactory, cliente_id=e["cli_b"].id, responsable_id=fa, **kw
    )
    e["v_ninguno"] = await crear(
        sesion, ViajeFactory, cliente_id=e["cli_b"].id, responsable_id=otro.id, **kw
    )
    return e


async def test_rf151_freelance_ve_oportunidad_de_cliente_propio(sesion: AsyncSession) -> None:
    e = await _operaciones(sesion)
    vistas = await RepoOportunidades().listar(sesion, visibilidad=visibilidad(e["free_a"]))
    assert e["op_cliente"].id in {o.id for o in vistas}


async def test_rf151_freelance_ve_oportunidad_donde_es_responsable(sesion: AsyncSession) -> None:
    e = await _operaciones(sesion)
    vistas = await RepoOportunidades().listar(sesion, visibilidad=visibilidad(e["free_a"]))
    assert e["op_resp"].id in {o.id for o in vistas}


async def test_rf151_freelance_no_ve_oportunidad_ajena(sesion: AsyncSession) -> None:
    e = await _operaciones(sesion)
    vis = visibilidad(e["free_a"])
    vistas = await RepoOportunidades().listar(sesion, visibilidad=vis)
    assert {o.id for o in vistas} == {e["op_cliente"].id, e["op_resp"].id}
    with pytest.raises(NoEncontrado):
        await RepoOportunidades().obtener(sesion, e["op_ninguno"].id, visibilidad=vis)


async def test_rf151_freelance_ve_viaje_de_cliente_propio(sesion: AsyncSession) -> None:
    e = await _operaciones(sesion)
    vistos = await RepoViajes().listar(sesion, visibilidad=visibilidad(e["free_a"]))
    assert e["v_cliente"].id in {v.id for v in vistos}


async def test_rf151_freelance_ve_viaje_donde_es_responsable(sesion: AsyncSession) -> None:
    e = await _operaciones(sesion)
    vistos = await RepoViajes().listar(sesion, visibilidad=visibilidad(e["free_a"]))
    assert e["v_resp"].id in {v.id for v in vistos}


async def test_rf151_freelance_no_ve_viaje_ajeno(sesion: AsyncSession) -> None:
    e = await _operaciones(sesion)
    vis = visibilidad(e["free_a"])
    vistos = await RepoViajes().listar(sesion, visibilidad=vis)
    assert {v.id for v in vistos} == {e["v_cliente"].id, e["v_resp"].id}
    with pytest.raises(NoEncontrado):
        await RepoViajes().obtener(sesion, e["v_ninguno"].id, visibilidad=vis)


# --- Visibilidad del freelance: lo que cuelga de su Oportunidad o su Viaje -------------
# Cada operación de `_operaciones` tiene un hijo: por cliente propio, por responsable propio
# (con cliente ajeno) y por ninguno de los dos.

_SUFIJOS = ("cliente", "resp", "ninguno")


async def _cotizaciones(sesion: AsyncSession) -> dict[str, Any]:
    e = await _operaciones(sesion)
    for sufijo in _SUFIJOS:
        e[f"c_{sufijo}"] = await crear(
            sesion, CotizacionFactory, oportunidad_id=e[f"op_{sufijo}"].id
        )
    return e


async def _pagos(sesion: AsyncSession) -> dict[str, Any]:
    e = await _operaciones(sesion)
    for sufijo in _SUFIJOS:
        e[f"p_{sufijo}"] = await crear(sesion, PagoFactory, viaje_id=e[f"v_{sufijo}"].id)
    return e


async def _viaje_hoteles(sesion: AsyncSession) -> dict[str, Any]:
    e = await _operaciones(sesion)
    hotel = await crear(sesion, HotelFactory, destino_id=e["v_cliente"].destino_id)
    for sufijo in _SUFIJOS:
        e[f"vh_{sufijo}"] = await crear(
            sesion, ViajeHotelFactory, viaje_id=e[f"v_{sufijo}"].id, hotel_id=hotel.id
        )
    return e


@pytest.mark.parametrize(
    ("escenario", "repo", "prefijo"),
    [
        (_cotizaciones, RepoCotizaciones, "c"),
        (_pagos, RepoPagos, "p"),
        (_viaje_hoteles, RepoViajeHoteles, "vh"),
    ],
    ids=["cotizacion", "pago", "viaje_hotel"],
)
async def test_rf151_freelance_ve_solo_lo_que_cuelga_de_lo_propio(
    sesion: AsyncSession, escenario: Any, repo: Any, prefijo: str
) -> None:
    e = await escenario(sesion)
    vis = visibilidad(e["free_a"])
    vistos = await repo().listar(sesion, visibilidad=vis)
    assert {x.id for x in vistos} == {e[f"{prefijo}_cliente"].id, e[f"{prefijo}_resp"].id}
    with pytest.raises(NoEncontrado):
        await repo().obtener(sesion, e[f"{prefijo}_ninguno"].id, visibilidad=vis)


# --- Visibilidad: reseñas ocultas solo para admin y dueño (CU-29) -----------------------


async def _resenas(sesion: AsyncSession) -> dict[str, Any]:
    destino = await crear(sesion, DestinoFactory)
    hotel = await crear(sesion, HotelFactory, destino_id=destino.id)
    cliente = await crear(sesion, ClienteFactory)
    kw = {"cliente_id": cliente.id, "hotel_id": hotel.id}
    publicada = await crear(sesion, ResenaFactory, **kw)
    oculta = await crear(
        sesion,
        ResenaFactory,
        estado=m.EstadoResena.oculta,
        motivo_baja="Contenido ofensivo",
        **kw,
    )
    return {"publicada": publicada, "oculta": oculta}


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf151_admin_y_dueno_ven_resenas_ocultas(sesion: AsyncSession, rol: str) -> None:
    r = await _resenas(sesion)
    jefe = await crear(sesion, UsuarioFactory, rol=m.RolUsuario(rol))
    vis = visibilidad(jefe)
    vistas = await RepoResenas().listar(sesion, visibilidad=vis)
    assert {r["publicada"].id, r["oculta"].id} <= {x.id for x in vistas}
    fila = await RepoResenas().obtener(sesion, r["oculta"].id, visibilidad=vis)
    assert fila.id == r["oculta"].id


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_empleado_y_freelance_solo_ven_resenas_publicadas(
    sesion: AsyncSession, rol: str
) -> None:
    r = await _resenas(sesion)
    actor = await crear(sesion, UsuarioFactory, rol=m.RolUsuario(rol))
    vis = visibilidad(actor)
    ids = {x.id for x in await RepoResenas().listar(sesion, visibilidad=vis)}
    assert r["publicada"].id in ids
    assert r["oculta"].id not in ids
    with pytest.raises(NoEncontrado):
        await RepoResenas().obtener(sesion, r["oculta"].id, visibilidad=vis)


# --- Visibilidad: alertas propias salvo admin y dueño (DEC-0005) ------------------------


async def test_rf151_alertas_son_propias_para_empleado(sesion: AsyncSession) -> None:
    emp1 = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.empleado)
    emp2 = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.empleado)
    a1 = await crear(sesion, AlertaFactory, propietario_id=emp1.id)
    await crear(sesion, AlertaFactory, propietario_id=emp2.id)
    vistas = await RepoAlertas().listar(sesion, visibilidad=visibilidad(emp1))
    assert {a.id for a in vistas} == {a1.id}


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf151_admin_y_dueno_ven_todas_las_alertas(sesion: AsyncSession, rol: str) -> None:
    emp = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.empleado)
    jefe = await crear(sesion, UsuarioFactory, rol=m.RolUsuario(rol))
    a = await crear(sesion, AlertaFactory, propietario_id=emp.id)
    vistas = await RepoAlertas().listar(sesion, visibilidad=visibilidad(jefe))
    assert a.id in {x.id for x in vistas}


# --- Catálogo compartido (DEC-0008: el freelance ve el catálogo) ------------------------


async def test_rf151_freelance_ve_el_catalogo_compartido(sesion: AsyncSession) -> None:
    free = await crear(sesion, UsuarioFactory, rol=m.RolUsuario.freelance)
    destino = await crear(sesion, DestinoFactory)
    hotel = await crear(sesion, HotelFactory, destino_id=destino.id)
    vistos = await RepoHoteles().listar(sesion, visibilidad=visibilidad(free))
    assert hotel.id in {h.id for h in vistos}


# --- El filtro es obligatorio ------------------------------------------------------------


@pytest.mark.parametrize("metodo", ["obtener", "listar"])
def test_rf151_el_repositorio_no_tiene_visibilidad_por_defecto(metodo: str) -> None:
    parametros = inspect.signature(getattr(RepositorioBase, metodo)).parameters
    assert list(parametros)[:2] == ["self", "sesion"]
    assert parametros["visibilidad"].default is inspect.Parameter.empty
    assert parametros["visibilidad"].kind is inspect.Parameter.KEYWORD_ONLY


async def test_rf151_listar_sin_visibilidad_falla(sesion: AsyncSession) -> None:
    with pytest.raises(TypeError):
        await RepoClientes().listar(sesion)  # type: ignore[call-arg]


async def test_rf151_el_filtro_se_aplica_a_una_consulta(sesion: AsyncSession) -> None:
    e = await _escenario(sesion)
    consulta = visibilidad(e["free_a"]).aplicar(select(m.Cliente), m.Cliente)
    filas = (await sesion.scalars(consulta)).all()
    assert {c.id for c in filas} == {e["cli_a"].id}


# --- Permisos: exigir_rol ----------------------------------------------------------------


@pytest.mark.parametrize("rol", ROLES)
def test_rf150_exigir_rol_deja_pasar_al_rol_permitido(rol: str) -> None:
    exigir_rol(_actor(rol), m.RolUsuario(rol))


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
def test_rf150_exigir_rol_admin_o_dueno_rechaza_a_los_demas(rol: str) -> None:
    with pytest.raises(SinPermiso):
        exigir_rol(_actor(rol), m.RolUsuario.admin, m.RolUsuario.dueno)


@pytest.mark.parametrize("rol", ["admin", "dueno"])
def test_rf150_exigir_rol_admin_o_dueno_acepta_a_ambos(rol: str) -> None:
    exigir_rol(_actor(rol), m.RolUsuario.admin, m.RolUsuario.dueno)


def test_rf150_exigir_rol_solo_admin_rechaza_al_dueno() -> None:
    with pytest.raises(SinPermiso):
        exigir_rol(_actor("dueno"), m.RolUsuario.admin)


# --- Permisos: exigir_escritura(actor, registro), DEC-0005 §2 ---------------------------


def _cliente(asesor: uuid.UUID | None) -> m.Cliente:
    return ClienteFactory.build(id=uuid.uuid4(), asesor_asignado_id=asesor)


def _oportunidad(resp: uuid.UUID) -> m.Oportunidad:
    return OportunidadFactory.build(id=uuid.uuid4(), responsable_id=resp)


def _viaje(resp: uuid.UUID) -> m.Viaje:
    return ViajeFactory.build(id=uuid.uuid4(), responsable_id=resp)


def _alerta(prop: uuid.UUID) -> m.Alerta:
    return AlertaFactory.build(id=uuid.uuid4(), propietario_id=prop)


@pytest.mark.parametrize("rol", ["empleado", "admin", "dueno"])
def test_rf150_cliente_lo_escribe_toda_la_agencia(rol: str) -> None:
    exigir_escritura(_actor(rol), _cliente(uuid.uuid4()))
    exigir_escritura(_actor(rol), _cliente(None))


def test_rf150_freelance_escribe_su_cliente() -> None:
    actor = _actor("freelance")
    exigir_escritura(actor, _cliente(actor.id))


@pytest.mark.parametrize("asesor", [None, uuid.uuid4()])
def test_rf150_freelance_no_escribe_cliente_ajeno(asesor: uuid.UUID | None) -> None:
    with pytest.raises(SinPermiso):
        exigir_escritura(_actor("freelance"), _cliente(asesor))


@pytest.mark.parametrize("fabrica", [_oportunidad, _viaje])
@pytest.mark.parametrize("rol", ["empleado", "freelance"])
def test_rf150_el_responsable_escribe_oportunidad_y_viaje(fabrica: Any, rol: str) -> None:
    actor = _actor(rol)
    exigir_escritura(actor, fabrica(actor.id))


@pytest.mark.parametrize("fabrica", [_oportunidad, _viaje])
@pytest.mark.parametrize("rol", ["admin", "dueno"])
def test_rf150_admin_y_dueno_escriben_oportunidad_y_viaje_ajenos(fabrica: Any, rol: str) -> None:
    exigir_escritura(_actor(rol), fabrica(uuid.uuid4()))


@pytest.mark.parametrize("fabrica", [_oportunidad, _viaje])
@pytest.mark.parametrize("rol", ["empleado", "freelance"])
def test_rf150_no_responsable_no_escribe_oportunidad_ni_viaje(fabrica: Any, rol: str) -> None:
    with pytest.raises(SinPermiso):
        exigir_escritura(_actor(rol), fabrica(uuid.uuid4()))


@pytest.mark.parametrize("rol", ROLES)
def test_rf150_el_propietario_escribe_su_alerta(rol: str) -> None:
    actor = _actor(rol)
    exigir_escritura(actor, _alerta(actor.id))


@pytest.mark.parametrize("rol", ROLES)
def test_rf150_solo_el_propietario_escribe_la_alerta(rol: str) -> None:
    with pytest.raises(SinPermiso):
        exigir_escritura(_actor(rol), _alerta(uuid.uuid4()))


@pytest.mark.parametrize("rol", ROLES)
@pytest.mark.parametrize(
    "registro",
    [HotelFactory.build(id=uuid.uuid4()), object()],
    ids=["hotel", "objeto_cualquiera"],
)
def test_rf150_registro_de_tipo_desconocido_se_cierra_por_defecto(rol: str, registro: Any) -> None:
    with pytest.raises(SinPermiso):
        exigir_escritura(_actor(rol), registro)
