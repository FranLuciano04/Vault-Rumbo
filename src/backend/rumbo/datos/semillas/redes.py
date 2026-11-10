"""Semilla de demo del módulo redes (T-134): piezas de contenido ficticias en el tablero."""

from datetime import timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos.modelos import CanalContenido, ContenidoRed, EstadoKanban
from rumbo.datos.repositorios.contenidos import RepositorioContenidos
from rumbo.datos.repositorios.seguridad import RepositorioUsuarios

_contenidos = RepositorioContenidos()
_usuarios = RepositorioUsuarios()

# (título, texto, canal, estado del tablero, días desde hoy)
_PIEZAS = [
    (
        "Demo: ideas para una escapada de invierno",
        "Tres destinos con nieve para viajar en grupo.",
        CanalContenido.instagram,
        EstadoKanban.idea,
        6,
    ),
    (
        "Demo: tips para armar la valija",
        "Qué llevar y qué dejar en casa en un viaje de una semana.",
        CanalContenido.tiktok,
        EstadoKanban.idea,
        8,
    ),
    (
        "Demo: reel del Caribe en temporada baja",
        "Playas tranquilas y tarifas más convenientes.",
        CanalContenido.instagram,
        EstadoKanban.en_produccion,
        3,
    ),
    (
        "Demo: oferta de paquetes a Bariloche",
        "Aprovechá las últimas plazas para vacaciones de invierno.",
        CanalContenido.whatsapp_ventas,
        EstadoKanban.listo,
        2,
    ),
    (
        "Demo: itinerario de 5 días en Mendoza",
        "Bodegas, montaña y buena mesa en una sola escapada.",
        CanalContenido.instagram,
        EstadoKanban.publicado,
        -4,
    ),
    (
        "Demo: cómo elegir un seguro de viaje",
        "Lo que tenés que revisar antes de contratar la cobertura.",
        CanalContenido.tiktok,
        EstadoKanban.publicado,
        -9,
    ),
    (
        "Demo: promo de último momento descartada",
        "Se descartó por falta de cupos confirmados.",
        CanalContenido.whatsapp_ventas,
        EstadoKanban.descartado,
        -2,
    ),
]


# Se busca por título y responsable: una pieza ya cargada, aunque la agencia la haya movido de
# columna, no se vuelve a crear ni se pisa.
async def sembrar_redes(sesion: AsyncSession) -> None:
    """Carga las piezas de demo del tablero de redes, idempotente. Quedan a nombre de la dueña,
    que tiene acceso a redes (DEC-0013); si todavía no existe, no carga nada. Las fechas se
    calculan respecto del día en que corre y quedan fijas."""
    responsable = await _usuarios.primera_duena_activa(sesion)
    if responsable is None:
        return
    for titulo, texto, canal, estado, dias in _PIEZAS:
        if await _contenidos.existe_de_usuario(sesion, usuario_id=responsable.id, titulo=titulo):
            continue
        sesion.add(
            ContenidoRed(
                usuario_id=responsable.id,
                titulo=titulo,
                texto=texto,
                canal=canal,
                estado_kanban=estado,
                fecha_publicacion=hoy() + timedelta(days=dias),
            )
        )
        await sesion.flush()
