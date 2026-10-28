"""Semilla de demo de M5 (T-085): hoteles y reseñas ficticios."""

from datetime import timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import Destino, EstadoResena, Hotel, Resena
from rumbo.datos.modelos.base import nombre_normalizado
from rumbo.datos.repositorios.base import normalizar
from rumbo.datos.repositorios.clientes import RepositorioClientes

_clientes = RepositorioClientes()

# (destino, nombre, categoría, precio por noche en ARS, servicios, reseñas). Cada reseña es
# (contacto del cliente, puntaje, comentario, días atrás, motivo de baja o None). Con motivo la
# reseña nace `oculta`: sirve para mostrar la moderación (CU-29).
_HOTELES = [
    (
        "Cancún",
        "Hotel Demo Playa Caribe",
        "5 estrellas",
        "210000.00",
        ["pileta", "desayuno incluido", "wifi", "spa"],
        [
            ("familia.perez@rumbo.test", 5, "Excelente atención y playa privada.", 40, None),
            ("+54 9 11 5555-0102", 5, "Una luna de miel inolvidable.", 25, None),
        ],
    ),
    (
        "Cancún",
        "Hostal Demo Centro",
        "2 estrellas",
        "48000.00",
        ["wifi"],
        [
            ("lucia.gomez@rumbo.test", 3, "Limpio y bien ubicado, pero ruidoso.", 30, None),
            ("+54 9 11 5555-0101", 2, "Comentario con datos de otra persona.", 20, "Datos ajenos"),
        ],
    ),
    (
        "Bariloche",
        "Hotel Demo Lago Nahuel",
        "4 estrellas",
        "135000.00",
        ["pileta", "desayuno incluido", "wifi", "estacionamiento"],
        [
            ("familia.perez@rumbo.test", 4, "Vista al lago y desayuno abundante.", 60, None),
            ("+54 9 11 5555-0101", 4, "Muy buen servicio para el grupo.", 55, None),
        ],
    ),
    (
        "Bariloche",
        "Cabañas Demo del Bosque",
        "3 estrellas",
        "88000.00",
        ["wifi", "estacionamiento", "apto mascotas"],
        [],
    ),
    (
        "Nueva York",
        "Hotel Demo Midtown",
        "4 estrellas",
        "260000.00",
        ["wifi", "desayuno incluido"],
        [],
    ),
]


# Se busca por destino y nombre, sin tildes ni mayúsculas, como el índice único (RF-099): un hotel
# ya cargado, aunque la agencia lo haya editado o cerrado, no se vuelve a crear ni se le suman
# reseñas.
async def sembrar_hoteles(sesion: AsyncSession) -> None:
    """Carga los hoteles de demo con sus reseñas, idempotente. Corre después de la configuración,
    de la que toma los destinos, y de la de clientes, de la que toma a quienes reseñan. Las fechas
    de las reseñas son relativas al día en que corre."""
    for nombre_destino, nombre, categoria, precio, servicios, resenas in _HOTELES:
        destino = await sesion.scalar(
            select(Destino).where(nombre_normalizado(Destino.nombre) == normalizar(nombre_destino))
        )
        if destino is None:
            continue
        existente = await sesion.scalar(
            select(Hotel.id).where(
                Hotel.destino_id == destino.id,
                nombre_normalizado(Hotel.nombre) == normalizar(nombre),
            )
        )
        if existente is not None:
            continue
        hotel = Hotel(
            destino_id=destino.id,
            nombre=nombre,
            categoria=categoria,
            precio_referencia=Decimal(precio),
            servicios=list(servicios),
        )
        sesion.add(hotel)
        await sesion.flush()
        for contacto, puntaje, comentario, dias_atras, motivo_baja in resenas:
            cliente = await _clientes.buscar_por_contacto(sesion, contacto=contacto, asesor_id=None)
            if cliente is None:
                continue
            sesion.add(
                Resena(
                    hotel_id=hotel.id,
                    cliente_id=cliente.id,
                    puntaje=puntaje,
                    comentario=comentario,
                    fecha=hoy() - timedelta(days=dias_atras),
                    estado=EstadoResena.oculta if motivo_baja else EstadoResena.publicada,
                    motivo_baja=motivo_baja,
                )
            )
        await sesion.flush()
