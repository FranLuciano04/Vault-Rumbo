"""T-033: catálogo de operadores (CU-31, RF-093, RF-094, RF-095, RF-096, RF-153, DEC-0009).

Mismo patrón que destinos (T-031). El 401/403 por rol de las rutas ya lo cubre
`test_contrato_m1.py`. Supuestos: el nombre duplicado se compara normalizado (sin tildes,
mayúsculas ni espacios de más) contra TODOS los operadores, activos e inactivos; el listado va
ordenado por nombre; `buscar` mira el nombre; gestionan admin y dueño, leen todos los roles.
"""

import uuid
from collections.abc import Awaitable, Callable
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import Operador, RolUsuario
from rumbo.negocio.errores import Conflicto, SinPermiso
from rumbo.negocio.servicios import configuracion
from tests.fabricas import (
    ClienteFactory,
    DestinoFactory,
    OperadorFactory,
    UsuarioFactory,
    ViajeFactory,
    crear,
)

PROBLEM_JSON = "application/problem+json"
Fabrica = Callable[[str], Awaitable[AsyncClient]]
CUERPO = {"nombre": "Despegar", "contacto": "ventas@despegar.test"}
INEXISTENTE = "00000000-0000-4000-8000-000000000000"


def _url(operador_id: uuid.UUID | str) -> str:
    return f"/api/operadores/{operador_id}"


async def _cantidad(sesion: AsyncSession) -> int:
    return (await sesion.execute(select(func.count()).select_from(Operador))).scalar_one()


async def _operador(sesion: AsyncSession, **campos: Any) -> Operador:
    return await crear(sesion, OperadorFactory, activo=True, **campos)


def _ids(cuerpo: dict[str, Any]) -> list[str]:
    return [o["id"] for o in cuerpo["items"]]


# --- Alta y listado (RF-093) ---------------------------------------------------------------


@pytest.mark.parametrize("rol", ["admin", "dueno"])
async def test_rf093_alta_y_listado(cliente_como: Fabrica, sesion: AsyncSession, rol: str) -> None:
    c = await cliente_como(rol)

    r = await c.post("/api/operadores", json=CUERPO)

    assert r.status_code == 201
    cuerpo = r.json()
    assert cuerpo["nombre"] == "Despegar"
    assert cuerpo["contacto"] == "ventas@despegar.test"
    assert cuerpo["activo"] is True
    assert cuerpo["created_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    fila = await sesion.get(Operador, uuid.UUID(cuerpo["id"]))
    assert fila is not None
    assert fila.nombre == "Despegar"
    assert fila.activo is True

    listado = await c.get("/api/operadores", params={"buscar": "Despegar"})
    assert listado.status_code == 200
    assert _ids(listado.json()) == [cuerpo["id"]]


async def test_rf093_alta_solo_con_nombre(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.post("/api/operadores", json={"nombre": "Almundo"})

    assert r.status_code == 201
    assert r.json()["contacto"] is None


@pytest.mark.parametrize(
    "cuerpo",
    [
        {"contacto": "x@y.test"},
        {"nombre": ""},
        {"nombre": "x" * 121},
        {"nombre": "Almundo", "contacto": "c" * 201},
    ],
)
async def test_rf093_alta_invalida_da_422(
    cliente_como: Fabrica, sesion: AsyncSession, cuerpo: dict[str, str]
) -> None:
    c = await cliente_como("admin")

    r = await c.post("/api/operadores", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _cantidad(sesion) == 0


async def test_rf093_listado_trae_solo_activos_por_defecto(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    activo = await _operador(sesion, nombre="Despegar")
    await crear(sesion, OperadorFactory, nombre="Almundo", activo=False)
    c = await cliente_como("admin")

    r = await c.get("/api/operadores")

    assert r.status_code == 200
    cuerpo = r.json()
    assert _ids(cuerpo) == [str(activo.id)]
    assert cuerpo["total"] == 1
    assert cuerpo["pagina"] == 1
    assert "por_pagina" in cuerpo


async def test_rf093_listado_filtra_inactivos(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    await _operador(sesion, nombre="Despegar")
    inactivo = await crear(sesion, OperadorFactory, nombre="Almundo", activo=False)
    c = await cliente_como("admin")

    r = await c.get("/api/operadores", params={"activo": "false"})

    assert r.status_code == 200
    assert _ids(r.json()) == [str(inactivo.id)]
    assert r.json()["total"] == 1


async def test_rf093_listado_ordenado_por_nombre(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    b = await _operador(sesion, nombre="Bonus")
    ch = await _operador(sesion, nombre="Césped Viajes")
    a = await _operador(sesion, nombre="Aerolíneas")
    c = await cliente_como("admin")

    r = await c.get("/api/operadores")

    assert _ids(r.json()) == [str(a.id), str(b.id), str(ch.id)]


async def test_rf093_listado_pagina(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    for nombre in ("Aerolíneas", "Bonus", "Césped Viajes"):
        await _operador(sesion, nombre=nombre)
    c = await cliente_como("admin")

    r = await c.get("/api/operadores", params={"pagina": 2, "por_pagina": 2})

    assert r.status_code == 200
    assert r.json()["total"] == 3
    assert r.json()["pagina"] == 2
    assert [o["nombre"] for o in r.json()["items"]] == ["Césped Viajes"]


async def test_rf093_buscar_por_nombre_sin_mayusculas_ni_tildes(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    buscado = await _operador(sesion, nombre="Aerolíneas Tour")
    await _operador(sesion, nombre="Despegar")
    c = await cliente_como("admin")

    r = await c.get("/api/operadores", params={"buscar": "AEROLINEAS"})

    assert _ids(r.json()) == [str(buscado.id)]
    assert r.json()["total"] == 1


async def test_rf093_buscar_escapa_los_comodines_del_like(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    guion = await _operador(sesion, nombre="A_B")
    await _operador(sesion, nombre="AxB")
    c = await cliente_como("empleado")

    por_guion = await c.get("/api/operadores", params={"buscar": "_"})
    por_porciento = await c.get("/api/operadores", params={"buscar": "%"})

    assert _ids(por_guion.json()) == [str(guion.id)]
    assert por_porciento.json()["items"] == []


async def test_rf093_buscar_sin_resultados(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    await _operador(sesion, nombre="Despegar")
    c = await cliente_como("admin")

    r = await c.get("/api/operadores", params={"buscar": "zzzz"})

    assert r.status_code == 200
    assert r.json()["items"] == []
    assert r.json()["total"] == 0


@pytest.mark.parametrize("rol", ["admin", "dueno", "empleado", "freelance"])
async def test_rf093_todos_los_roles_leen_listado_y_detalle(
    cliente_como: Fabrica, sesion: AsyncSession, rol: str
) -> None:
    operador = await _operador(sesion, nombre="Despegar", contacto="ventas@despegar.test")
    c = await cliente_como(rol)

    listado = await c.get("/api/operadores")
    detalle = await c.get(_url(operador.id))

    assert listado.status_code == 200
    assert _ids(listado.json()) == [str(operador.id)]
    assert detalle.status_code == 200
    assert detalle.json()["id"] == str(operador.id)
    assert detalle.json()["nombre"] == "Despegar"
    assert detalle.json()["contacto"] == "ventas@despegar.test"
    assert detalle.json()["activo"] is True


async def test_rf093_ver_inactivo_tambien_se_puede(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    operador = await crear(sesion, OperadorFactory, nombre="Almundo", activo=False)
    c = await cliente_como("empleado")

    r = await c.get(_url(operador.id))

    assert r.status_code == 200
    assert r.json()["activo"] is False


async def test_rf093_ver_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.get(_url(INEXISTENTE))

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Edición (RF-093) ----------------------------------------------------------------------


async def test_rf093_editar_parcial_solo_cambia_lo_enviado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    operador = await _operador(sesion, nombre="Despegar", contacto="viejo@despegar.test")
    c = await cliente_como("dueno")

    r = await c.patch(_url(operador.id), json={"contacto": "nuevo@despegar.test"})

    assert r.status_code == 200
    assert r.json()["contacto"] == "nuevo@despegar.test"
    assert r.json()["nombre"] == "Despegar"
    await sesion.refresh(operador)
    assert (operador.nombre, operador.contacto) == ("Despegar", "nuevo@despegar.test")


async def test_rf093_editar_nombre(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    operador = await _operador(sesion, nombre="Despegar")
    c = await cliente_como("admin")

    r = await c.patch(_url(operador.id), json={"nombre": "Almundo"})

    assert r.status_code == 200
    await sesion.refresh(operador)
    assert operador.nombre == "Almundo"


async def test_rf093_editar_puede_vaciar_el_contacto(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    operador = await _operador(sesion, nombre="Despegar", contacto="ventas@despegar.test")
    c = await cliente_como("admin")

    r = await c.patch(_url(operador.id), json={"contacto": None})

    assert r.status_code == 200
    await sesion.refresh(operador)
    assert operador.contacto is None


@pytest.mark.parametrize("cuerpo", [{"nombre": ""}, {"nombre": None}, {"nombre": "x" * 121}])
async def test_rf093_editar_invalido_da_422(
    cliente_como: Fabrica, sesion: AsyncSession, cuerpo: dict[str, str | None]
) -> None:
    operador = await _operador(sesion, nombre="Despegar")
    c = await cliente_como("admin")

    r = await c.patch(_url(operador.id), json=cuerpo)

    assert r.status_code == 422
    await sesion.refresh(operador)
    assert operador.nombre == "Despegar"


async def test_rf093_editar_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.patch(_url(INEXISTENTE), json={"contacto": "x"})

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


# --- Nombre duplicado (RF-094) -------------------------------------------------------------


@pytest.mark.parametrize(
    "nombre",
    ["Aerolíneas", "aerolíneas", "AEROLINEAS", "aerolineas", "  Aerolíneas  ", "AEROLÍNEAS"],
)
async def test_rf094_duplicado_409(
    cliente_como: Fabrica, sesion: AsyncSession, nombre: str
) -> None:
    await _operador(sesion, nombre="Aerolíneas")
    c = await cliente_como("admin")

    r = await c.post("/api/operadores", json={"nombre": nombre})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["status"] == 409
    assert await _cantidad(sesion) == 1  # sin alta


async def test_rf094_duplicado_normalizado_con_espacios_internos(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    await _operador(sesion, nombre="Buenos Aires Tour")
    c = await cliente_como("admin")

    r = await c.post("/api/operadores", json={"nombre": "buenos   AIRES  tour"})

    assert r.status_code == 409


async def test_rf094_duplicado_contra_un_operador_inactivo(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    await crear(sesion, OperadorFactory, nombre="Aerolíneas", activo=False)
    c = await cliente_como("admin")

    r = await c.post("/api/operadores", json={"nombre": "aerolineas"})

    assert r.status_code == 409
    assert await _cantidad(sesion) == 1


async def test_rf094_nombre_distinto_no_es_duplicado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    await _operador(sesion, nombre="Aerolíneas")
    c = await cliente_como("admin")

    r = await c.post("/api/operadores", json={"nombre": "Despegar"})

    assert r.status_code == 201
    assert await _cantidad(sesion) == 2


async def test_rf094_editar_con_el_mismo_nombre_no_es_duplicado(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    operador = await _operador(sesion, nombre="Aerolíneas")
    c = await cliente_como("admin")

    r = await c.patch(_url(operador.id), json={"nombre": "AEROLINEAS", "contacto": "a@b.test"})

    assert r.status_code == 200
    assert r.json()["nombre"] == "AEROLINEAS"
    assert r.json()["contacto"] == "a@b.test"


async def test_rf094_editar_a_un_nombre_ajeno_da_409(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    await _operador(sesion, nombre="Aerolíneas")
    otro = await _operador(sesion, nombre="Despegar")
    c = await cliente_como("admin")

    r = await c.patch(_url(otro.id), json={"nombre": "  aerolineas "})

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    await sesion.refresh(otro)
    assert otro.nombre == "Despegar"


async def test_rf094_la_base_rechaza_dos_operadores_con_nombres_equivalentes(
    sesion: AsyncSession,
) -> None:
    sesion.add(Operador(nombre="Aerolíneas"))
    await sesion.flush()

    sesion.add(Operador(nombre="  AEROLINEAS "))
    with pytest.raises(IntegrityError):
        await sesion.flush()


async def test_rf094_el_choque_con_el_indice_se_traduce_a_conflicto(
    sesion: AsyncSession, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Simula la carrera: el chequeo previo no ve al otro alta, la base sí."""
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario.admin, activo=True)
    await configuracion.crear_operador(sesion, actor, nombre="Aerolíneas")

    async def sin_choque(*_: object, **__: object) -> None:
        return None

    monkeypatch.setattr(configuracion, "_exigir_nombre_libre", sin_choque)

    with pytest.raises(Conflicto):
        await configuracion.crear_operador(sesion, actor, nombre="aerolineas")


# --- Baja lógica (RF-095) ------------------------------------------------------------------


async def test_rf095_baja_en_uso(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    operador = await _operador(sesion, nombre="Despegar")
    destino = await crear(sesion, DestinoFactory, activo=True)
    cliente = await crear(sesion, ClienteFactory)
    responsable = await crear(sesion, UsuarioFactory, activo=True)
    viaje = await crear(
        sesion,
        ViajeFactory,
        cliente_id=cliente.id,
        destino_id=destino.id,
        operador_id=operador.id,
        responsable_id=responsable.id,
    )
    c = await cliente_como("admin")

    r = await c.post(f"{_url(operador.id)}/baja")

    assert r.status_code == 200
    assert r.json()["activo"] is False
    await sesion.refresh(operador)
    assert operador.activo is False
    await sesion.refresh(viaje)
    assert viaje.operador_id == operador.id  # el viaje sigue apuntando al operador
    listado = await c.get("/api/operadores")
    assert str(operador.id) not in _ids(listado.json())
    inactivos = await c.get("/api/operadores", params={"activo": "false"})
    assert str(operador.id) in _ids(inactivos.json())


async def test_rf095_baja_sin_uso(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    operador = await _operador(sesion, nombre="Despegar")
    c = await cliente_como("dueno")

    r = await c.post(f"{_url(operador.id)}/baja")

    assert r.status_code == 200
    assert r.json()["activo"] is False
    assert await _cantidad(sesion) == 1  # lógica: la fila sigue


async def test_rf095_baja_de_uno_ya_inactivo_es_idempotente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    operador = await crear(sesion, OperadorFactory, nombre="Despegar", activo=False)
    c = await cliente_como("admin")

    r = await c.post(f"{_url(operador.id)}/baja")

    assert r.status_code == 200
    assert r.json()["activo"] is False


async def test_rf095_baja_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.post(f"{_url(INEXISTENTE)}/baja")

    assert r.status_code == 404


# --- Reactivar (RF-096) --------------------------------------------------------------------


async def test_rf096_reactivar(cliente_como: Fabrica, sesion: AsyncSession) -> None:
    operador = await crear(sesion, OperadorFactory, nombre="Despegar", activo=False)
    c = await cliente_como("admin")

    r = await c.post(f"{_url(operador.id)}/reactivar")

    assert r.status_code == 200
    assert r.json()["activo"] is True
    await sesion.refresh(operador)
    assert operador.activo is True
    listado = await c.get("/api/operadores")
    assert str(operador.id) in _ids(listado.json())


async def test_rf096_reactivar_uno_ya_activo_es_idempotente(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    operador = await _operador(sesion, nombre="Despegar")
    c = await cliente_como("admin")

    r = await c.post(f"{_url(operador.id)}/reactivar")

    assert r.status_code == 200
    assert r.json()["activo"] is True


async def test_rf096_reactivar_inexistente_da_404(cliente_como: Fabrica) -> None:
    c = await cliente_como("admin")

    r = await c.post(f"{_url(INEXISTENTE)}/reactivar")

    assert r.status_code == 404


# --- Auditoría (RF-153) --------------------------------------------------------------------


async def test_rf153_updated_by_queda_con_quien_edito(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    operador = await _operador(sesion, nombre="Despegar")
    c = await cliente_como("dueno")

    r = await c.patch(_url(operador.id), json={"contacto": "a@b.test"})

    assert r.status_code == 200
    assert r.json()["updated_by"] == str(c.usuario.id)  # type: ignore[attr-defined]
    await sesion.refresh(operador)
    assert operador.updated_by == c.usuario.id  # type: ignore[attr-defined]


async def test_rf153_baja_y_reactivacion_dejan_updated_by(
    cliente_como: Fabrica, sesion: AsyncSession
) -> None:
    operador = await _operador(sesion, nombre="Despegar")
    c = await cliente_como("admin")
    quien = str(c.usuario.id)  # type: ignore[attr-defined]

    baja = await c.post(f"{_url(operador.id)}/baja")
    assert baja.json()["updated_by"] == quien

    operador.updated_by = None
    await sesion.flush()
    reactivado = await c.post(f"{_url(operador.id)}/reactivar")
    assert reactivado.json()["updated_by"] == quien


# --- Rol exigido por el servicio (RF-151) --------------------------------------------------


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_crear_operador_exige_rol_de_gestion(sesion: AsyncSession, rol: str) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)

    with pytest.raises(SinPermiso):
        await configuracion.crear_operador(sesion, actor, nombre="Despegar")


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_editar_operador_exige_rol_de_gestion(sesion: AsyncSession, rol: str) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)
    operador = await _operador(sesion, nombre="Despegar")

    with pytest.raises(SinPermiso):
        await configuracion.editar_operador(sesion, actor, operador.id, {"nombre": "Almundo"})

    await sesion.refresh(operador)
    assert operador.nombre == "Despegar"


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_baja_de_operador_exige_rol_de_gestion(sesion: AsyncSession, rol: str) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)
    operador = await _operador(sesion, nombre="Despegar")

    with pytest.raises(SinPermiso):
        await configuracion.dar_de_baja_operador(sesion, actor, operador.id)

    await sesion.refresh(operador)
    assert operador.activo is True


@pytest.mark.parametrize("rol", ["empleado", "freelance"])
async def test_rf151_reactivar_operador_exige_rol_de_gestion(
    sesion: AsyncSession, rol: str
) -> None:
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)
    operador = await crear(sesion, OperadorFactory, nombre="Despegar", activo=False)

    with pytest.raises(SinPermiso):
        await configuracion.reactivar_operador(sesion, actor, operador.id)

    await sesion.refresh(operador)
    assert operador.activo is False
