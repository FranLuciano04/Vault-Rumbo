"""T-052: agenda de alertas según el rol (CU-14, RF-074, RF-075, RF-078, RF-154).

Forma esperada de la respuesta (se suma al contrato `Alerta`, igual en el listado y en el
detalle porque las pantallas 3 y 49 muestran el origen y el responsable en cada fila):

- `responsable`: `{"id", "nombre"}`, el usuario dueño de la agenda (el mismo de `propietario_id`).
- `contexto`: objeto siempre presente con cuatro claves, cada una `null` si no aplica:
  - `cliente`: `{"id", "nombre"}`
  - `oportunidad`: `{"id", "destino_consultado", "estado"}`
  - `viaje`: `{"id", "destino", "estado", "fecha_salida", "fecha_regreso"}` (`destino` = nombre)
  - `pago`: `{"id", "tipo", "monto", "vencimiento", "estado"}`
  Se completa con la cadena del origen: un pago trae también su viaje y su cliente; un viaje
  y una oportunidad, su cliente. Un recordatorio manual suelto trae las cuatro en `null`.

Visibilidad: admin y dueño, sin filtros, ven toda la agencia (CU-14 A1, pantalla 49);
`propietario_id` filtra por responsable. Empleado y freelance ven siempre solo lo propio e
IGNORAN `propietario_id` (sin 403, el contrato declara solo el 422). No existe el parámetro
`todas`. Por defecto solo `pendiente`; `estado=vista` trae las vistas (toggle «Mostrar vistas»).
"""

from collections.abc import Awaitable, Callable
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient, Response
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import Alerta, EstadoAlerta, EstadoViaje, TipoAlerta, Usuario
from rumbo.negocio.servicios import alertas as servicio
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    HotelFactory,
    OperadorFactory,
    OportunidadFactory,
    PagoFactory,
    UsuarioFactory,
    ViajeFactory,
    ViajeHotelFactory,
    crear,
)

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]


def _propio(c: AsyncClient) -> Usuario:
    return c.usuario  # type: ignore[attr-defined,no-any-return]


async def _alerta(
    sesion: AsyncSession,
    propietario: Usuario,
    fecha: date,
    descripcion: str = "Algo",
    tipo: TipoAlerta = TipoAlerta.manual,
    origen: Any = None,
) -> Alerta:
    return await servicio.crear(sesion, tipo, fecha, descripcion, propietario, origen)


def _ids(r: Response) -> list[str]:
    return [a["id"] for a in r.json()["items"]]


async def test_rf074_agenda_del_dia(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    otro = await crear(sesion, UsuarioFactory)
    atrasada = await _alerta(sesion, yo, hoy() - timedelta(days=2), "atrasada")
    de_hoy = await _alerta(sesion, yo, hoy(), "de hoy")
    await _alerta(sesion, yo, hoy() + timedelta(days=1), "futura")
    resuelta = await _alerta(sesion, yo, hoy(), "resuelta")
    resuelta.estado = EstadoAlerta.resuelta
    resuelta.resuelta_en = datetime.now(UTC)
    await _alerta(sesion, otro, hoy(), "ajena")
    await sesion.flush()

    r = await c.get("/api/alertas")

    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert _ids(r) == [str(atrasada.id), str(de_hoy.id)]  # por fecha, atrasadas incluidas
    assert cuerpo["total"] == 2
    assert cuerpo["pagina"] == 1
    assert {a["propietario_id"] for a in cuerpo["items"]} == {str(yo.id)}
    assert {a["estado"] for a in cuerpo["items"]} == {"pendiente"}


async def test_rf154_proximas(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("freelance")
    yo = _propio(c)
    pasado_manana = await _alerta(sesion, yo, hoy() + timedelta(days=2), "pasado mañana")
    manana = await _alerta(sesion, yo, hoy() + timedelta(days=1), "mañana")
    await _alerta(sesion, yo, hoy(), "hoy")
    await _alerta(sesion, yo, hoy() - timedelta(days=1), "atrasada")
    await _alerta(sesion, await crear(sesion, UsuarioFactory), hoy() + timedelta(days=1), "ajena")

    r = await c.get("/api/alertas", params={"proximas": "true"})

    assert r.status_code == 200, r.text
    assert _ids(r) == [str(manana.id), str(pasado_manana.id)]
    assert r.json()["total"] == 2


async def test_rf074_agenda_vacia_devuelve_lista_vacia(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    await _alerta(sesion, await crear(sesion, UsuarioFactory), hoy(), "ajena")

    r = await c.get("/api/alertas")

    assert r.status_code == 200, r.text
    assert r.json()["items"] == []
    assert r.json()["total"] == 0


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf078_admin_ve_toda_la_agencia(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    yo = _propio(c)
    sofia = await crear(sesion, UsuarioFactory, nombre="Sofía Méndez")
    mia = await _alerta(sesion, yo, hoy(), "mía")
    de_sofia = await _alerta(sesion, sofia, hoy() - timedelta(days=1), "de Sofía")

    todas = await c.get("/api/alertas")
    filtrada = await c.get("/api/alertas", params={"propietario_id": str(sofia.id)})

    assert _ids(todas) == [str(de_sofia.id), str(mia.id)]
    assert todas.json()["total"] == 2
    assert _ids(filtrada) == [str(de_sofia.id)]
    assert filtrada.json()["items"][0]["responsable"] == {
        "id": str(sofia.id),
        "nombre": "Sofía Méndez",
    }


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf078_propietario_se_ignora_sin_rol_de_direccion(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    ajeno = await crear(sesion, UsuarioFactory)
    mia = await _alerta(sesion, _propio(c), hoy(), "mía")
    await _alerta(sesion, ajeno, hoy(), "ajena")

    sin_filtro = await c.get("/api/alertas")
    con_propietario = await c.get("/api/alertas", params={"propietario_id": str(ajeno.id)})

    assert sin_filtro.status_code == 200, sin_filtro.text
    assert con_propietario.status_code == 200, con_propietario.text
    assert _ids(sin_filtro) == [str(mia.id)]
    assert _ids(con_propietario) == [str(mia.id)]


async def test_rf075_contexto_del_origen(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    cliente = await crear(sesion, ClienteFactory, nombre="Centro de Jubilados Quilmes")
    destino = await crear(sesion, DestinoFactory, nombre="Mendoza")
    oportunidad = await crear(
        sesion, OportunidadFactory, cliente_id=cliente.id, responsable_id=yo.id
    )
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=yo.id,
        fecha_salida=date(2027, 1, 10),
        fecha_regreso=date(2027, 1, 20),
    )
    pago = await crear(
        sesion,
        PagoFactory,
        viaje_id=viaje.id,
        monto=Decimal("450000.00"),
        vencimiento=date(2026, 12, 1),
    )
    de_pago = await _alerta(sesion, yo, hoy(), "pago", TipoAlerta.pago, pago)
    de_viaje = await _alerta(sesion, yo, hoy(), "viaje", TipoAlerta.salida, viaje)
    de_oportunidad = await _alerta(sesion, yo, hoy(), "op", TipoAlerta.insistencia, oportunidad)
    de_cliente = await _alerta(sesion, yo, hoy(), "cli", TipoAlerta.recontacto, cliente)
    suelta = await _alerta(sesion, yo, hoy(), "suelta")
    nulo = {"cliente": None, "oportunidad": None, "viaje": None, "pago": None}
    cli = {"id": str(cliente.id), "nombre": "Centro de Jubilados Quilmes"}
    via = {
        "id": str(viaje.id),
        "destino": "Mendoza",
        "estado": EstadoViaje.reservado.value,
        "fecha_salida": "2027-01-10",
        "fecha_regreso": "2027-01-20",
    }

    d_pago = await c.get(f"/api/alertas/{de_pago.id}")
    d_viaje = await c.get(f"/api/alertas/{de_viaje.id}")
    d_oportunidad = await c.get(f"/api/alertas/{de_oportunidad.id}")
    d_cliente = await c.get(f"/api/alertas/{de_cliente.id}")
    d_suelta = await c.get(f"/api/alertas/{suelta.id}")

    for r in (d_pago, d_viaje, d_oportunidad, d_cliente, d_suelta):
        assert r.status_code == 200, r.text
    assert d_pago.json()["responsable"] == {"id": str(yo.id), "nombre": yo.nombre}
    ctx_pago = d_pago.json()["contexto"]
    assert ctx_pago["cliente"] == cli
    assert ctx_pago["viaje"] == via
    assert ctx_pago["oportunidad"] is None
    assert ctx_pago["pago"]["id"] == str(pago.id)
    assert ctx_pago["pago"]["tipo"] == "sena"
    assert Decimal(ctx_pago["pago"]["monto"]) == Decimal("450000.00")
    assert ctx_pago["pago"]["vencimiento"] == "2026-12-01"
    assert ctx_pago["pago"]["estado"] == "pendiente"
    assert d_viaje.json()["contexto"] == {**nulo, "cliente": cli, "viaje": via}
    ctx_op = d_oportunidad.json()["contexto"]
    assert ctx_op == {
        **nulo,
        "cliente": cli,
        "oportunidad": {
            "id": str(oportunidad.id),
            "destino_consultado": "Bariloche",
            "estado": "nueva",
        },
    }
    assert d_cliente.json()["contexto"] == {**nulo, "cliente": cli}
    assert d_suelta.json()["contexto"] == nulo


async def test_rf075_el_listado_trae_contexto_y_responsable(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    cliente = await crear(sesion, ClienteFactory, nombre="Familia Ferreyra")
    await _alerta(sesion, yo, hoy(), "recontacto", TipoAlerta.recontacto, cliente)

    r = await c.get("/api/alertas")

    assert r.status_code == 200, r.text
    item = r.json()["items"][0]
    assert item["responsable"] == {"id": str(yo.id), "nombre": yo.nombre}
    assert item["contexto"]["cliente"] == {"id": str(cliente.id), "nombre": "Familia Ferreyra"}
    assert item["contexto"]["viaje"] is None


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf078_direccion_ve_el_detalle_de_alerta_ajena(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    ajena = await _alerta(sesion, await crear(sesion, UsuarioFactory), hoy(), "ajena")

    r = await c.get(f"/api/alertas/{ajena.id}")

    assert r.status_code == 200, r.text
    assert r.json()["id"] == str(ajena.id)


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf078_alerta_ajena_es_404(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    ajena = await _alerta(sesion, await crear(sesion, UsuarioFactory), hoy(), "ajena")

    r = await c.get(f"/api/alertas/{ajena.id}")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf075_alerta_inexistente_es_404(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("admin")

    r = await c.get("/api/alertas/00000000-0000-0000-0000-000000000000")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf074_vistas_ocultas_por_defecto_y_visibles_con_estado(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    pendiente = await _alerta(sesion, yo, hoy(), "pendiente")
    vista = await _alerta(sesion, yo, hoy(), "vista")
    vista.estado = EstadoAlerta.vista
    await sesion.flush()

    por_defecto = await c.get("/api/alertas")
    solo_vistas = await c.get("/api/alertas", params={"estado": "vista"})

    assert _ids(por_defecto) == [str(pendiente.id)]
    assert _ids(solo_vistas) == [str(vista.id)]


async def test_rf151_freelance_no_ve_el_contexto_de_un_origen_ajeno(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=otro.id)
    destino = await crear(sesion, DestinoFactory)
    viaje = await crear(
        sesion, ViajeFactory, cliente_id=cliente.id, destino_id=destino.id, responsable_id=otro.id
    )
    pago = await crear(sesion, PagoFactory, viaje_id=viaje.id)
    alerta = await _alerta(sesion, _propio(c), hoy(), "pago", TipoAlerta.pago, pago)

    detalle = await c.get(f"/api/alertas/{alerta.id}")
    listado = await c.get("/api/alertas")

    nulo = {"cliente": None, "oportunidad": None, "viaje": None, "pago": None}
    assert detalle.json()["contexto"] == nulo
    assert listado.json()["items"][0]["contexto"] == nulo


async def test_rf075_pago_con_la_moneda_del_viaje(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    cliente = await crear(sesion, ClienteFactory)
    destino = await crear(sesion, DestinoFactory)
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=_propio(c).id,
        moneda="USD",
    )
    pago = await crear(sesion, PagoFactory, viaje_id=viaje.id)
    alerta = await _alerta(sesion, _propio(c), hoy(), "pago", TipoAlerta.pago, pago)

    r = await c.get(f"/api/alertas/{alerta.id}")

    assert r.json()["contexto"]["pago"]["moneda"] == "USD"


async def test_rf074_filtra_por_tipo(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    recontacto = await _alerta(sesion, yo, hoy(), "re", TipoAlerta.recontacto)
    await _alerta(sesion, yo, hoy(), "manual")

    r = await c.get("/api/alertas", params={"tipo": "recontacto"})

    assert _ids(r) == [str(recontacto.id)]


async def test_rf154_hasta_es_tope_dentro_de_la_ventana(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    atrasada = await _alerta(sesion, yo, hoy() - timedelta(days=1), "atrasada")
    de_hoy = await _alerta(sesion, yo, hoy(), "hoy")
    manana = await _alerta(sesion, yo, hoy() + timedelta(days=1), "mañana")
    await _alerta(sesion, yo, hoy() + timedelta(days=5), "lejana")
    tope = str(hoy() + timedelta(days=3))

    proximas = await c.get("/api/alertas", params={"proximas": "true", "hasta": tope})
    del_dia = await c.get("/api/alertas", params={"hasta": tope})
    antes = await c.get("/api/alertas", params={"hasta": str(hoy() - timedelta(days=1))})

    assert _ids(proximas) == [str(manana.id)]
    assert _ids(del_dia) == [str(atrasada.id), str(de_hoy.id)]
    assert _ids(antes) == [str(atrasada.id)]


async def test_rf154_desde_filtra_fecha_mayor_o_igual(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    await _alerta(sesion, yo, hoy() - timedelta(days=3), "muy atrasada")
    ayer = await _alerta(sesion, yo, hoy() - timedelta(days=1), "ayer")
    de_hoy = await _alerta(sesion, yo, hoy(), "hoy")
    await _alerta(sesion, yo, hoy() + timedelta(days=1), "mañana")

    r = await c.get("/api/alertas", params={"desde": str(hoy() - timedelta(days=1))})

    assert r.status_code == 200, r.text
    assert _ids(r) == [str(ayer.id), str(de_hoy.id)]  # inclusive; sin proximas sigue topeado en hoy
    assert r.json()["total"] == 2


async def test_rf154_desde_y_hasta_hoy_devuelve_solo_las_de_hoy(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    for dias in (3, 2, 1):
        await _alerta(sesion, yo, hoy() - timedelta(days=dias), f"atrasada {dias}")
    de_hoy = await _alerta(sesion, yo, hoy(), "hoy")
    await _alerta(sesion, yo, hoy() + timedelta(days=1), "mañana")

    r = await c.get("/api/alertas", params={"desde": str(hoy()), "hasta": str(hoy())})

    assert _ids(r) == [str(de_hoy.id)]
    assert r.json()["total"] == 1


async def test_rf154_desde_se_combina_con_proximas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    await _alerta(sesion, yo, hoy() + timedelta(days=1), "mañana")
    pasado = await _alerta(sesion, yo, hoy() + timedelta(days=2), "pasado mañana")
    lejana = await _alerta(sesion, yo, hoy() + timedelta(days=6), "lejana")
    await _alerta(sesion, yo, hoy(), "hoy")

    r = await c.get(
        "/api/alertas",
        params={"proximas": "true", "desde": str(hoy() + timedelta(days=2))},
    )
    acotada = await c.get(
        "/api/alertas",
        params={
            "proximas": "true",
            "desde": str(hoy() + timedelta(days=2)),
            "hasta": str(hoy() + timedelta(days=3)),
        },
    )

    assert _ids(r) == [str(pasado.id), str(lejana.id)]
    assert _ids(acotada) == [str(pasado.id)]


async def test_rf154_desde_no_trae_atrasadas_cuando_hay_muchas(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    for i in range(3):
        await _alerta(sesion, yo, hoy() - timedelta(days=1 + i), f"atrasada {i}")
    de_hoy = await _alerta(sesion, yo, hoy(), "hoy")

    r = await c.get(
        "/api/alertas",
        params={"desde": str(hoy()), "hasta": str(hoy()), "por_pagina": 1, "pagina": 1},
    )

    assert _ids(r) == [str(de_hoy.id)]  # la primera página ya es la de hoy
    assert r.json()["total"] == 1


async def test_rf154_desde_posterior_a_hasta_devuelve_vacio(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    await _alerta(sesion, yo, hoy() - timedelta(days=1), "ayer")
    await _alerta(sesion, yo, hoy(), "hoy")

    r = await c.get(
        "/api/alertas", params={"desde": str(hoy()), "hasta": str(hoy() - timedelta(days=1))}
    )

    assert r.status_code == 200, r.text
    assert r.json()["items"] == []
    assert r.json()["total"] == 0


async def test_rf154_desde_invalido_es_422(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("empleado")

    r = await c.get("/api/alertas", params={"desde": "no-es-fecha"})

    assert r.status_code == 422


@pytest.mark.parametrize("rol", ["empleado", "admin", "dueno"])
async def test_rf151_sin_restriccion_de_lectura_el_contexto_viene_completo(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    otro = await crear(sesion, UsuarioFactory)
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=otro.id)
    destino = await crear(sesion, DestinoFactory)
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=otro.id,
        moneda="USD",
    )
    pago = await crear(sesion, PagoFactory, viaje_id=viaje.id)
    alerta = await _alerta(sesion, _propio(c), hoy(), "pago", TipoAlerta.pago, pago)

    r = await c.get(f"/api/alertas/{alerta.id}")

    contexto = r.json()["contexto"]
    assert contexto["cliente"]["id"] == str(cliente.id)
    assert contexto["viaje"]["id"] == str(viaje.id)
    assert contexto["pago"]["id"] == str(pago.id)
    assert contexto["pago"]["moneda"] == "USD"


async def test_rf151_freelance_responsable_del_viaje_ve_viaje_y_pago_pero_no_el_cliente(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    """El freelance ve un viaje (y sus pagos) si es su `responsable_id`, aunque el cliente tenga
    otro asesor; el cliente, en cambio, solo si es su asesor asignado (`_PROPIO_DEL_FREELANCE`)."""
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=otro.id)
    destino = await crear(sesion, DestinoFactory)
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=_propio(c).id,
    )
    pago = await crear(sesion, PagoFactory, viaje_id=viaje.id)
    alerta = await _alerta(sesion, _propio(c), hoy(), "pago", TipoAlerta.pago, pago)

    r = await c.get(f"/api/alertas/{alerta.id}")

    contexto = r.json()["contexto"]
    assert contexto["viaje"]["id"] == str(viaje.id)
    assert contexto["pago"]["id"] == str(pago.id)
    assert contexto["cliente"] is None


# --- T-053: atender las alertas con el progreso del día (CU-14 A2 y A4, RF-076, RF-077, RF-155) ---

_ARGENTINA = ZoneInfo("America/Argentina/Buenos_Aires")


def _en_argentina(dia: date, hora: int, minuto: int = 0) -> datetime:
    return datetime(dia.year, dia.month, dia.day, hora, minuto, tzinfo=_ARGENTINA)


async def _progreso(c: AsyncClient) -> dict[str, int]:
    r = await c.get("/api/alertas/progreso-del-dia")
    assert r.status_code == 200, r.text
    return r.json()  # type: ignore[no-any-return]


async def _alerta_de_pago(sesion: AsyncSession, propietario: Usuario) -> Alerta:
    cliente = await crear(sesion, ClienteFactory)
    destino = await crear(sesion, DestinoFactory)
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        responsable_id=propietario.id,
    )
    pago = await crear(sesion, PagoFactory, viaje_id=viaje.id)
    return await _alerta(sesion, propietario, hoy(), "cobrar", TipoAlerta.pago, pago)


def _cuerpo_posponer(accion: str) -> dict[str, str] | None:
    return {"fecha": str(hoy() + timedelta(days=3))} if accion == "posponer" else None


async def test_rf076_marcar_vista(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    alerta = await _alerta(sesion, _propio(c), hoy(), "para ver")

    r = await c.post(f"/api/alertas/{alerta.id}/vista")

    assert r.status_code == 200, r.text
    assert r.json()["id"] == str(alerta.id)
    assert r.json()["estado"] == "vista"
    assert (await c.get(f"/api/alertas/{alerta.id}")).json()["estado"] == "vista"


async def test_rf076_resolver(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    alerta = await _alerta(sesion, _propio(c), hoy(), "para resolver")

    r = await c.post(f"/api/alertas/{alerta.id}/resolver")

    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["estado"] == "resuelta"
    assert cuerpo["resuelta_en"] is not None
    assert (await c.get(f"/api/alertas/{alerta.id}")).json()["estado"] == "resuelta"
    assert (await c.get("/api/alertas")).json()["items"] == []


async def test_rf076_resolver_una_vista(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    alerta = await _alerta(sesion, _propio(c), hoy(), "vista")
    alerta.estado = EstadoAlerta.vista
    await sesion.flush()

    r = await c.post(f"/api/alertas/{alerta.id}/resolver")

    assert r.status_code == 200, r.text
    assert r.json()["estado"] == "resuelta"


async def test_rf076_la_respuesta_trae_responsable_y_contexto_como_el_get(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    cliente = await crear(sesion, ClienteFactory, nombre="Familia Ferreyra")
    vista = await _alerta(sesion, yo, hoy(), "a", TipoAlerta.recontacto, cliente)
    resuelta = await _alerta(sesion, yo, hoy(), "b", TipoAlerta.recontacto, cliente)
    pospuesta = await _alerta(sesion, yo, hoy(), "c", TipoAlerta.recontacto, cliente)

    rv = await c.post(f"/api/alertas/{vista.id}/vista")
    rr = await c.post(f"/api/alertas/{resuelta.id}/resolver")
    rp = await c.post(
        f"/api/alertas/{pospuesta.id}/posponer", json={"fecha": str(hoy() + timedelta(days=3))}
    )

    for r, a in ((rv, vista), (rr, resuelta), (rp, pospuesta)):
        assert r.status_code == 200, r.text
        assert r.json()["responsable"] == {"id": str(yo.id), "nombre": yo.nombre}
        assert r.json()["contexto"]["cliente"] == {
            "id": str(cliente.id),
            "nombre": "Familia Ferreyra",
        }
        assert r.json() == (await c.get(f"/api/alertas/{a.id}")).json()


@pytest.mark.parametrize(
    ("accion", "estado_inicial"),
    [
        ("vista", EstadoAlerta.vista),
        ("vista", EstadoAlerta.resuelta),
        ("resolver", EstadoAlerta.resuelta),
        ("posponer", EstadoAlerta.vista),
        ("posponer", EstadoAlerta.resuelta),
    ],
)
async def test_rf076_transicion_invalida_es_409(
    cliente_como: FabricaCliente,
    sesion: AsyncSession,
    accion: str,
    estado_inicial: EstadoAlerta,
) -> None:
    c = await cliente_como("empleado")
    alerta = await _alerta(sesion, _propio(c), hoy(), "estado previo")
    alerta.estado = estado_inicial
    if estado_inicial == EstadoAlerta.resuelta:
        alerta.resuelta_en = datetime.now(UTC)
    await sesion.flush()

    r = await c.post(f"/api/alertas/{alerta.id}/{accion}", json=_cuerpo_posponer(accion))

    assert r.status_code == 409, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await c.get(f"/api/alertas/{alerta.id}")).json()["estado"] == estado_inicial.value


async def test_rf077_posponer(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    alerta = await _alerta(sesion, _propio(c), hoy() - timedelta(days=1), "vencida")
    nueva = hoy() + timedelta(days=2)

    r = await c.post(f"/api/alertas/{alerta.id}/posponer", json={"fecha": str(nueva)})

    assert r.status_code == 200, r.text
    assert r.json()["fecha"] == str(nueva)
    assert r.json()["estado"] == "pendiente"
    assert (await c.get(f"/api/alertas/{alerta.id}")).json()["fecha"] == str(nueva)
    assert (await c.get("/api/alertas")).json()["items"] == []  # ya no es de hoy


@pytest.mark.parametrize("desfase", [-3, 0])
async def test_rf077_posponer_a_fecha_no_futura_es_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, desfase: int
) -> None:
    c = await cliente_como("empleado")
    alerta = await _alerta(sesion, _propio(c), hoy(), "hoy")

    r = await c.post(
        f"/api/alertas/{alerta.id}/posponer", json={"fecha": str(hoy() + timedelta(days=desfase))}
    )

    assert r.status_code == 422, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await c.get(f"/api/alertas/{alerta.id}")).json()["fecha"] == str(hoy())


async def test_rf077_posponer_no_puede_adelantar_la_fecha_de_una_alerta_futura(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    lejana = await _alerta(sesion, _propio(c), hoy() + timedelta(days=10), "lejana")

    r = await c.post(
        f"/api/alertas/{lejana.id}/posponer", json={"fecha": str(hoy() + timedelta(days=5))}
    )

    assert r.status_code == 422, r.text


async def test_rf077_posponer_sin_fecha_es_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    alerta = await _alerta(sesion, _propio(c), hoy(), "hoy")

    r = await c.post(f"/api/alertas/{alerta.id}/posponer", json={})

    assert r.status_code == 422, r.text


async def test_rf079_alerta_de_pago_no_se_resuelve_a_mano(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    alerta = await _alerta_de_pago(sesion, _propio(c))

    r = await c.post(f"/api/alertas/{alerta.id}/resolver")

    assert r.status_code == 409, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert "cobr" in r.json()["detail"].lower()  # el motivo: se resuelve al cobrar el pago
    assert (await c.get(f"/api/alertas/{alerta.id}")).json()["estado"] == "pendiente"
    assert (await _progreso(c))["resueltas_hoy"] == 0


async def test_rf079_alerta_de_pago_al_proveedor_se_resuelve_al_registrar_el_pago(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    destino = await crear(sesion, DestinoFactory)
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=(await crear(sesion, ClienteFactory)).id,
        destino_id=destino.id,
        operador_id=(await crear(sesion, OperadorFactory)).id,
        responsable_id=yo.id,
    )
    hotel = await crear(sesion, HotelFactory, destino_id=destino.id)
    tramo = await crear(sesion, ViajeHotelFactory, viaje_id=viaje.id, hotel_id=hotel.id)
    alerta = await _alerta(sesion, yo, hoy(), "pagar al hotel", TipoAlerta.pago, tramo)

    r = await c.post(f"/api/alertas/{alerta.id}/resolver")

    assert r.status_code == 409, r.text
    assert "proveedor" in r.json()["detail"].lower()


async def test_rf079_alerta_de_pago_si_se_puede_marcar_vista_y_posponer(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    alerta = await _alerta_de_pago(sesion, _propio(c))

    pospuesta = await c.post(
        f"/api/alertas/{alerta.id}/posponer", json={"fecha": str(hoy() + timedelta(days=2))}
    )

    assert pospuesta.status_code == 200, pospuesta.text
    # Pospuesta sigue pendiente: se puede marcar vista.
    vista = await c.post(f"/api/alertas/{alerta.id}/vista")
    assert vista.status_code == 200, vista.text


async def test_rf155_progreso_del_dia(cliente_como: FabricaCliente, sesion: AsyncSession) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    otro = await crear(sesion, UsuarioFactory)
    resuelta_hoy = await _alerta(sesion, yo, hoy(), "resuelta hoy")
    resuelta_hoy.estado = EstadoAlerta.resuelta
    resuelta_hoy.resuelta_en = _en_argentina(hoy(), 9)
    resuelta_ayer = await _alerta(sesion, yo, hoy() - timedelta(days=1), "resuelta ayer")
    resuelta_ayer.estado = EstadoAlerta.resuelta
    resuelta_ayer.resuelta_en = _en_argentina(hoy() - timedelta(days=1), 20)
    await _alerta(sesion, yo, hoy(), "pendiente de hoy")
    await _alerta(sesion, yo, hoy() - timedelta(days=2), "atrasada")
    await _alerta(sesion, yo, hoy() + timedelta(days=1), "futura")
    ajena = await _alerta(sesion, otro, hoy(), "ajena")
    ajena.estado = EstadoAlerta.resuelta
    ajena.resuelta_en = _en_argentina(hoy(), 10)
    await sesion.flush()

    assert await _progreso(c) == {"resueltas_hoy": 1, "total_del_dia": 3}


async def test_rf155_progreso_vacio(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("freelance")

    assert await _progreso(c) == {"resueltas_hoy": 0, "total_del_dia": 0}


async def test_rf155_progreso_usa_el_dia_de_argentina(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    """00:30 de hoy en Argentina es de hoy aunque en UTC sea el mismo día a las 03:30; 23:30 de
    ayer en Argentina es de ayer aunque en UTC ya sea hoy (02:30 UTC)."""
    c = await cliente_como("empleado")
    yo = _propio(c)
    madrugada = await _alerta(sesion, yo, hoy(), "madrugada")
    madrugada.estado = EstadoAlerta.resuelta
    madrugada.resuelta_en = _en_argentina(hoy(), 0, 30).astimezone(UTC)
    anoche = await _alerta(sesion, yo, hoy() - timedelta(days=1), "anoche")
    anoche.estado = EstadoAlerta.resuelta
    anoche.resuelta_en = _en_argentina(hoy() - timedelta(days=1), 23, 30).astimezone(UTC)
    await sesion.flush()

    assert await _progreso(c) == {"resueltas_hoy": 1, "total_del_dia": 1}


async def test_rf155_resolver_suma_al_progreso(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    una = await _alerta(sesion, yo, hoy(), "una")
    await _alerta(sesion, yo, hoy(), "otra")
    assert await _progreso(c) == {"resueltas_hoy": 0, "total_del_dia": 2}

    await c.post(f"/api/alertas/{una.id}/resolver")

    assert await _progreso(c) == {"resueltas_hoy": 1, "total_del_dia": 2}


async def test_rf155_posponer_saca_la_alerta_del_total(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    await _alerta(sesion, yo, hoy(), "queda")
    se_va = await _alerta(sesion, yo, hoy(), "se va")

    r = await c.post(
        f"/api/alertas/{se_va.id}/posponer", json={"fecha": str(hoy() + timedelta(days=1))}
    )

    assert r.status_code == 200, r.text
    assert await _progreso(c) == {"resueltas_hoy": 0, "total_del_dia": 1}


async def test_rf155_marcar_vista_no_cuenta_como_avance(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    yo = _propio(c)
    vista = await _alerta(sesion, yo, hoy(), "vista")
    await _alerta(sesion, yo, hoy(), "otra")

    await c.post(f"/api/alertas/{vista.id}/vista")

    assert await _progreso(c) == {"resueltas_hoy": 0, "total_del_dia": 2}


async def _agencia_con_progreso(sesion: AsyncSession, yo: Usuario) -> None:
    """Mías: 1 resuelta hoy + 1 pendiente. De otro: 1 resuelta hoy + 2 pendientes (una atrasada)."""
    otro = await crear(sesion, UsuarioFactory)
    mia = await _alerta(sesion, yo, hoy(), "mía resuelta")
    mia.estado = EstadoAlerta.resuelta
    mia.resuelta_en = _en_argentina(hoy(), 9)
    await _alerta(sesion, yo, hoy(), "mía pendiente")
    ajena = await _alerta(sesion, otro, hoy(), "ajena resuelta")
    ajena.estado = EstadoAlerta.resuelta
    ajena.resuelta_en = _en_argentina(hoy(), 10)
    await _alerta(sesion, otro, hoy(), "ajena pendiente")
    await _alerta(sesion, otro, hoy() - timedelta(days=1), "ajena atrasada")
    await sesion.flush()


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf155_progreso_de_direccion_es_el_de_toda_la_agencia(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    await _agencia_con_progreso(sesion, _propio(c))

    assert await _progreso(c) == {"resueltas_hoy": 2, "total_del_dia": 5}


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf155_progreso_de_empleado_y_freelance_es_solo_el_propio(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    await _agencia_con_progreso(sesion, _propio(c))

    assert await _progreso(c) == {"resueltas_hoy": 1, "total_del_dia": 2}


@pytest.mark.parametrize("accion", ["vista", "resolver", "posponer"])
@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf078_atender_alerta_ajena_es_404(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str, accion: str
) -> None:
    c = await cliente_como(rol)
    ajena = await _alerta(sesion, await crear(sesion, UsuarioFactory), hoy(), "ajena")

    r = await c.post(f"/api/alertas/{ajena.id}/{accion}", json=_cuerpo_posponer(accion))

    assert r.status_code == 404, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert ajena.estado == EstadoAlerta.pendiente


@pytest.mark.parametrize(
    ("accion", "estado"),
    [("vista", "vista"), ("resolver", "resuelta"), ("posponer", "pendiente")],
)
@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf078_direccion_atiende_alertas_ajenas(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str, accion: str, estado: str
) -> None:
    c = await cliente_como(rol)
    duenia = await crear(sesion, UsuarioFactory, nombre="Sofía Méndez")
    ajena = await _alerta(sesion, duenia, hoy(), "ajena")

    r = await c.post(f"/api/alertas/{ajena.id}/{accion}", json=_cuerpo_posponer(accion))

    assert r.status_code == 200, r.text
    assert r.json()["estado"] == estado
    assert r.json()["propietario_id"] == str(duenia.id)
    assert r.json()["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    assert r.json()["responsable"] == {"id": str(duenia.id), "nombre": "Sofía Méndez"}


@pytest.mark.parametrize("accion", ["vista", "resolver", "posponer"])
async def test_rf076_alerta_inexistente_es_404(cliente_como: FabricaCliente, accion: str) -> None:
    c = await cliente_como("admin")

    r = await c.post(
        f"/api/alertas/00000000-0000-0000-0000-000000000000/{accion}",
        json=_cuerpo_posponer(accion),
    )

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
