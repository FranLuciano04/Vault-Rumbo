"""T-027: alta y consulta de usuarios con su cuenta de Firebase (CU-25, RF-144, RF-145, RF-146,
RF-151, DEC-0016) y T-028: edición de rol y baja lógica (RF-147, RF-148, RF-149, RF-153).
Usa un gestor de cuentas falso: nunca toca Firebase."""

import asyncio
import uuid
from collections.abc import Awaitable, Callable

import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import ServicioExterno
from rumbo.core.seguridad import CuentaYaExiste, obtener_gestor_de_cuentas
from rumbo.datos.modelos import RolUsuario, Usuario
from rumbo.negocio.servicios import seguridad
from tests.fabricas import UsuarioFactory, crear

RUTA = "/api/usuarios"
ROLES_SIN_ACCESO = ["empleado", "freelance"]
CuerpoAlta = dict[str, object]
ClienteComo = Callable[[str], Awaitable[AsyncClient]]
PROBLEM_JSON = "application/problem+json"


class GestorDeCuentasFalso:
    """Cuentas de Firebase en memoria, con fallas y registro de envíos de mail."""

    def __init__(self) -> None:
        self.cuentas: dict[str, str] = {}  # email -> uid
        self.borradas: list[str] = []
        self.deshabilitadas: list[str] = []
        self.falla_al_deshabilitar = False
        self.mails: list[str] = []
        self.falla_al_crear = False
        self.falla_al_enviar_mail = False
        self.uid_forzado: str | None = None

    async def crear_cuenta(self, email: str, nombre: str) -> str:
        if self.falla_al_crear:
            raise ServicioExterno("Firebase no responde")
        if email in self.cuentas:
            raise CuentaYaExiste(email)
        uid = self.uid_forzado or f"uid-falso-{uuid.uuid4().hex[:8]}"
        self.cuentas[email] = uid
        return uid

    async def borrar_cuenta(self, firebase_uid: str) -> None:
        self.borradas.append(firebase_uid)
        self.cuentas = {e: u for e, u in self.cuentas.items() if u != firebase_uid}

    async def deshabilitar_cuenta(self, firebase_uid: str) -> None:
        if self.falla_al_deshabilitar:
            raise ServicioExterno("Firebase no pudo deshabilitar la cuenta")
        self.deshabilitadas.append(firebase_uid)

    async def enviar_mail_restablecimiento(self, email: str) -> None:
        if self.falla_al_enviar_mail:
            raise ServicioExterno("Firebase no pudo enviar el mail")
        self.mails.append(email)


@pytest.fixture
def firebase(app_de_tests: FastAPI) -> GestorDeCuentasFalso:
    gestor = GestorDeCuentasFalso()
    app_de_tests.dependency_overrides[obtener_gestor_de_cuentas] = lambda: gestor
    return gestor


def _alta(**cambios: object) -> CuerpoAlta:
    cuerpo: CuerpoAlta = {
        "nombre": "Lucía Pérez",
        "email": "lucia@agencia.test",
        "rol": "empleado",
    }
    return {**cuerpo, **cambios}


async def _usuarios_con_email(sesion: AsyncSession, email: str) -> int:
    consulta = select(func.count()).select_from(Usuario).where(Usuario.email == email)
    return int(await sesion.scalar(consulta) or 0)


@pytest.mark.parametrize("quien", ["admin", "dueno"])
async def test_rf144_alta_crea_cuenta_y_usuario(
    quien: str,
    cliente_como: ClienteComo,
    firebase: GestorDeCuentasFalso,
    sesion: AsyncSession,
) -> None:
    c = await cliente_como(quien)

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 201, r.text
    cuerpo = r.json()
    assert cuerpo["nombre"] == "Lucía Pérez"
    assert cuerpo["email"] == "lucia@agencia.test"
    assert cuerpo["rol"] == "empleado"
    assert cuerpo["activo"] is True
    assert cuerpo["acceso_redes"] is False
    assert "firebase_uid" not in cuerpo
    assert list(firebase.cuentas) == ["lucia@agencia.test"]
    guardado = await sesion.scalar(select(Usuario).where(Usuario.email == "lucia@agencia.test"))
    assert guardado is not None
    assert guardado.firebase_uid == firebase.cuentas["lucia@agencia.test"]
    assert guardado.rol == RolUsuario.empleado
    assert guardado.activo is True


async def test_rf144_alta_pide_a_firebase_el_mail_de_restablecimiento(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    c = await cliente_como("admin")

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 201, r.text
    assert firebase.mails == ["lucia@agencia.test"]


@pytest.mark.parametrize("acceso", [True, False])
async def test_rf145_alta_con_acceso_a_redes(
    acceso: bool,
    cliente_como: ClienteComo,
    firebase: GestorDeCuentasFalso,
    sesion: AsyncSession,
) -> None:
    c = await cliente_como("dueno")

    r = await c.post(RUTA, json=_alta(rol="freelance", acceso_redes=acceso))

    assert r.status_code == 201, r.text
    assert r.json()["acceso_redes"] is acceso
    guardado = await sesion.scalar(select(Usuario).where(Usuario.email == "lucia@agencia.test"))
    assert guardado is not None
    assert guardado.acceso_redes is acceso
    assert guardado.rol == RolUsuario.freelance


@pytest.mark.parametrize(
    "cuerpo",
    [_alta(rol="superadmin"), _alta(email="no-es-email"), _alta(nombre="")],
)
async def test_rf144_alta_con_datos_invalidos_422_sin_crear_nada(
    cuerpo: CuerpoAlta, cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    c = await cliente_como("admin")

    r = await c.post(RUTA, json=cuerpo)

    assert r.status_code == 422
    assert firebase.cuentas == {}
    assert firebase.mails == []


async def test_rf146_email_duplicado_en_rumbo_409(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await crear(sesion, UsuarioFactory, email="lucia@agencia.test")

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert firebase.cuentas == {}
    assert firebase.mails == []
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 1


async def test_rf146_email_duplicado_en_firebase_409(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    firebase.cuentas["lucia@agencia.test"] = "uid-preexistente"

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert firebase.cuentas == {"lucia@agencia.test": "uid-preexistente"}
    assert firebase.borradas == []
    assert firebase.mails == []
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0


async def test_rf144_falla_firebase_502_sin_usuario(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    firebase.falla_al_crear = True

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 502
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0
    assert firebase.mails == []


async def test_rf144_falla_la_base_despues_de_crear_la_cuenta_se_borra_la_cuenta(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    """La base falla de verdad: la cuenta nueva devuelve un uid que ya tiene otro `Usuario`
    (`firebase_uid` es único), así que el INSERT del alta viola la restricción."""
    c = await cliente_como("admin")
    await crear(sesion, UsuarioFactory, firebase_uid="uid-ocupado")
    firebase.uid_forzado = "uid-ocupado"

    r = await c.post(RUTA, json=_alta())

    assert r.status_code >= 400
    assert firebase.borradas == ["uid-ocupado"]
    assert firebase.cuentas == {}
    assert firebase.mails == []
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0


async def test_rf144_falla_el_envio_del_mail_no_deja_el_alta_a_medias(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    """Supuesto: si Firebase no puede mandar el mail, el alta falla con 502 y se compensa
    (sin Usuario ni cuenta)."""
    c = await cliente_como("admin")
    firebase.falla_al_enviar_mail = True

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 502
    assert firebase.cuentas == {}
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0


async def test_rf144_listar_usuarios_devuelve_el_padron_paginado(
    cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, activo=False)

    r = await c.get(RUTA)

    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert {"items", "total", "pagina", "por_pagina"} <= cuerpo.keys()
    ids = {u["id"] for u in cuerpo["items"]}
    assert {str(c.usuario.id), str(otro.id)} <= ids  # type: ignore[attr-defined]
    assert all("firebase_uid" not in u for u in cuerpo["items"])


async def test_rf144_listar_usuarios_filtra_por_activo(
    cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    baja = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, activo=False)

    r = await c.get(RUTA, params={"activo": "false"})

    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert [u["id"] for u in items] == [str(baja.id)]
    assert all(u["activo"] is False for u in items)


async def test_rf144_obtener_usuario_por_id(
    cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.freelance, acceso_redes=True)

    r = await c.get(f"{RUTA}/{otro.id}")

    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["id"] == str(otro.id)
    assert cuerpo["email"] == otro.email
    assert cuerpo["rol"] == "freelance"
    assert cuerpo["acceso_redes"] is True


async def test_rf144_obtener_usuario_inexistente_404(cliente_como: ClienteComo) -> None:
    c = await cliente_como("dueno")

    r = await c.get(f"{RUTA}/{uuid.uuid4()}")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("rol", ROLES_SIN_ACCESO)
async def test_rf151_listar_usuarios_403_para_roles_sin_gestion(
    rol: str, cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    c = await cliente_como(rol)

    r = await c.get(RUTA)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("rol", ROLES_SIN_ACCESO)
async def test_rf151_obtener_usuario_403_para_roles_sin_gestion(
    rol: str, cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    c = await cliente_como(rol)

    r = await c.get(f"{RUTA}/{c.usuario.id}")  # type: ignore[attr-defined]

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("rol", ROLES_SIN_ACCESO)
async def test_rf151_crear_usuario_403_para_roles_sin_gestion_sin_crear_nada(
    rol: str,
    cliente_como: ClienteComo,
    firebase: GestorDeCuentasFalso,
    sesion: AsyncSession,
) -> None:
    c = await cliente_como(rol)

    r = await c.post(RUTA, json=_alta())

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert firebase.cuentas == {}
    assert firebase.mails == []
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0


async def test_rf146_email_duplicado_en_rumbo_con_mayusculas_409_sin_tocar_firebase(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await crear(sesion, UsuarioFactory, email="Lucia@Agencia.test")

    r = await c.post(RUTA, json=_alta(email="lucia@AGENCIA.test"))

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert firebase.cuentas == {}
    assert firebase.mails == []


class _GestorQueSeCancelaAlEnviarElMail(GestorDeCuentasFalso):
    async def enviar_mail_restablecimiento(self, email: str) -> None:
        raise asyncio.CancelledError


async def test_rf144_cancelacion_despues_de_crear_la_cuenta_la_borra(sesion: AsyncSession) -> None:
    """Si el pedido se cancela (p. ej. el cliente corta) entre la cuenta y el mail, la
    compensación borra la cuenta y la cancelación sigue su curso."""
    actor = await crear(sesion, UsuarioFactory, rol=RolUsuario.admin)
    gestor = _GestorQueSeCancelaAlEnviarElMail()

    with pytest.raises(asyncio.CancelledError):
        await seguridad.crear_usuario(
            sesion,
            actor,
            gestor,
            nombre="Lucía Pérez",
            email="lucia@agencia.test",
            rol=RolUsuario.empleado,
        )

    assert len(gestor.borradas) == 1
    assert gestor.cuentas == {}
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0


# ---------------------------------------------------------------- T-028: editar y dar de baja


async def _recargar(sesion: AsyncSession, usuario: Usuario) -> Usuario:
    await sesion.refresh(usuario)
    return usuario


@pytest.mark.parametrize("quien", ["admin", "dueno"])
async def test_rf147_editar_rol(
    quien: str,
    cliente_como: ClienteComo,
    firebase: GestorDeCuentasFalso,
    sesion: AsyncSession,
) -> None:
    c = await cliente_como(quien)
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, acceso_redes=False)

    r = await c.patch(f"{RUTA}/{otro.id}", json={"rol": "freelance", "acceso_redes": True})

    assert r.status_code == 200, r.text
    cuerpo = r.json()
    assert cuerpo["id"] == str(otro.id)
    assert cuerpo["rol"] == "freelance"
    assert cuerpo["acceso_redes"] is True
    assert "firebase_uid" not in cuerpo
    otro = await _recargar(sesion, otro)
    assert otro.rol == RolUsuario.freelance
    assert otro.acceso_redes is True


async def test_rf147_editar_solo_acceso_redes_no_toca_el_rol(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    """La web manda solo los campos que cambiaron (T-035)."""
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, acceso_redes=False)

    r = await c.patch(f"{RUTA}/{otro.id}", json={"acceso_redes": True})

    assert r.status_code == 200, r.text
    otro = await _recargar(sesion, otro)
    assert otro.rol == RolUsuario.empleado
    assert otro.acceso_redes is True


async def test_rf147_corregir_nombre(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, nombre="Lucia Perez")

    r = await c.patch(f"{RUTA}/{otro.id}", json={"nombre": "Lucía Pérez"})

    assert r.status_code == 200, r.text
    assert r.json()["nombre"] == "Lucía Pérez"
    otro = await _recargar(sesion, otro)
    assert otro.nombre == "Lucía Pérez"
    assert otro.rol == RolUsuario.empleado


@pytest.mark.parametrize(
    "cuerpo", [{"rol": "superadmin"}, {"nombre": ""}, {"acceso_redes": "quizás"}]
)
async def test_rf147_editar_con_datos_invalidos_422(
    cuerpo: dict[str, object],
    cliente_como: ClienteComo,
    firebase: GestorDeCuentasFalso,
    sesion: AsyncSession,
) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado)

    r = await c.patch(f"{RUTA}/{otro.id}", json=cuerpo)

    assert r.status_code == 422
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await _recargar(sesion, otro)).rol == RolUsuario.empleado


async def test_rf147_editar_usuario_inexistente_404(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    c = await cliente_como("dueno")

    r = await c.patch(f"{RUTA}/{uuid.uuid4()}", json={"acceso_redes": True})

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


@pytest.mark.parametrize("rol", ROLES_SIN_ACCESO)
async def test_rf151_editar_y_baja_403_para_roles_sin_gestion(
    rol: str,
    cliente_como: ClienteComo,
    firebase: GestorDeCuentasFalso,
    sesion: AsyncSession,
) -> None:
    c = await cliente_como(rol)
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado)

    r_editar = await c.patch(f"{RUTA}/{otro.id}", json={"rol": "admin"})
    r_baja = await c.post(f"{RUTA}/{otro.id}/baja")

    assert r_editar.status_code == 403
    assert r_baja.status_code == 403
    otro = await _recargar(sesion, otro)
    assert otro.rol == RolUsuario.empleado
    assert otro.activo is True
    assert firebase.deshabilitadas == []


async def test_rf148_baja_logica_deshabilita_cuenta(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado)

    r = await c.post(f"{RUTA}/{otro.id}/baja")

    assert r.status_code == 200, r.text
    assert r.json()["id"] == str(otro.id)
    assert r.json()["activo"] is False
    otro = await _recargar(sesion, otro)
    assert otro.activo is False  # baja lógica: la fila sigue
    assert firebase.deshabilitadas == [otro.firebase_uid]
    assert firebase.borradas == []


async def test_rf148_baja_corta_el_acceso(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    admin = await cliente_como("admin")
    empleado = await cliente_como("empleado")
    assert (await empleado.get("/api/clientes")).status_code != 401  # antes de la baja entraba

    r = await admin.post(f"{RUTA}/{empleado.usuario.id}/baja")  # type: ignore[attr-defined]

    assert r.status_code == 200, r.text
    despues = await empleado.get("/api/clientes")
    assert despues.status_code == 401
    assert despues.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf148_baja_de_usuario_inexistente_404(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso
) -> None:
    c = await cliente_como("dueno")

    r = await c.post(f"{RUTA}/{uuid.uuid4()}/baja")

    assert r.status_code == 404
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf148_falla_firebase_al_deshabilitar_502_y_sigue_activo(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado)
    firebase.falla_al_deshabilitar = True

    r = await c.post(f"{RUTA}/{otro.id}/baja")

    assert r.status_code == 502
    assert (await _recargar(sesion, otro)).activo is True


async def test_rf149_ultimo_admin_409_al_cambiarle_el_rol(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")  # único admin activo

    r = await c.patch(f"{RUTA}/{c.usuario.id}", json={"rol": "empleado"})  # type: ignore[attr-defined]

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await _recargar(sesion, c.usuario)).rol == RolUsuario.admin  # type: ignore[attr-defined]


async def test_rf149_ultimo_admin_409_al_darlo_de_baja(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")

    r = await c.post(f"{RUTA}/{c.usuario.id}/baja")  # type: ignore[attr-defined]

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await _recargar(sesion, c.usuario)).activo is True  # type: ignore[attr-defined]
    assert firebase.deshabilitadas == []


async def test_rf149_ultimo_admin_409_aunque_lo_edite_la_duena(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    """La dueña no cuenta como admin: el único `admin` activo sigue protegido."""
    duena = await cliente_como("dueno")
    admin = await crear(sesion, UsuarioFactory, rol=RolUsuario.admin, activo=True)

    r_rol = await duena.patch(f"{RUTA}/{admin.id}", json={"rol": "empleado"})
    r_baja = await duena.post(f"{RUTA}/{admin.id}/baja")

    assert r_rol.status_code == 409
    assert r_baja.status_code == 409
    admin = await _recargar(sesion, admin)
    assert admin.rol == RolUsuario.admin
    assert admin.activo is True


async def test_rf149_un_admin_dado_de_baja_no_cuenta_como_admin_activo(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await crear(sesion, UsuarioFactory, rol=RolUsuario.admin, activo=False)

    r = await c.post(f"{RUTA}/{c.usuario.id}/baja")  # type: ignore[attr-defined]

    assert r.status_code == 409


async def test_rf149_con_otro_admin_activo_se_puede_bajar_o_cambiar_de_rol(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro_admin = await crear(sesion, UsuarioFactory, rol=RolUsuario.admin, activo=True)
    tercero = await crear(sesion, UsuarioFactory, rol=RolUsuario.admin, activo=True)

    r_rol = await c.patch(f"{RUTA}/{otro_admin.id}", json={"rol": "empleado"})
    r_baja = await c.post(f"{RUTA}/{tercero.id}/baja")

    assert r_rol.status_code == 200, r_rol.text
    assert r_baja.status_code == 200, r_baja.text
    assert (await _recargar(sesion, otro_admin)).rol == RolUsuario.empleado
    assert (await _recargar(sesion, tercero)).activo is False


async def test_rf147_admin_no_puede_crear_ni_asignar_dueno_403(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado)

    r_alta = await c.post(RUTA, json=_alta(rol="dueno"))
    r_editar = await c.patch(f"{RUTA}/{otro.id}", json={"rol": "dueno"})

    assert r_alta.status_code == 403
    assert r_alta.headers["content-type"].startswith(PROBLEM_JSON)
    assert r_editar.status_code == 403
    assert r_editar.headers["content-type"].startswith(PROBLEM_JSON)
    assert firebase.cuentas == {}
    assert firebase.mails == []
    assert await _usuarios_con_email(sesion, "lucia@agencia.test") == 0
    assert (await _recargar(sesion, otro)).rol == RolUsuario.empleado


async def test_rf147_la_duena_puede_crear_y_asignar_dueno(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado)

    r_alta = await c.post(RUTA, json=_alta(rol="dueno"))
    r_editar = await c.patch(f"{RUTA}/{otro.id}", json={"rol": "dueno"})

    assert r_alta.status_code == 201, r_alta.text
    assert r_alta.json()["rol"] == "dueno"
    assert r_editar.status_code == 200, r_editar.text
    assert (await _recargar(sesion, otro)).rol == RolUsuario.dueno


async def test_rf147_admin_edita_a_una_duena_sin_cambiarle_el_rol_no_da_403(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    """Solo asignar el rol `dueno` está reservado: mandar `acceso_redes` o `nombre` a un
    usuario que ya es `dueno` es válido (la web manda solo lo que cambió)."""
    c = await cliente_como("admin")
    duena = await crear(
        sesion, UsuarioFactory, rol=RolUsuario.dueno, acceso_redes=False, nombre="Ana"
    )

    r = await c.patch(f"{RUTA}/{duena.id}", json={"acceso_redes": True, "nombre": "Ana María"})

    assert r.status_code == 200, r.text
    duena = await _recargar(sesion, duena)
    assert duena.rol == RolUsuario.dueno
    assert duena.acceso_redes is True
    assert duena.nombre == "Ana María"


async def test_rf147_admin_no_puede_quitar_rol_dueno_403(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    duena = await crear(sesion, UsuarioFactory, rol=RolUsuario.dueno, activo=True)

    r = await c.patch(f"{RUTA}/{duena.id}", json={"rol": "empleado"})

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await _recargar(sesion, duena)).rol == RolUsuario.dueno


async def test_rf148_admin_no_puede_dar_de_baja_a_una_duena_403(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    duena = await crear(sesion, UsuarioFactory, rol=RolUsuario.dueno, activo=True)

    r = await c.post(f"{RUTA}/{duena.id}/baja")

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await _recargar(sesion, duena)).activo is True
    assert firebase.deshabilitadas == []


async def test_rf147_la_duena_puede_quitar_rol_dueno_y_dar_de_baja_a_otra_duena(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    otra = await crear(sesion, UsuarioFactory, rol=RolUsuario.dueno, activo=True)
    tercera = await crear(sesion, UsuarioFactory, rol=RolUsuario.dueno, activo=True)

    r_rol = await c.patch(f"{RUTA}/{otra.id}", json={"rol": "empleado"})
    r_baja = await c.post(f"{RUTA}/{tercera.id}/baja")

    assert r_rol.status_code == 200, r_rol.text
    assert r_baja.status_code == 200, r_baja.text
    assert (await _recargar(sesion, otra)).rol == RolUsuario.empleado
    assert (await _recargar(sesion, tercera)).activo is False
    assert firebase.deshabilitadas == [tercera.firebase_uid]


async def test_rf147_admin_reenvia_rol_dueno_sin_cambio_no_da_403(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    duena = await crear(sesion, UsuarioFactory, rol=RolUsuario.dueno, acceso_redes=False)

    r = await c.patch(f"{RUTA}/{duena.id}", json={"rol": "dueno", "acceso_redes": True})

    assert r.status_code == 200, r.text
    duena = await _recargar(sesion, duena)
    assert duena.rol == RolUsuario.dueno
    assert duena.acceso_redes is True


async def test_rf147_admin_no_puede_autoasignarse_dueno_403(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await crear(sesion, UsuarioFactory, rol=RolUsuario.admin, activo=True)

    r = await c.patch(f"{RUTA}/{c.usuario.id}", json={"rol": "dueno"})  # type: ignore[attr-defined]

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await _recargar(sesion, c.usuario)).rol == RolUsuario.admin  # type: ignore[attr-defined]


async def test_rf147_patch_mixto_con_rol_dueno_de_un_admin_403_no_cambia_el_nombre(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, nombre="Lucia Perez")

    r = await c.patch(f"{RUTA}/{otro.id}", json={"nombre": "Lucía Pérez", "rol": "dueno"})

    assert r.status_code == 403
    otro = await _recargar(sesion, otro)
    assert otro.nombre == "Lucia Perez"
    assert otro.rol == RolUsuario.empleado


async def test_rf149_autobaja_del_unico_admin_409(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, activo=True)

    r = await c.post(f"{RUTA}/{c.usuario.id}/baja")  # type: ignore[attr-defined]

    assert r.status_code == 409
    assert r.headers["content-type"].startswith(PROBLEM_JSON)
    assert (await _recargar(sesion, c.usuario)).activo is True  # type: ignore[attr-defined]
    assert firebase.deshabilitadas == []


async def test_rf149_admin_se_baja_de_rol_con_otro_admin_activo_200(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    await crear(sesion, UsuarioFactory, rol=RolUsuario.admin, activo=True)

    r = await c.patch(f"{RUTA}/{c.usuario.id}", json={"rol": "empleado"})  # type: ignore[attr-defined]

    assert r.status_code == 200, r.text
    assert r.json()["rol"] == "empleado"
    assert (await _recargar(sesion, c.usuario)).rol == RolUsuario.empleado  # type: ignore[attr-defined]


async def test_rf148_baja_de_un_usuario_ya_inactivo_es_idempotente(
    cliente_como: ClienteComo, firebase: GestorDeCuentasFalso, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    otro = await crear(sesion, UsuarioFactory, rol=RolUsuario.empleado, activo=False)

    r = await c.post(f"{RUTA}/{otro.id}/baja")

    assert r.status_code == 200, r.text
    assert r.json()["activo"] is False
    assert (await _recargar(sesion, otro)).activo is False


# --- T-046 (fix de la review): candidatos a asesor del cliente (RF-007, RF-151) ----------------

RUTA_ASESORES = "/api/usuarios/asesores"


@pytest.mark.parametrize("quien", ["admin", "dueno", "empleado"])
async def test_rf007_asesores_lo_leen_admin_dueno_y_empleado(
    quien: str, cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como(quien)
    otro = await crear(sesion, UsuarioFactory, nombre="Laura Asesora", activo=True)

    r = await c.get(RUTA_ASESORES)

    assert r.status_code == 200, r.text
    ids = {a["id"] for a in r.json()}
    assert {str(otro.id), str(c.usuario.id)} <= ids  # type: ignore[attr-defined]


async def test_rf151_asesores_el_freelance_recibe_403(cliente_como: ClienteComo) -> None:
    c = await cliente_como("freelance")

    r = await c.get(RUTA_ASESORES)

    assert r.status_code == 403
    assert r.headers["content-type"].startswith(PROBLEM_JSON)


async def test_rf007_asesores_sin_sesion_401(cliente_sin_sesion: AsyncClient) -> None:
    r = await cliente_sin_sesion.get(RUTA_ASESORES)

    assert r.status_code == 401


async def test_rf007_asesores_trae_solo_id_y_nombre(
    cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como("empleado")
    await crear(sesion, UsuarioFactory, nombre="Laura Asesora", activo=True)

    r = await c.get(RUTA_ASESORES)

    assert r.status_code == 200, r.text
    assert r.json()
    assert all(set(a) == {"id", "nombre"} for a in r.json())


async def test_rf007_asesores_excluye_a_los_usuarios_de_baja(
    cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    baja = await crear(sesion, UsuarioFactory, nombre="Beatriz Baja", activo=False)
    activo = await crear(sesion, UsuarioFactory, nombre="Laura Asesora", activo=True)

    r = await c.get(RUTA_ASESORES)

    assert r.status_code == 200, r.text
    ids = [a["id"] for a in r.json()]
    assert str(activo.id) in ids
    assert str(baja.id) not in ids


async def test_rf007_asesores_ordenados_por_nombre(
    cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como("dueno")
    zulema = await crear(sesion, UsuarioFactory, nombre="Zulema Zapata", activo=True)
    abel = await crear(sesion, UsuarioFactory, nombre="Abel Aguirre", activo=True)

    r = await c.get(RUTA_ASESORES)

    assert r.status_code == 200, r.text
    ids = [a["id"] for a in r.json()]
    assert ids.index(str(abel.id)) < ids.index(str(zulema.id))


async def test_rf007_asesores_incluye_todos_los_roles_activos(
    cliente_como: ClienteComo, sesion: AsyncSession
) -> None:
    c = await cliente_como("admin")
    creados = [
        await crear(sesion, UsuarioFactory, rol=RolUsuario(rol), activo=True)
        for rol in ("admin", "dueno", "empleado", "freelance")
    ]

    r = await c.get(RUTA_ASESORES)

    assert r.status_code == 200, r.text
    assert {str(u.id) for u in creados} <= {a["id"] for a in r.json()}
