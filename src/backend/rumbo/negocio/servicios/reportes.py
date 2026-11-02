"""Servicio de reportes: el catálogo de CU-22 y su generación en filas, calculadas en vivo
(RF-131, RF-132, RF-134, RF-135). Mismas reglas que el dashboard (DEC-0024): período inclusivo y por
`created_at` del viaje, venta = viaje no cancelado, cobrado por `fecha_cobro`, pendiente = foto de
hoy y comisión al vendedor."""

from collections import defaultdict
from collections.abc import Awaitable, Callable
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Literal, NamedTuple

from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.errores import DatosInvalidos, NoEncontrado
from rumbo.core.fechas import hoy, limites_del_dia, sumar_meses
from rumbo.datos.modelos import Moneda, Usuario
from rumbo.datos.repositorios.base import Visibilidad
from rumbo.datos.repositorios.dashboard import (
    RepositorioDashboard,
    VentaAgrupada,
    VentaDelPeriodo,
)
from rumbo.negocio.politicas import visibilidad
from rumbo.negocio.servicios.dashboard import por_vendedor

_dashboard = RepositorioDashboard()

Fila = dict[str, str | int | None]
Totales = dict[Moneda, Decimal]
TipoColumna = Literal["texto", "entero", "importe"]


class Columna(NamedTuple):
    clave: str
    titulo: str
    tipo: TipoColumna
    moneda: Moneda | None = None


class Periodo(NamedTuple):
    desde: date
    hasta: date

    @property
    def inicio(self) -> datetime:
        return limites_del_dia(self.desde)[0]

    @property
    def fin(self) -> datetime:
        """Primer instante después del período (el extremo `hasta` es inclusivo)."""
        return limites_del_dia(self.hasta)[1]


Generador = Callable[[AsyncSession, Visibilidad, Periodo], Awaitable[list[Fila]]]


class DefinicionReporte(NamedTuple):
    id: str
    nombre: str
    descripcion: str
    columnas: list[Columna]
    generar: Generador


class ReporteGenerado(NamedTuple):
    definicion: DefinicionReporte
    periodo: Periodo
    comparado: Periodo | None
    filas: list[Fila]
    filas_comparadas: list[Fila] | None


def _col_importes(base: str, titulo: str) -> list[Columna]:
    return [
        Columna(f"{base}_{m.value.lower()}", f"{titulo} ({m.value})", "importe", m) for m in Moneda
    ]


def _importes(base: str, totales: Totales) -> Fila:
    """Una columna de importe por moneda, con 0,00 en las que no tuvieron movimiento."""
    return {f"{base}_{m.value.lower()}": f"{totales.get(m, Decimal(0)):.2f}" for m in Moneda}


def _sumar(grupos: list[VentaAgrupada]) -> Totales:
    totales: Totales = defaultdict(Decimal)
    for g in grupos:
        totales[g.moneda] += g.ventas
    return totales


# --- Generadores: una lista vacía es "sin datos" (CU-22 A3) ---------------------------------


async def _viajes_vendidos(
    sesion: AsyncSession, vista: Visibilidad, p: Periodo
) -> list[VentaDelPeriodo]:
    return await _dashboard.ventas(
        sesion, desde=p.inicio, hasta=p.fin, responsable_id=None, visibilidad=vista
    )


async def _ventas(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    viajes = await _viajes_vendidos(sesion, vista, p)
    if not viajes:
        return []
    ventas: Totales = defaultdict(Decimal)
    for v in viajes:
        ventas[v.moneda] += v.precio_venta
    return [{"viajes": len(viajes), **_importes("ventas", ventas)}]


async def _ganancia(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    viajes = await _viajes_vendidos(sesion, vista, p)
    if not viajes:
        return []
    ganancia: Totales = defaultdict(Decimal)
    for v in viajes:
        ganancia[v.moneda] += v.ganancia
    return [_importes("ganancia", ganancia)]


async def _cobranzas(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    cobrado = await _dashboard.cobrado(
        sesion, desde=p.desde, hasta=p.hasta, responsable_id=None, visibilidad=vista
    )
    pendiente = await _dashboard.pendiente_de_cobrar(sesion, responsable_id=None, visibilidad=vista)
    if not cobrado and not pendiente:
        return []
    return [{**_importes("cobrado", cobrado), **_importes("pendiente", pendiente)}]


async def _pagos_operadores(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    por_pagar = await _dashboard.pendiente_de_pagar(sesion, responsable_id=None, visibilidad=vista)
    return [_importes("pendiente", por_pagar)] if por_pagar else []


async def _ventas_agrupadas(
    sesion: AsyncSession, vista: Visibilidad, p: Periodo, por: Literal["destino", "operador"]
) -> list[Fila]:
    grupos = await _dashboard.ventas_agrupadas(
        sesion, por=por, desde=p.inicio, hasta=p.fin, responsable_id=None, visibilidad=vista
    )
    por_nombre: dict[str, list[VentaAgrupada]] = defaultdict(list)
    for g in grupos:
        por_nombre[g.nombre].append(g)
    filas: list[Fila] = []
    for nombre, items in por_nombre.items():
        fila: Fila = {por: nombre, "viajes": sum(g.viajes for g in items)}
        if por == "destino":
            fila["pasajeros"] = sum(g.pasajeros for g in items)
        filas.append({**fila, **_importes("ventas", _sumar(items))})
    return filas


async def _ventas_por_destino(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    return await _ventas_agrupadas(sesion, vista, p, "destino")


async def _ventas_por_operador(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    return await _ventas_agrupadas(sesion, vista, p, "operador")


async def _ventas_por_vendedor(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    viajes = await _viajes_vendidos(sesion, vista, p)
    return [
        {
            "vendedor": v.vendedor_nombre,
            "viajes": v.viajes,
            **_importes("ventas", v.ventas),
            **_importes("comisiones", v.comisiones),
        }
        for v in por_vendedor(viajes)
    ]


async def _pasajeros(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    grupos = await _dashboard.ventas_agrupadas(
        sesion, por="destino", desde=p.inicio, hasta=p.fin, responsable_id=None, visibilidad=vista
    )
    return [{"pasajeros": sum(g.pasajeros for g in grupos)}] if grupos else []


async def _formas_de_pago(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    cobros = await _dashboard.cobrado_por_forma(
        sesion, desde=p.desde, hasta=p.hasta, responsable_id=None, visibilidad=vista
    )
    pagos: dict[str, int] = defaultdict(int)
    montos: dict[str, Totales] = defaultdict(lambda: defaultdict(Decimal))
    for c in cobros:
        pagos[c.forma_pago.value] += c.pagos
        montos[c.forma_pago.value][c.moneda] += c.monto
    return [
        {"forma_pago": forma, "pagos": pagos[forma], **_importes("monto", montos[forma])}
        for forma in pagos
    ]


async def _comparacion_mensual(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    """Ventas por mes calendario de los viajes del período."""
    por_mes = await _dashboard.ventas_por_mes(
        sesion, desde=p.inicio, hasta=p.fin, responsable_id=None, visibilidad=vista
    )
    meses = sorted({mes for mes, _ in por_mes})
    return [
        {
            "mes": f"{mes:%Y-%m}",
            **_importes("ventas", {m: t for (dia, m), t in por_mes.items() if dia == mes}),
        }
        for mes in meses
    ]


_DEFINICIONES = [
    DefinicionReporte(
        "ventas",
        "Ventas del período",
        "Cantidad de viajes vendidos y total vendido por moneda.",
        [Columna("viajes", "Viajes", "entero"), *_col_importes("ventas", "Ventas")],
        _ventas,
    ),
    DefinicionReporte(
        "ganancia",
        "Ganancia del período",
        "Ganancia (venta menos costo) de los viajes vendidos, por moneda.",
        _col_importes("ganancia", "Ganancia"),
        _ganancia,
    ),
    DefinicionReporte(
        "cobranzas",
        "Cobranzas",
        "Lo cobrado en el período y lo pendiente de cobrar hoy, por moneda.",
        [*_col_importes("cobrado", "Cobrado"), *_col_importes("pendiente", "Pendiente de cobrar")],
        _cobranzas,
    ),
    DefinicionReporte(
        "pagos-operadores",
        "Pagos a operadores pendientes",
        "Costo de los viajes con algún tramo de hotel sin pagar al proveedor, por moneda (hoy).",
        _col_importes("pendiente", "Pendiente de pagar"),
        _pagos_operadores,
    ),
    DefinicionReporte(
        "ventas-por-destino",
        "Ventas por destino",
        "Viajes, pasajeros y total vendido de cada destino.",
        [
            Columna("destino", "Destino", "texto"),
            Columna("viajes", "Viajes", "entero"),
            Columna("pasajeros", "Pasajeros", "entero"),
            *_col_importes("ventas", "Ventas"),
        ],
        _ventas_por_destino,
    ),
    DefinicionReporte(
        "ventas-por-operador",
        "Ventas por operador",
        "Viajes y total vendido de cada operador.",
        [
            Columna("operador", "Operador", "texto"),
            Columna("viajes", "Viajes", "entero"),
            *_col_importes("ventas", "Ventas"),
        ],
        _ventas_por_operador,
    ),
    DefinicionReporte(
        "ventas-por-vendedor",
        "Ventas por vendedor",
        "Viajes, total vendido y comisiones de cada vendedor.",
        [
            Columna("vendedor", "Vendedor", "texto"),
            Columna("viajes", "Viajes", "entero"),
            *_col_importes("ventas", "Ventas"),
            *_col_importes("comisiones", "Comisiones"),
        ],
        _ventas_por_vendedor,
    ),
    DefinicionReporte(
        "pasajeros",
        "Pasajeros",
        "Pasajeros de los viajes vendidos en el período.",
        [Columna("pasajeros", "Pasajeros", "entero")],
        _pasajeros,
    ),
    DefinicionReporte(
        "formas-de-pago",
        "Formas de pago",
        "Cantidad y monto de los cobros del período, por forma de pago y moneda.",
        [
            Columna("forma_pago", "Forma de pago", "texto"),
            Columna("pagos", "Pagos", "entero"),
            *_col_importes("monto", "Monto"),
        ],
        _formas_de_pago,
    ),
    DefinicionReporte(
        "comparacion-mensual",
        "Comparación mensual",
        "Ventas de cada mes del período, para compararlas con otro período.",
        [Columna("mes", "Mes", "texto"), *_col_importes("ventas", "Ventas")],
        _comparacion_mensual,
    ),
]


def catalogo() -> list[DefinicionReporte]:
    return _DEFINICIONES


async def generar_reporte(
    sesion: AsyncSession,
    actor: Usuario,
    reporte_id: str,
    *,
    desde: date | None,
    hasta: date | None,
    comparar_desde: date | None,
    comparar_hasta: date | None,
) -> ReporteGenerado:
    """Genera el reporte `reporte_id` del período (sin él, el mes en curso) y, si se piden los dos
    extremos, el del período de comparación. Un período sin datos da filas vacías (A3); un
    período invertido o una comparación a medias, `DatosInvalidos`."""
    definicion = next((d for d in _DEFINICIONES if d.id == reporte_id), None)
    if definicion is None:
        raise NoEncontrado(f"Reporte {reporte_id} no encontrado")
    primero_del_mes = hoy().replace(day=1)
    periodo = Periodo(
        desde or primero_del_mes, hasta or sumar_meses(primero_del_mes, 1) - timedelta(days=1)
    )
    _validar(periodo, "hasta")
    if (comparar_desde is None) != (comparar_hasta is None):
        campo = "comparar_hasta" if comparar_hasta is None else "comparar_desde"
        raise DatosInvalidos(campo, "La comparación necesita las dos fechas.")
    comparado = None
    if comparar_desde is not None and comparar_hasta is not None:
        comparado = Periodo(comparar_desde, comparar_hasta)
        _validar(comparado, "comparar_hasta")
    vista = visibilidad(actor)
    filas = await definicion.generar(sesion, vista, periodo)
    filas_comparadas = (
        None if comparado is None else await definicion.generar(sesion, vista, comparado)
    )
    return ReporteGenerado(definicion, periodo, comparado, filas, filas_comparadas)


def _validar(periodo: Periodo, campo: str) -> None:
    if periodo.desde > periodo.hasta:
        raise DatosInvalidos(campo, "La fecha final no puede ser anterior a la inicial.")
