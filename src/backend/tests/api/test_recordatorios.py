"""T-054: recordatorios manuales (CU-28, RF-080, RF-081, RF-082).

Decisiones del test-writer donde el contrato o el CU no lo dicen:

- `POST /api/alertas` responde 201 con la misma forma que el resto de las rutas de alertas
  (`responsable` y `contexto`). Una asociación a un registro que quien crea no ve da 404
  (lo pide el ticket, aunque el contrato solo declara 401 y 422 para el POST).
- `PATCH /api/alertas/{id}` sobre una alerta que NO es `manual` (automática) da 409: el
  contrato lo declara para «conflicto con el estado actual» y el recurso existe y es visible;
  no es un dato inválido (422). El detalle del problema nombra el recordatorio manual.
- Editar una alerta ajena: empleado y freelance reciben 404 (RF-078); admin y dueño pueden.
"""

from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import Alerta, EstadoAlerta, TipoAlerta, Usuario
from rumbo.negocio.servicios import alertas as servicio
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    OportunidadFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]
NULO = {"cliente": None, "oportunidad": None, "viaje": None, "pago": None}


def _propio(c: AsyncClient) -> Usuario:
    return c.usuario  # type: ignore[attr-defined,no-any-return]


def _manana() -> str:
    return str(hoy() + timedelta(days=1))


async def _manual(sesion: AsyncSession, propietario: Usuario, **kw: object) -> Alerta:
    return await servicio.crear(
        sesion, TipoAlerta.manual, hoy() + timedelta(days=2), "Llamar a Ana", propietario, None
    )


async def _viaje_propio(sesion: AsyncSession, yo: Usuario, cliente_id: object = None):  # type: ignore[no-untyped-def]
    if cliente_id is None:
        cliente_id = (await crear(sesion, ClienteFactory, asesor_asignado_id=yo.id)).id
    destino = await crear(sesion, DestinoFactory, nombre="Mendoza")
    return await crear(
        sesion, ViajeFactory, cliente_id=cliente_id, destino_id=destino.id, responsable_id=yo.id
    )


# --- crear ---


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado", "freelance"])
async def test_rf080_crear_recordatorio_manual_pendiente_y_propio(
    cliente_como: FabricaCliente, rol: str
) -> None:
    c = await cliente_como(rol)
    yo = _propio(c)

    r = await c.post("/api/alertas", json={"fecha": _manana(), "descripcion": "Llamar a Ana"})

    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["tipo"] == "manual"
    assert cuerpo["estado"] == "pendiente"
    assert cuerpo["fecha"] == _manana()
    assert cuerpo["descripcion"] == "Llamar a Ana"
    assert cuerpo["propietario_id"] == str(yo.id)
    assert cuerpo["responsable"] == {"id": str(yo.id), "nombre": yo.nombre}
    assert cuerpo["contexto"] == NULO


async def test_rf080_el_recordatorio_creado_se_ve_en_el_detalle_y_en_la_agenda(
    cliente_como: FabricaCliente,
) -> None:
    c = await cliente_como("empleado")
    fecha = str(hoy())

    creada = await c.post("/api/alertas", json={"fecha": fecha, "descripcion": "Hoy"})

    assert creada.status_code == 201, creada.text
    detalle = await c.get(f"/api/alertas/{creada.json()['id']}")
    agenda = await c.get("/api/alertas")
    assert detalle.json() == creada.json()
    assert [a["id"] for a in agenda.json()["items"]] == [creada.json()["id"]]


async def test_rf080_recordatorio_personal_sin_asociacion(
    cliente_como: FabricaCliente,
) -> None:
    """CU-28 A1: sin cliente, oportunidad ni viaje queda como tarea suelta."""
    c = await cliente_como("freelance")

    r = await c.post("/api/alertas", json={"fecha": _manana(), "descripcion": "Renovar el seguro"})

    assert r.status_code == 201, r.text
    assert r.json()["contexto"] == NULO


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf081_asociar_a_cliente_visible(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    cliente = await crear(
        sesion, ClienteFactory, nombre="Familia Ferreyra", asesor_asignado_id=_propio(c).id
    )

    r = await c.post(
        "/api/alertas",
        json={"fecha": _manana(), "descripcion": "Mandar fotos", "cliente_id": str(cliente.id)},
    )

    assert r.status_code == 201, r.text
    assert r.json()["contexto"] == {
        **NULO,
        "cliente": {"id": str(cliente.id), "nombre": "Familia Ferreyra"},
    }


async def test_rf081_asociar_a_oportunidad_visible(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    yo = _propio(c)
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=yo.id)
    oportunidad = await crear(
        sesion, OportunidadFactory, cliente_id=cliente.id, responsable_id=yo.id
    )

    r = await c.post(
        "/api/alertas",
        json={
            "fecha": _manana(),
            "descripcion": "Insistir",
            "oportunidad_id": str(oportunidad.id),
        },
    )

    assert r.status_code == 201, r.text
    assert r.json()["contexto"]["oportunidad"]["id"] == str(oportunidad.id)
    assert r.json()["contexto"]["cliente"]["id"] == str(cliente.id)


async def test_rf081_asociar_a_viaje_visible(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    viaje = await _viaje_propio(sesion, _propio(c))

    r = await c.post(
        "/api/alertas",
        json={"fecha": _manana(), "descripcion": "Confirmar hotel", "viaje_id": str(viaje.id)},
    )

    assert r.status_code == 201, r.text
    assert r.json()["contexto"]["viaje"]["id"] == str(viaje.id)
    assert r.json()["contexto"]["viaje"]["destino"] == "Mendoza"
    assert r.json()["contexto"]["cliente"]["id"] == str(viaje.cliente_id)


@pytest.mark.parametrize("entidad", ["cliente", "oportunidad", "viaje"])
async def test_rf081_asociar_a_registro_ajeno_es_404_para_freelance(
    cliente_como: FabricaCliente, sesion: AsyncSession, entidad: str
) -> None:
    c = await cliente_como("freelance")
    otro = await crear(sesion, UsuarioFactory)
    cliente = await crear(sesion, ClienteFactory, asesor_asignado_id=otro.id)
    if entidad == "cliente":
        ajeno = cliente
    elif entidad == "oportunidad":
        ajeno = await crear(
            sesion, OportunidadFactory, cliente_id=cliente.id, responsable_id=otro.id
        )
    else:
        ajeno = await _viaje_propio(sesion, otro, cliente.id)

    r = await c.post(
        "/api/alertas",
        json={"fecha": _manana(), "descripcion": "Espiar", f"{entidad}_id": str(ajeno.id)},
    )

    assert r.status_code == 404, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await c.get("/api/alertas")).json()["items"] == []  # no se creó nada


@pytest.mark.parametrize("entidad", ["cliente", "oportunidad", "viaje"])
async def test_rf081_asociar_a_registro_inexistente_es_404(
    cliente_como: FabricaCliente, entidad: str
) -> None:
    c = await cliente_como("empleado")

    r = await c.post(
        "/api/alertas",
        json={
            "fecha": _manana(),
            "descripcion": "Fantasma",
            f"{entidad}_id": "00000000-0000-0000-0000-000000000000",
        },
    )

    assert r.status_code == 404, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf081_empleado_asocia_a_cliente_de_otro_asesor(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    """El empleado ve toda la agencia (RF-151): el cliente ajeno es visible para él."""
    c = await cliente_como("empleado")
    cliente = await crear(
        sesion, ClienteFactory, asesor_asignado_id=(await crear(sesion, UsuarioFactory)).id
    )

    r = await c.post(
        "/api/alertas",
        json={"fecha": _manana(), "descripcion": "Seguimiento", "cliente_id": str(cliente.id)},
    )

    assert r.status_code == 201, r.text


async def test_rf081_una_sola_entidad_asociada_es_422(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    cliente = await crear(sesion, ClienteFactory)
    viaje = await _viaje_propio(sesion, _propio(c), cliente.id)

    r = await c.post(
        "/api/alertas",
        json={
            "fecha": _manana(),
            "descripcion": "Dos a la vez",
            "cliente_id": str(cliente.id),
            "viaje_id": str(viaje.id),
        },
    )

    assert r.status_code == 422, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("descripcion", ["", "   "])
async def test_rf080_descripcion_vacia_es_422(
    cliente_como: FabricaCliente, descripcion: str
) -> None:
    c = await cliente_como("empleado")

    r = await c.post("/api/alertas", json={"fecha": _manana(), "descripcion": descripcion})

    assert r.status_code == 422, r.text


# --- editar ---


async def test_rf082_editar_fecha_de_un_pendiente(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    alerta = await _manual(sesion, _propio(c))
    nueva = str(hoy() + timedelta(days=9))

    r = await c.patch(f"/api/alertas/{alerta.id}", json={"fecha": nueva})

    assert r.status_code == 200, r.text
    assert r.json()["fecha"] == nueva
    assert r.json()["descripcion"] == "Llamar a Ana"  # lo que no se manda no cambia
    assert r.json()["estado"] == "pendiente"
    assert r.json() == (await c.get(f"/api/alertas/{alerta.id}")).json()


async def test_rf082_editar_descripcion_de_un_pendiente(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("freelance")
    yo = _propio(c)
    alerta = await _manual(sesion, yo)

    r = await c.patch(f"/api/alertas/{alerta.id}", json={"descripcion": "Llamar a Ana y a Juan"})

    assert r.status_code == 200, r.text
    assert r.json()["descripcion"] == "Llamar a Ana y a Juan"
    assert r.json()["fecha"] == str(alerta.fecha)
    assert r.json()["responsable"] == {"id": str(yo.id), "nombre": yo.nombre}
    assert r.json()["contexto"] == NULO


async def test_rf082_editar_fecha_y_descripcion_a_la_vez(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    alerta = await _manual(sesion, _propio(c))
    nueva = str(hoy() + timedelta(days=5))

    r = await c.patch(f"/api/alertas/{alerta.id}", json={"fecha": nueva, "descripcion": "Otra"})

    assert r.status_code == 200, r.text
    assert (r.json()["fecha"], r.json()["descripcion"]) == (nueva, "Otra")


@pytest.mark.parametrize(
    "cuerpo",
    [{"descripcion": ""}, {"fecha": "mañana"}],
)
async def test_rf082_editar_con_datos_invalidos_es_422(
    cliente_como: FabricaCliente, sesion: AsyncSession, cuerpo: dict[str, str]
) -> None:
    c = await cliente_como("empleado")
    alerta = await _manual(sesion, _propio(c))

    r = await c.patch(f"/api/alertas/{alerta.id}", json=cuerpo)

    assert r.status_code == 422, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("estado", [EstadoAlerta.resuelta, EstadoAlerta.vista])
async def test_rf082_editar_resuelto_o_visto_es_409(
    cliente_como: FabricaCliente, sesion: AsyncSession, estado: EstadoAlerta
) -> None:
    c = await cliente_como("empleado")
    alerta = await _manual(sesion, _propio(c))
    alerta.estado = estado
    if estado == EstadoAlerta.resuelta:
        alerta.resuelta_en = datetime.now(UTC)
    await sesion.flush()

    r = await c.patch(f"/api/alertas/{alerta.id}", json={"descripcion": "Tarde"})

    assert r.status_code == 409, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await c.get(f"/api/alertas/{alerta.id}")).json()["descripcion"] == "Llamar a Ana"


async def test_rf082_editar_una_alerta_automatica_es_409(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    """Solo se edita un recordatorio `manual`; las automáticas no (409, ver docstring)."""
    c = await cliente_como("empleado")
    yo = _propio(c)
    cliente = await crear(sesion, ClienteFactory)
    automatica = await servicio.crear(
        sesion, TipoAlerta.recontacto, hoy(), "Recontactar", yo, cliente
    )

    r = await c.patch(f"/api/alertas/{automatica.id}", json={"descripcion": "Cambiada"})

    assert r.status_code == 409, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await c.get(f"/api/alertas/{automatica.id}")).json()["descripcion"] == "Recontactar"


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf078_editar_alerta_ajena_es_404(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    ajena = await _manual(sesion, await crear(sesion, UsuarioFactory))

    r = await c.patch(f"/api/alertas/{ajena.id}", json={"descripcion": "Mía ahora"})

    assert r.status_code == 404, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert ajena.descripcion == "Llamar a Ana"


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf078_direccion_edita_el_recordatorio_de_otro(
    cliente_como: FabricaCliente, sesion: AsyncSession, rol: str
) -> None:
    c = await cliente_como(rol)
    duenia = await crear(sesion, UsuarioFactory, nombre="Sofía Méndez")
    ajena = await _manual(sesion, duenia)

    r = await c.patch(f"/api/alertas/{ajena.id}", json={"descripcion": "Reasignada"})

    assert r.status_code == 200, r.text
    assert r.json()["descripcion"] == "Reasignada"
    assert r.json()["propietario_id"] == str(duenia.id)  # el dueño de la agenda no cambia
    assert r.json()["responsable"] == {"id": str(duenia.id), "nombre": "Sofía Méndez"}


async def test_rf082_editar_inexistente_es_404(cliente_como: FabricaCliente) -> None:
    c = await cliente_como("admin")

    r = await c.patch(
        "/api/alertas/00000000-0000-0000-0000-000000000000", json={"descripcion": "Nada"}
    )

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
