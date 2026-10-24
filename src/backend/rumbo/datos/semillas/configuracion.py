"""Semilla de demo de M1 (T-038): destinos con requisitos, operadores y usuarios ficticios."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos.modelos import (
    Destino,
    Operador,
    RequisitoDestino,
    RolUsuario,
    TipoRequisito,
    Usuario,
)
from rumbo.datos.modelos.base import nombre_normalizado
from rumbo.datos.repositorios.base import normalizar
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios

_usuarios = RepositorioUsuarios()

# (nombre, país, región, [(requisito, tipo, obligatorio, anticipación en días)])
_DESTINOS = [
    (
        "Cancún",
        "México",
        "Caribe",
        [
            ("Pasaporte vigente", TipoRequisito.documentacion, True, 30),
            ("Seguro de viaje", TipoRequisito.seguro, False, 7),
        ],
    ),
    (
        "Bariloche",
        "Argentina",
        "Patagonia",
        [("DNI vigente", TipoRequisito.documentacion, True, 0)],
    ),
    (
        "Nueva York",
        "Estados Unidos",
        "Costa Este",
        [
            ("Visa de turista", TipoRequisito.visa, True, 90),
            ("Formulario ESTA", TipoRequisito.formulario, False, 15),
        ],
    ),
]

_OPERADORES = [
    ("Mayorista Demo Sur", "contacto@mayorista-sur.rumbo.test"),
    ("Operadora Demo Caribe", "ventas@operadora-caribe.rumbo.test"),
]

# Datos para los módulos siguientes: el `firebase_uid` es ficticio y no existe en Firebase,
# así que estos usuarios no pueden iniciar sesión.
_USUARIOS = [
    ("Empleada de Demo", "empleada.demo@rumbo.test", "uid-demo-empleada", RolUsuario.empleado),
    ("Freelance de Demo", "freelance.demo@rumbo.test", "uid-demo-freelance", RolUsuario.freelance),
]


# Destinos y operadores se buscan como los índices únicos (sin tildes ni mayúsculas, con
# inactivos): así la semilla no choca con un nombre ya cargado de otra forma.
async def sembrar_configuracion(sesion: AsyncSession) -> None:
    """Carga los datos de demo de Configuración, idempotente."""
    for nombre, pais, region, requisitos in _DESTINOS:
        destino = await sesion.scalar(
            select(Destino).where(nombre_normalizado(Destino.nombre) == normalizar(nombre))
        )
        if destino:
            continue
        destino = Destino(nombre=nombre, pais=pais, region=region)
        sesion.add(destino)
        await sesion.flush()
        sesion.add_all(
            RequisitoDestino(
                destino_id=destino.id,
                nombre=requisito,
                tipo=tipo,
                obligatorio=obligatorio,
                anticipacion_dias=anticipacion,
            )
            for requisito, tipo, obligatorio, anticipacion in requisitos
        )
    for nombre, contacto in _OPERADORES:
        if not await sesion.scalar(
            select(Operador).where(nombre_normalizado(Operador.nombre) == normalizar(nombre))
        ):
            sesion.add(Operador(nombre=nombre, contacto=contacto))
    for nombre, email, firebase_uid, rol in _USUARIOS:
        existente = await _usuarios.buscar_por_firebase_uid(
            sesion, firebase_uid
        ) or await _usuarios.buscar_por_email(sesion, email)
        if not existente:
            sesion.add(Usuario(nombre=nombre, email=email, firebase_uid=firebase_uid, rol=rol))
    await sesion.flush()
