"""T-120: GET /calendario, consolidado de viajes, vencimientos y alertas (CU-23; RF-136 a RF-139).

El contrato (roles, forma) lo publicó T-119; acá se fija el comportamiento. Supuestos que fijan
estos tests y que el ticket no dice:

- Un viaje es UN evento `tipo = viaje` con `desde = fecha_salida` y `hasta = fecha_regreso` (la
  salida y el regreso son los extremos del evento). Entra si su tramo se superpone con el rango.
- Un vencimiento es un evento `tipo = vencimiento` de un solo día (`desde == hasta ==
  Pago.vencimiento`), con `pago_id` y `viaje_id`; de los pagos `pendiente`, `vencido` y `pagado`
  (los `anulado` no; el cliente filtra por estado, DEC-0024 punto 9). Su responsable es el del
  viaje.
- Una alerta es un evento `tipo = alerta` de un solo día (`Alerta.fecha`), con `alerta_id`. Entran
  las alertas de cualquier estado (el filtro por estado lo hace el cliente, DEC-0024 punto 9) y de
  cualquier tipo; `estado` es el de la alerta. Su responsable es el `propietario_id`.
- `viaje_id` de una alerta es el de su origen, o null si no lo tiene (el esquema deberá admitirlo);
  los tests de alertas no lo aseveran.
- Rango inclusivo en `desde` y `hasta`, en fechas de Argentina. Sin `desde`/`hasta`, el mes en
  curso (hoy en Argentina); con un solo extremo, el otro es el del mes de ese extremo. `desde`
  posterior a `hasta`, o un rango de más de 62 días, responde 422.
- `mios`: solo eventos cuyo responsable soy yo. `responsable_id`: solo los de ese responsable
  (admin, dueño y empleado; el freelance lo ignora).
- Visibilidad (CU-23, DEC-0008, `politicas.py`): admin, dueño y empleado ven toda la agencia, salvo
  las alertas ajenas, que solo ven admin y dueño (el empleado, las suyas); el freelance ve los
  viajes que lleva y los de sus clientes (y sus vencimientos) y sus alertas.
"""

import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m
from tests import fabricas as f

Fabrica = Callable[[str], Awaitable[AsyncClient]]
URL = "/api/calendario"
OCTUBRE = {"desde": "2026-10-01", "hasta": "2026-10-31"}


def _yo(c: AsyncClient) -> uuid.UUID:
    return c.usuario.id  # type: ignore[attr-defined,no-any-return]


async def _viaje(
    sesion: AsyncSession,
    responsable_id: uuid.UUID,
    salida: date = date(2026, 10, 10),
    regreso: date = date(2026, 10, 20),
    cliente_id: uuid.UUID | None = None,
    **campos: Any,
) -> m.Viaje:
    if cliente_id is None:
        cliente_id = (await f.crear(sesion, f.ClienteFactory)).id
    destino = await f.crear(sesion, f.DestinoFactory)
    return await f.crear(
        sesion,
        f.ViajeFactory,
        cliente_id=cliente_id,
        destino_id=destino.id,
        responsable_id=responsable_id,
        fecha_salida=salida,
        fecha_regreso=regreso,
        estado=campos.pop("estado", m.EstadoViaje.vendido),
        **campos,
    )


async def _pago(
    sesion: AsyncSession, viaje: m.Viaje, vence: date, estado: str = "pendiente"
) -> m.Pago:
    extra: dict[str, Any] = {}
    if estado == "pagado":
        extra = {
            "forma_pago": m.FormaPago.transferencia,
            "moneda_pago": viaje.moneda,
            "monto_cobrado": viaje.precio_venta,
            "fecha_cobro": date(2026, 9, 20),
        }
    return await f.crear(
        sesion,
        f.PagoFactory,
        viaje_id=viaje.id,
        estado=m.EstadoPago(estado),
        vencimiento=vence,
        **extra,
    )


async def _alerta(
    sesion: AsyncSession,
    propietario_id: uuid.UUID,
    dia: date = date(2026, 10, 15),
    estado: str = "pendiente",
    **campos: Any,
) -> m.Alerta:
    if estado == "resuelta":
        campos["resuelta_en"] = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)
    return await f.crear(
        sesion,
        f.AlertaFactory,
        propietario_id=propietario_id,
        fecha=dia,
        estado=m.EstadoAlerta(estado),
        **campos,
    )


def _ids(cuerpo: list[dict[str, Any]], clave: str) -> set[str | None]:
    return {e[clave] for e in cuerpo if e.get(clave) is not None}


def _de_tipo(cuerpo: list[dict[str, Any]], tipo: str) -> list[dict[str, Any]]:
    return [e for e in cuerpo if e["tipo"] == tipo]


async def test_rf136_consolidado_trae_viajes_vencimientos_y_alertas_tipados_con_su_id(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    ana = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, ana.id)
    otro_viaje = await _viaje(sesion, _yo(c), date(2026, 10, 25), date(2026, 11, 5))
    pendiente = await _pago(sesion, viaje, date(2026, 10, 5), "pendiente")
    vencido = await _pago(sesion, viaje, date(2026, 10, 2), "vencido")
    pagado = await _pago(sesion, viaje, date(2026, 10, 6), "pagado")
    await _pago(sesion, viaje, date(2026, 10, 7), "anulado")  # no vence
    alerta = await _alerta(sesion, ana.id, date(2026, 10, 12), "pendiente")
    vista = await _alerta(sesion, ana.id, date(2026, 10, 13), "vista")
    # fuera del rango
    await _viaje(sesion, ana.id, date(2026, 12, 1), date(2026, 12, 10))
    await _pago(sesion, viaje, date(2026, 11, 3), "pendiente")
    await _alerta(sesion, ana.id, date(2026, 9, 30))

    r = await c.get(URL, params=OCTUBRE)

    assert r.status_code == 200
    cuerpo = r.json()
    viajes = _de_tipo(cuerpo, "viaje")
    assert {e["viaje_id"] for e in viajes} == {str(viaje.id), str(otro_viaje.id)}
    mio = next(e for e in viajes if e["viaje_id"] == str(viaje.id))
    assert (mio["desde"], mio["hasta"]) == ("2026-10-10", "2026-10-20")  # salida y regreso
    assert mio["estado"] == "vendido"
    assert mio["responsable_id"] == str(ana.id)
    assert mio["pago_id"] is None
    venc = _de_tipo(cuerpo, "vencimiento")
    assert {e["pago_id"] for e in venc} == {str(pendiente.id), str(vencido.id), str(pagado.id)}
    por_pago = {e["pago_id"]: e for e in venc}
    assert (
        por_pago[str(pendiente.id)]["desde"]
        == por_pago[str(pendiente.id)]["hasta"]
        == ("2026-10-05")
    )
    assert por_pago[str(pendiente.id)]["estado"] == "pendiente"
    assert por_pago[str(vencido.id)]["estado"] == "vencido"
    assert por_pago[str(pagado.id)]["estado"] == "pagado"
    assert all(e["viaje_id"] == str(viaje.id) for e in venc)
    assert all(e["responsable_id"] == str(ana.id) for e in venc)
    alertas = _de_tipo(cuerpo, "alerta")
    assert {e["alerta_id"] for e in alertas} == {str(alerta.id), str(vista.id)}
    por_alerta = {e["alerta_id"]: e for e in alertas}
    assert (
        por_alerta[str(alerta.id)]["desde"] == por_alerta[str(alerta.id)]["hasta"] == ("2026-10-12")
    )
    assert por_alerta[str(alerta.id)]["estado"] == "pendiente"
    assert por_alerta[str(vista.id)]["estado"] == "vista"
    assert all(e["responsable_id"] == str(ana.id) for e in alertas)
    assert len(cuerpo) == 7
    assert all(e["titulo"] for e in cuerpo)


async def test_rf136_las_alertas_resueltas_tambien_viajan_para_que_filtre_el_cliente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    resuelta = await _alerta(sesion, _yo(c), estado="resuelta")

    r = await c.get(URL, params=OCTUBRE)

    assert r.status_code == 200
    assert _ids(r.json(), "alerta_id") == {str(resuelta.id)}
    assert r.json()[0]["estado"] == "resuelta"


async def test_rf136_la_alerta_de_un_pago_o_viaje_trae_su_propio_alerta_id(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c), date(2026, 11, 20), date(2026, 11, 30))
    alerta = await _alerta(sesion, _yo(c), viaje_id=viaje.id, tipo=m.TipoAlerta.viaje)

    r = await c.get(URL, params=OCTUBRE)

    assert r.status_code == 200
    (evento,) = r.json()
    assert evento["tipo"] == "alerta"
    assert evento["alerta_id"] == str(alerta.id)


async def test_rf136_un_viaje_que_cruza_el_rango_aparece_una_sola_vez(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c), date(2026, 9, 25), date(2026, 11, 5))

    r = await c.get(URL, params=OCTUBRE)

    assert r.status_code == 200
    (evento,) = r.json()
    assert evento["viaje_id"] == str(viaje.id)
    assert (evento["desde"], evento["hasta"]) == ("2026-09-25", "2026-11-05")


async def test_rf138_filtra_por_tipo(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c))
    pago = await _pago(sesion, viaje, date(2026, 10, 5))
    alerta = await _alerta(sesion, _yo(c))

    viajes = await c.get(URL, params={**OCTUBRE, "tipo": "viaje"})
    vencimientos = await c.get(URL, params={**OCTUBRE, "tipo": "vencimiento"})
    alertas = await c.get(URL, params={**OCTUBRE, "tipo": "alerta"})

    assert {viajes.status_code, vencimientos.status_code, alertas.status_code} == {200}
    assert [e["viaje_id"] for e in viajes.json()] == [str(viaje.id)]
    assert {e["tipo"] for e in viajes.json()} == {"viaje"}
    assert [e["pago_id"] for e in vencimientos.json()] == [str(pago.id)]
    assert {e["tipo"] for e in vencimientos.json()} == {"vencimiento"}
    assert [e["alerta_id"] for e in alertas.json()] == [str(alerta.id)]
    assert {e["tipo"] for e in alertas.json()} == {"alerta"}


async def test_rf138_tipo_inexistente_responde_422(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.get(URL, params={**OCTUBRE, "tipo": "feriado"})

    assert r.status_code == 422


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf138_direccion_filtra_por_responsable(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    ana = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    beto = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    v_ana = await _viaje(sesion, ana.id)
    v_beto = await _viaje(sesion, beto.id)
    p_ana = await _pago(sesion, v_ana, date(2026, 10, 5))
    await _pago(sesion, v_beto, date(2026, 10, 6))
    a_ana = await _alerta(sesion, ana.id)
    await _alerta(sesion, beto.id)

    todo = await c.get(URL, params=OCTUBRE)
    de_ana = await c.get(URL, params={**OCTUBRE, "responsable_id": str(ana.id)})

    assert len(todo.json()) == 6
    assert de_ana.status_code == 200
    assert _ids(de_ana.json(), "viaje_id") == {str(v_ana.id)}
    assert _ids(de_ana.json(), "pago_id") == {str(p_ana.id)}
    assert _ids(de_ana.json(), "alerta_id") == {str(a_ana.id)}
    assert len(de_ana.json()) == 3
    assert {e["responsable_id"] for e in de_ana.json()} == {str(ana.id)}


async def test_rf138_mios_deja_solo_lo_asignado_a_quien_consulta(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mio = await _viaje(sesion, _yo(c))
    ajeno = await _viaje(sesion, otro.id)
    mi_pago = await _pago(sesion, mio, date(2026, 10, 5))
    await _pago(sesion, ajeno, date(2026, 10, 6))
    mi_alerta = await _alerta(sesion, _yo(c))
    await _alerta(sesion, otro.id)

    r = await c.get(URL, params={**OCTUBRE, "mios": "true"})

    assert r.status_code == 200
    cuerpo = r.json()
    assert _ids(cuerpo, "viaje_id") == {str(mio.id)}
    assert _ids(cuerpo, "pago_id") == {str(mi_pago.id)}
    assert _ids(cuerpo, "alerta_id") == {str(mi_alerta.id)}
    assert len(cuerpo) == 3


async def test_rf138_filtros_se_combinan(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    ana = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    viaje = await _viaje(sesion, ana.id)
    await _pago(sesion, viaje, date(2026, 10, 5))
    alerta = await _alerta(sesion, ana.id)
    await _alerta(sesion, _yo(c))

    r = await c.get(URL, params={**OCTUBRE, "tipo": "alerta", "responsable_id": str(ana.id)})

    assert r.status_code == 200
    assert [e["alerta_id"] for e in r.json()] == [str(alerta.id)]


async def test_rf151_freelance_solo_lo_suyo(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mi_cliente = await f.crear(sesion, f.ClienteFactory, asesor_asignado_id=_yo(c))
    ajeno = await f.crear(sesion, f.ClienteFactory)
    v_cliente_mio = await _viaje(sesion, otro.id, cliente_id=mi_cliente.id)  # lo lleva otro
    v_que_llevo = await _viaje(sesion, _yo(c), cliente_id=ajeno.id)
    v_ajeno = await _viaje(sesion, otro.id, cliente_id=ajeno.id)
    p_cliente_mio = await _pago(sesion, v_cliente_mio, date(2026, 10, 5))
    p_que_llevo = await _pago(sesion, v_que_llevo, date(2026, 10, 6))
    await _pago(sesion, v_ajeno, date(2026, 10, 7))
    mi_alerta = await _alerta(sesion, _yo(c))
    await _alerta(sesion, otro.id)

    r = await c.get(URL, params=OCTUBRE)

    assert r.status_code == 200
    cuerpo = r.json()
    ids_viajes = _ids(_de_tipo(cuerpo, "viaje"), "viaje_id")
    assert ids_viajes == {str(v_cliente_mio.id), str(v_que_llevo.id)}
    assert _ids(cuerpo, "pago_id") == {str(p_cliente_mio.id), str(p_que_llevo.id)}
    assert _ids(cuerpo, "alerta_id") == {str(mi_alerta.id)}


async def test_rf151_freelance_ignora_el_filtro_por_responsable(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mio = await _viaje(sesion, _yo(c))
    await _viaje(sesion, otro.id)

    r = await c.get(URL, params={**OCTUBRE, "responsable_id": str(otro.id)})

    assert r.status_code == 200
    assert _ids(r.json(), "viaje_id") == {str(mio.id)}


async def test_rf151_empleado_ve_toda_la_agencia_salvo_las_alertas_ajenas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    """CU-23 «toda la agencia»: el empleado ve viajes y vencimientos de otros responsables. Las
    alertas siguen la política de `politicas.py`: solo las de su agenda (propietario)."""
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mio = await _viaje(sesion, _yo(c))
    ajeno = await _viaje(sesion, otro.id)
    p_ajeno = await _pago(sesion, ajeno, date(2026, 10, 5))
    mi_alerta = await _alerta(sesion, _yo(c))
    await _alerta(sesion, otro.id)

    r = await c.get(URL, params=OCTUBRE)

    assert r.status_code == 200
    assert _ids(_de_tipo(r.json(), "viaje"), "viaje_id") == {str(mio.id), str(ajeno.id)}
    assert _ids(r.json(), "pago_id") == {str(p_ajeno.id)}
    assert _ids(r.json(), "alerta_id") == {str(mi_alerta.id)}


async def test_rf138_empleado_aplica_mios_y_responsable_id(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    otro = await f.crear(sesion, f.UsuarioFactory, rol=m.RolUsuario("empleado"))
    mio = await _viaje(sesion, _yo(c))
    ajeno = await _viaje(sesion, otro.id)

    solo_mios = await c.get(URL, params={**OCTUBRE, "mios": "true"})
    del_otro = await c.get(URL, params={**OCTUBRE, "responsable_id": str(otro.id)})

    assert solo_mios.status_code == 200
    assert _ids(solo_mios.json(), "viaje_id") == {str(mio.id)}
    assert del_otro.status_code == 200
    assert _ids(del_otro.json(), "viaje_id") == {str(ajeno.id)}


async def test_sin_eventos(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c))  # hay actividad, pero en octubre
    await _pago(sesion, viaje, date(2026, 10, 5))
    await _alerta(sesion, _yo(c))

    r = await c.get(URL, params={"desde": "2026-01-01", "hasta": "2026-01-31"})

    assert r.status_code == 200
    assert r.json() == []


async def test_rf137_los_extremos_del_rango_son_inclusivos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    primero = await _viaje(sesion, _yo(c), date(2026, 10, 1), date(2026, 10, 1))
    ultimo = await _viaje(sesion, _yo(c), date(2026, 10, 31), date(2026, 10, 31))
    await _viaje(sesion, _yo(c), date(2026, 9, 20), date(2026, 9, 30))
    await _viaje(sesion, _yo(c), date(2026, 11, 1), date(2026, 11, 10))
    pagos = {
        d: await _pago(sesion, primero, d)
        for d in (date(2026, 9, 30), date(2026, 10, 1), date(2026, 10, 31), date(2026, 11, 1))
    }
    alertas = {
        d: await _alerta(sesion, _yo(c), d)
        for d in (date(2026, 9, 30), date(2026, 10, 1), date(2026, 10, 31), date(2026, 11, 1))
    }

    r = await c.get(URL, params=OCTUBRE)

    assert r.status_code == 200
    cuerpo = r.json()
    assert _ids(_de_tipo(cuerpo, "viaje"), "viaje_id") == {str(primero.id), str(ultimo.id)}
    assert _ids(cuerpo, "pago_id") == {
        str(pagos[date(2026, 10, 1)].id),
        str(pagos[date(2026, 10, 31)].id),
    }
    assert _ids(cuerpo, "alerta_id") == {
        str(alertas[date(2026, 10, 1)].id),
        str(alertas[date(2026, 10, 31)].id),
    }


async def test_rf137_un_dia_solo_es_un_rango_valido(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    viaje = await _viaje(sesion, _yo(c), date(2026, 10, 10), date(2026, 10, 20))
    await _alerta(sesion, _yo(c), date(2026, 10, 11))

    r = await c.get(URL, params={"desde": "2026-10-10", "hasta": "2026-10-10"})

    assert r.status_code == 200
    assert [e["viaje_id"] for e in r.json()] == [str(viaje.id)]


class _RelojDe31DeOctubre22hArgentina(datetime):
    """01/11 01:00 UTC: en Argentina todavía es 31/10, en el servidor ya es noviembre."""

    @classmethod
    def now(cls, tz: Any = None) -> Any:
        return datetime(2026, 11, 1, 1, 0, tzinfo=UTC).astimezone(tz)


async def test_rf137_sin_rango_devuelve_el_mes_en_curso_en_hora_de_argentina(
    cliente_como: Fabrica, sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("rumbo.core.fechas.datetime", _RelojDe31DeOctubre22hArgentina)
    c = await cliente_como("admin")
    en_mes = await _alerta(sesion, _yo(c), date(2026, 10, 1))
    en_mes_2 = await _alerta(sesion, _yo(c), date(2026, 10, 31))
    await _alerta(sesion, _yo(c), date(2026, 9, 30))
    await _alerta(sesion, _yo(c), date(2026, 11, 1))

    r = await c.get(URL)

    assert r.status_code == 200
    assert _ids(r.json(), "alerta_id") == {str(en_mes.id), str(en_mes_2.id)}


async def test_rf137_con_solo_desde_el_fin_es_el_del_mes_de_ese_dia(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    antes = await _alerta(sesion, _yo(c), date(2026, 10, 14))
    primero = await _alerta(sesion, _yo(c), date(2026, 10, 15))
    ultimo = await _alerta(sesion, _yo(c), date(2026, 10, 31))
    await _alerta(sesion, _yo(c), date(2026, 11, 1))

    r = await c.get(URL, params={"desde": "2026-10-15"})

    assert r.status_code == 200
    assert _ids(r.json(), "alerta_id") == {str(primero.id), str(ultimo.id)}
    assert str(antes.id) not in _ids(r.json(), "alerta_id")


async def test_rf137_con_solo_hasta_el_inicio_es_el_del_mes_de_ese_dia(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await _alerta(sesion, _yo(c), date(2026, 9, 30))
    primero = await _alerta(sesion, _yo(c), date(2026, 10, 1))
    ultimo = await _alerta(sesion, _yo(c), date(2026, 10, 15))
    await _alerta(sesion, _yo(c), date(2026, 10, 16))

    r = await c.get(URL, params={"hasta": "2026-10-15"})

    assert r.status_code == 200
    assert _ids(r.json(), "alerta_id") == {str(primero.id), str(ultimo.id)}


async def test_rf137_el_rango_admite_62_dias_y_no_mas(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    ultimo = await _alerta(sesion, _yo(c), date(2026, 12, 1))

    justo = await c.get(URL, params={"desde": "2026-10-01", "hasta": "2026-12-01"})  # 62 días
    de_mas = await c.get(URL, params={"desde": "2026-10-01", "hasta": "2026-12-02"})  # 63 días

    assert justo.status_code == 200
    assert _ids(justo.json(), "alerta_id") == {str(ultimo.id)}
    assert de_mas.status_code == 422
    assert de_mas.headers["content-type"].startswith("application/problem+json")


async def test_rf137_desde_posterior_a_hasta_responde_422(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.get(URL, params={"desde": "2026-10-31", "hasta": "2026-10-01"})

    assert r.status_code == 422
    assert r.headers["content-type"].startswith("application/problem+json")
