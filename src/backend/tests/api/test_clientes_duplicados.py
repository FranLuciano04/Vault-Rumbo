"""Fix de la review de M2 (H-03 y H-05): los duplicados se detectan por clave canónica de
teléfono (la de `normalizarTelefonoAR` de shared) y los emails sin distinguir mayúsculas
(CU-02 A1, RF-003); y dos altas simultáneas no se saltean el aviso (DEC-0020: el duplicado
confirmado sí se permite)."""

import asyncio
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from rumbo.core.db import crear_fabrica_sesiones, obtener_sesion, sesion_por_pedido
from rumbo.core.seguridad import obtener_verificador
from rumbo.datos.modelos import Cliente, RolUsuario, Usuario
from rumbo.datos.repositorios.clientes import RepositorioClientes
from rumbo.main import crear_app
from tests.conftest import VerificadorFalso
from tests.fabricas import ClienteFactory, UsuarioFactory, crear

PROBLEM_JSON = "application/problem+json"
FabricaCliente = Callable[[str], Awaitable[AsyncClient]]

# Todos son el mismo celular: +54 9 11 5555-1234.
VARIANTES_DEL_MISMO_TELEFONO = [
    "+54 9 11 5555-1234",
    "5491155551234",
    "011 15-5555-1234",
    "11 5555 1234",
    "(011) 5555-1234",
]


async def _cantidad(sesion: AsyncSession) -> int:
    return (await sesion.execute(select(func.count()).select_from(Cliente))).scalar_one()


# --- H-03: clave canónica de teléfono --------------------------------------------------------


@pytest.mark.parametrize("nuevo", VARIANTES_DEL_MISMO_TELEFONO)
async def test_rf003_telefono_con_otro_formato_es_duplicado(
    cliente_como: FabricaCliente, sesion: AsyncSession, nuevo: str
) -> None:
    existente = await crear(
        sesion, ClienteFactory, nombre="Ana Pérez", contacto="+54 9 11 5555-1234"
    )
    c = await cliente_como("empleado")

    r = await c.post(
        "/api/clientes", json={"nombre": "Beatriz Soler", "contacto": nuevo, "segmento": "pareja"}
    )

    assert r.status_code == 409, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]
    assert await _cantidad(sesion) == 1


@pytest.mark.parametrize("guardado", VARIANTES_DEL_MISMO_TELEFONO)
async def test_rf003_telefono_guardado_en_otro_formato_es_duplicado(
    cliente_como: FabricaCliente, sesion: AsyncSession, guardado: str
) -> None:
    existente = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto=guardado)
    c = await cliente_como("empleado")

    r = await c.post(
        "/api/clientes",
        json={"nombre": "Beatriz Soler", "contacto": "5491155551234", "segmento": "pareja"},
    )

    assert r.status_code == 409, r.text
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]


async def test_rf003_telefonos_distintos_no_son_duplicado(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="+54 9 11 5555-1234")
    c = await cliente_como("empleado")

    r = await c.post(
        "/api/clientes",
        json={"nombre": "Beatriz Soler", "contacto": "11 5555 1235", "segmento": "pareja"},
    )

    assert r.status_code == 201, r.text


async def test_rf003_email_con_otras_mayusculas_es_duplicado(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    existente = await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="Ana@Mail.Test")
    c = await cliente_como("empleado")

    r = await c.post(
        "/api/clientes",
        json={"nombre": "Beatriz Soler", "contacto": "ANA@mail.test", "segmento": "pareja"},
    )

    assert r.status_code == 409, r.text
    assert [d["id"] for d in r.json()["duplicados"]] == [str(existente.id)]


async def test_rf003_confirmar_duplicado_por_telefono_con_otro_formato_da_201(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    await crear(sesion, ClienteFactory, nombre="Ana Pérez", contacto="+54 9 11 5555-1234")
    c = await cliente_como("empleado")

    r = await c.post(
        "/api/clientes",
        json={
            "nombre": "Beatriz Soler",
            "contacto": "5491155551234",
            "segmento": "pareja",
            "confirmar_duplicado": True,
        },
    )

    assert r.status_code == 201, r.text
    assert await _cantidad(sesion) == 2


@pytest.mark.parametrize("nuevo", VARIANTES_DEL_MISMO_TELEFONO)
async def test_rf003_freelance_telefono_ajeno_con_otro_formato_recibe_aviso_sin_datos(
    cliente_como: FabricaCliente, sesion: AsyncSession, nuevo: str
) -> None:
    ajeno = await crear(sesion, UsuarioFactory)
    await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="+54 9 11 5555-1234",
        asesor_asignado_id=ajeno.id,
    )
    c = await cliente_como("freelance")

    r = await c.post(
        "/api/clientes", json={"nombre": "Beatriz Soler", "contacto": nuevo, "segmento": "pareja"}
    )

    assert r.status_code == 409, r.text
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert r.json()["duplicados"] == []
    assert "Ana Pérez" not in r.text
    assert await _cantidad(sesion) == 1


async def test_rf003_freelance_confirma_telefono_ajeno_con_otro_formato_da_201(
    cliente_como: FabricaCliente, sesion: AsyncSession
) -> None:
    ajeno = await crear(sesion, UsuarioFactory)
    await crear(
        sesion,
        ClienteFactory,
        nombre="Ana Pérez",
        contacto="+54 9 11 5555-1234",
        asesor_asignado_id=ajeno.id,
    )
    c = await cliente_como("freelance")

    r = await c.post(
        "/api/clientes",
        json={
            "nombre": "Beatriz Soler",
            "contacto": "5491155551234",
            "segmento": "pareja",
            "confirmar_duplicado": True,
        },
    )

    assert r.status_code == 201, r.text
    assert await _cantidad(sesion) == 2


# --- H-05: altas simultáneas -----------------------------------------------------------------
# Dos transacciones reales (con commit) sobre la base de tests. Para forzar la carrera, las dos
# altas esperan, tras buscar parecidos, a que la otra también haya buscado (con tope de tiempo:
# si el sistema serializa las altas, la segunda no llega a buscar hasta que la primera confirma,
# y la primera sigue sola al vencer la espera). Supuesto: la comprobación del servicio pasa por
# `RepositorioClientes.buscar_parecidos`.

CONTACTO_CARRERA = "carrera.h05@mail.test"
ESPERA_MAXIMA = 1.5


@pytest.fixture
async def app_concurrente(
    motor: AsyncEngine, verificador_falso: VerificadorFalso
) -> AsyncIterator[tuple[FastAPI, list[Usuario]]]:
    """App con una sesión real e independiente por pedido (commit de verdad). Crea dos
    empleados confirmados en la base y, al terminar, borra todo lo que dejó."""
    fabrica = crear_fabrica_sesiones(motor)
    usuarios: list[Usuario] = []
    async with fabrica() as s:
        for _ in range(2):
            usuarios.append(await crear(s, UsuarioFactory, rol=RolUsuario.empleado, activo=True))
        await s.commit()

    app = crear_app()

    async def _sesion_real() -> AsyncIterator[AsyncSession]:
        async for s in sesion_por_pedido(fabrica):
            yield s

    app.dependency_overrides[obtener_sesion] = _sesion_real
    app.dependency_overrides[obtener_verificador] = lambda: verificador_falso
    try:
        yield app, usuarios
    finally:
        app.dependency_overrides.clear()
        async with fabrica() as s:
            await s.execute(delete(Cliente).where(Cliente.contacto == CONTACTO_CARRERA))
            await s.execute(delete(Usuario).where(Usuario.id.in_([u.id for u in usuarios])))
            await s.commit()


@pytest.fixture
def buscar_parecidos_sincronizado(monkeypatch: pytest.MonkeyPatch) -> None:
    original = RepositorioClientes.buscar_parecidos
    llegadas = 0
    ambas = asyncio.Event()

    async def _sincronizado(self: RepositorioClientes, *args: Any, **kwargs: Any) -> Any:
        nonlocal llegadas
        resultado = await original(self, *args, **kwargs)
        llegadas += 1
        if llegadas >= 2:
            ambas.set()
        try:
            await asyncio.wait_for(ambas.wait(), ESPERA_MAXIMA)
        except TimeoutError:
            pass
        return resultado

    monkeypatch.setattr(RepositorioClientes, "buscar_parecidos", _sincronizado)


def _cliente_http(app: FastAPI, verificador: VerificadorFalso, usuario: Usuario) -> AsyncClient:
    token = verificador.emitir(usuario.firebase_uid)
    return AsyncClient(
        transport=ASGITransport(app=app, raise_app_exceptions=False),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    )


async def _filas_de_la_carrera(motor: AsyncEngine) -> int:
    async with crear_fabrica_sesiones(motor)() as s:
        consulta = (
            select(func.count()).select_from(Cliente).where(Cliente.contacto == CONTACTO_CARRERA)
        )
        return (await s.execute(consulta)).scalar_one()


def _cuerpo(nombre: str, **extra: Any) -> dict[str, Any]:
    return {"nombre": nombre, "contacto": CONTACTO_CARRERA, "segmento": "pareja", **extra}


async def test_rf003_dos_altas_simultaneas_del_mismo_contacto_dan_un_201_y_un_409(
    motor: AsyncEngine,
    app_concurrente: tuple[FastAPI, list[Usuario]],
    verificador_falso: VerificadorFalso,
    buscar_parecidos_sincronizado: None,
) -> None:
    app, (u1, u2) = app_concurrente
    async with (
        _cliente_http(app, verificador_falso, u1) as c1,
        _cliente_http(app, verificador_falso, u2) as c2,
    ):
        r1, r2 = await asyncio.gather(
            c1.post("/api/clientes", json=_cuerpo("Carrera Uno")),
            c2.post("/api/clientes", json=_cuerpo("Carrera Dos")),
        )

    assert sorted([r1.status_code, r2.status_code]) == [201, 409], (r1.text, r2.text)
    assert await _filas_de_la_carrera(motor) == 1


async def test_rf003_alta_confirmada_despues_de_una_sin_confirmar_crea_las_dos_dec_0020(
    motor: AsyncEngine,
    app_concurrente: tuple[FastAPI, list[Usuario]],
    verificador_falso: VerificadorFalso,
) -> None:
    app, (u1, u2) = app_concurrente
    async with (
        _cliente_http(app, verificador_falso, u1) as c1,
        _cliente_http(app, verificador_falso, u2) as c2,
    ):
        r1 = await c1.post("/api/clientes", json=_cuerpo("Carrera Uno"))
        r2 = await c2.post("/api/clientes", json=_cuerpo("Carrera Dos", confirmar_duplicado=True))

    assert (r1.status_code, r2.status_code) == (201, 201), (r1.text, r2.text)
    assert await _filas_de_la_carrera(motor) == 2


async def test_rf003_dos_altas_simultaneas_confirmadas_crean_las_dos_dec_0020(
    motor: AsyncEngine,
    app_concurrente: tuple[FastAPI, list[Usuario]],
    verificador_falso: VerificadorFalso,
) -> None:
    app, (u1, u2) = app_concurrente
    async with (
        _cliente_http(app, verificador_falso, u1) as c1,
        _cliente_http(app, verificador_falso, u2) as c2,
    ):
        r1, r2 = await asyncio.gather(
            c1.post("/api/clientes", json=_cuerpo("Carrera Uno", confirmar_duplicado=True)),
            c2.post("/api/clientes", json=_cuerpo("Carrera Dos", confirmar_duplicado=True)),
        )

    assert (r1.status_code, r2.status_code) == (201, 201), (r1.text, r2.text)
    assert await _filas_de_la_carrera(motor) == 2


NOMBRE_CARRERA = "Carrera Por Nombre"


async def test_rf003_dos_altas_simultaneas_del_mismo_nombre_dan_un_201_y_un_409(
    motor: AsyncEngine,
    app_concurrente: tuple[FastAPI, list[Usuario]],
    verificador_falso: VerificadorFalso,
    buscar_parecidos_sincronizado: None,
) -> None:
    app, (u1, u2) = app_concurrente
    async with (
        _cliente_http(app, verificador_falso, u1) as c1,
        _cliente_http(app, verificador_falso, u2) as c2,
    ):
        r1, r2 = await asyncio.gather(
            c1.post(
                "/api/clientes",
                json={"nombre": NOMBRE_CARRERA, "contacto": CONTACTO_CARRERA, "segmento": "pareja"},
            ),
            c2.post(
                "/api/clientes",
                json={
                    "nombre": "  carrera  por NOMBRE ",
                    "contacto": "otro.carrera.h05@mail.test",
                    "segmento": "pareja",
                },
            ),
        )

    assert sorted([r1.status_code, r2.status_code]) == [201, 409], (r1.text, r2.text)
    # Las filas se borran acá y no en un fixture: tienen que irse antes que los usuarios.
    async with crear_fabrica_sesiones(motor)() as s:
        creados = Cliente.nombre.ilike("%carrera%por%")
        filas = (
            await s.execute(select(func.count()).select_from(Cliente).where(creados))
        ).scalar_one()
        await s.execute(delete(Cliente).where(creados))
        await s.commit()
    assert filas == 1


# --- H-04: un alta y una edición simultáneas al mismo contacto -------------------------------
# Supuesto: la edición también comprueba con `RepositorioClientes.buscar_parecidos` (el fixture
# `buscar_parecidos_sincronizado` es el mismo que el de las altas) y serializa por clave.


async def test_rf003_un_alta_y_una_edicion_simultaneas_al_mismo_contacto_dan_un_409(
    motor: AsyncEngine,
    app_concurrente: tuple[FastAPI, list[Usuario]],
    verificador_falso: VerificadorFalso,
    buscar_parecidos_sincronizado: None,
) -> None:
    app, (u1, u2) = app_concurrente
    fabrica = crear_fabrica_sesiones(motor)
    async with fabrica() as s:
        existente = await crear(
            s, ClienteFactory, nombre="Cliente A Editar", contacto="previo.h04@mail.test"
        )
        await s.commit()
        existente_id = existente.id
    try:
        async with (
            _cliente_http(app, verificador_falso, u1) as c1,
            _cliente_http(app, verificador_falso, u2) as c2,
        ):
            r_alta, r_patch = await asyncio.gather(
                c1.post("/api/clientes", json=_cuerpo("Carrera Alta")),
                c2.patch(f"/api/clientes/{existente_id}", json={"contacto": CONTACTO_CARRERA}),
            )

        statuses = sorted([r_alta.status_code, r_patch.status_code])
        assert statuses in ([200, 409], [201, 409]), (r_alta.text, r_patch.text)
        assert 409 in statuses, (r_alta.text, r_patch.text)
        assert await _filas_de_la_carrera(motor) == 1
    finally:
        async with fabrica() as s:
            await s.execute(delete(Cliente).where(Cliente.id == existente_id))
            await s.commit()
