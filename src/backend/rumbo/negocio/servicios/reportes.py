"""Servicio de reportes: el catálogo de CU-22 y su generación en filas, calculadas en vivo
(RF-131, RF-132, RF-134, RF-135). Mismas reglas que el dashboard (DEC-0024): período inclusivo y por
`created_at` del viaje, venta = viaje no cancelado, cobrado por `fecha_cobro`, pendiente = foto de
hoy y comisión al vendedor."""

import uuid
from collections import defaultdict
from collections.abc import Awaitable, Callable
from datetime import date, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
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
SIN_ESPECIFICAR = "Sin especificar"
_CENTESIMA = Decimal("0.01")


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
    meses_por_defecto: int = 1  # sin fechas, el período son estos meses hasta el mes en curso
    comparable: bool = True  # `False`: foto de hoy, no admite período de comparación
    generar_comparada: Generador | None = None  # si el período comparado se arma distinto


class ReporteGenerado(NamedTuple):
    definicion: DefinicionReporte
    periodo: Periodo
    comparado: Periodo | None
    filas: list[Fila]
    filas_comparadas: list[Fila] | None


def es_porcentaje(columna: Columna) -> bool:
    """Las columnas `margen_*` son un % (texto en el JSON); los documentos lo formatean."""
    return columna.clave.startswith("margen_")


def es_mes(columna: Columna) -> bool:
    """La columna `mes` es `AAAA-MM` en el JSON; los documentos la muestran como `mm/aa`."""
    return columna.clave == "mes"


def _col_importes(base: str, titulo: str) -> list[Columna]:
    return [
        Columna(f"{base}_{m.value.lower()}", f"{titulo} ({m.value})", "importe", m) for m in Moneda
    ]


def _importes(base: str, totales: Totales) -> Fila:
    """Una columna de importe por moneda, con 0,00 en las que no tuvieron movimiento."""
    return {f"{base}_{m.value.lower()}": f"{totales.get(m, Decimal(0)):.2f}" for m in Moneda}


def _porcentaje(parte: Decimal, total: Decimal) -> str:
    """`parte` sobre `total` en %, con 2 decimales; 0,00 si `total` es 0."""
    if total == 0:
        return "0.00"
    return f"{(parte * 100 / total).quantize(_CENTESIMA, rounding=ROUND_HALF_UP):.2f}"


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
    ventas: Totales = defaultdict(Decimal)
    ganancia: Totales = defaultdict(Decimal)
    for v in viajes:
        ventas[v.moneda] += v.precio_venta
        ganancia[v.moneda] += v.ganancia
    margen = {f"margen_{m.value.lower()}": _porcentaje(ganancia[m], ventas[m]) for m in Moneda}
    return [{**_importes("ganancia", ganancia), **margen}]


async def _cobrado(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> Totales:
    return await _dashboard.cobrado(
        sesion, desde=p.desde, hasta=p.hasta, responsable_id=None, visibilidad=vista
    )


async def _cobranzas(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    cobrado = await _cobrado(sesion, vista, p)
    pendiente = await _dashboard.pendiente_de_cobrar(sesion, responsable_id=None, visibilidad=vista)
    if not cobrado and not pendiente:
        return []
    return [{**_importes("cobrado", cobrado), **_importes("pendiente", pendiente)}]


async def _cobranzas_comparada(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    """Lo pendiente es la foto de hoy y no tiene sentido en otro período: va en 0,00."""
    cobrado = await _cobrado(sesion, vista, p)
    if not cobrado:
        return []
    return [{**_importes("cobrado", cobrado), **_importes("pendiente", {})}]


async def _pagos_operadores(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    pagado = await _dashboard.pagado_a_operadores(sesion, responsable_id=None, visibilidad=vista)
    pendiente = await _dashboard.pendiente_de_pagar(sesion, responsable_id=None, visibilidad=vista)
    if not pagado and not pendiente:
        return []
    return [{**_importes("pagado", pagado), **_importes("pendiente", pendiente)}]


async def _ventas_agrupadas(
    sesion: AsyncSession, vista: Visibilidad, p: Periodo, por: Literal["destino", "operador"]
) -> list[Fila]:
    grupos = await _dashboard.ventas_agrupadas(
        sesion, por=por, desde=p.inicio, hasta=p.fin, responsable_id=None, visibilidad=vista
    )
    por_grupo: dict[uuid.UUID | None, list[VentaAgrupada]] = defaultdict(list)
    for g in grupos:
        por_grupo[g.grupo_id].append(g)
    filas: list[Fila] = []
    for items in por_grupo.values():
        fila: Fila = {por: items[0].nombre, "viajes": sum(g.viajes for g in items)}
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
        forma = c.forma_pago.value if c.forma_pago else SIN_ESPECIFICAR
        pagos[forma] += c.pagos
        montos[forma][c.moneda] += c.monto
    return [
        {"forma_pago": forma, "pagos": pagos[forma], **_importes("monto", montos[forma])}
        for forma in pagos
    ]


async def _comparacion_mensual(sesion: AsyncSession, vista: Visibilidad, p: Periodo) -> list[Fila]:
    """Ventas de cada mes calendario del período, con 0,00 en los meses sin ventas; sin ninguna
    venta en todo el período, sin filas (A3)."""
    por_mes = await _dashboard.ventas_por_mes(
        sesion, desde=p.inicio, hasta=p.fin, responsable_id=None, visibilidad=vista
    )
    if not por_mes:
        return []
    filas: list[Fila] = []
    mes = p.desde.replace(day=1)
    while mes <= p.hasta:
        ventas = {m: t for (dia, m), t in por_mes.items() if dia == mes}
        filas.append({"mes": f"{mes:%Y-%m}", **_importes("ventas", ventas)})
        mes = sumar_meses(mes, 1)
    return filas


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
        "Ganancia (venta menos costo) y margen (% de la venta) de los viajes vendidos, por moneda.",
        [
            *_col_importes("ganancia", "Ganancia"),
            *(
                Columna(f"margen_{m.value.lower()}", f"Margen % ({m.value})", "texto", m)
                for m in Moneda
            ),
        ],
        _ganancia,
    ),
    DefinicionReporte(
        "cobranzas",
        "Cobranzas",
        "Lo cobrado en el período y lo pendiente de cobrar al día de hoy, por moneda. Al "
        "comparar períodos, lo pendiente solo figura en el principal (en el comparado va 0,00).",
        [*_col_importes("cobrado", "Cobrado"), *_col_importes("pendiente", "Pendiente de cobrar")],
        _cobranzas,
        generar_comparada=_cobranzas_comparada,
    ),
    DefinicionReporte(
        "pagos-operadores",
        "Pagos a operadores",
        "Costo de los viajes ya pagado y todavía pendiente de pagar al proveedor, al día de hoy "
        "y por moneda; no depende del período ni se compara.",
        [*_col_importes("pagado", "Pagado"), *_col_importes("pendiente", "Pendiente de pagar")],
        _pagos_operadores,
        comparable=False,
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
        "Viajes y total vendido de cada operador (los viajes sin operador, juntos).",
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
        "Ventas de cada mes del período (sin fechas, los últimos 12 meses), para compararlas "
        "con otro período.",
        [Columna("mes", "Mes", "texto"), *_col_importes("ventas", "Ventas")],
        _comparacion_mensual,
        meses_por_defecto=12,
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
    """Genera el reporte `reporte_id` del período (sin él, el mes en curso; la comparación mensual,
    los últimos 12 meses) y, si se piden los dos extremos, el del período de comparación (salvo
    en los reportes que son la foto de hoy). Un período sin datos da filas vacías (A3); un período
    invertido o una comparación a medias, `DatosInvalidos`."""
    definicion = next((d for d in _DEFINICIONES if d.id == reporte_id), None)
    if definicion is None:
        raise NoEncontrado(f"Reporte {reporte_id} no encontrado")
    primero_del_mes = hoy().replace(day=1)
    periodo = Periodo(
        desde or sumar_meses(primero_del_mes, 1 - definicion.meses_por_defecto),
        hasta or sumar_meses(primero_del_mes, 1) - timedelta(days=1),
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
    filas_comparadas = None
    if comparado is not None and definicion.comparable:
        generar = definicion.generar_comparada or definicion.generar
        filas_comparadas = await generar(sesion, vista, comparado)
    return ReporteGenerado(definicion, periodo, comparado, filas, filas_comparadas)


def _validar(periodo: Periodo, campo: str) -> None:
    if periodo.desde > periodo.hasta:
        raise DatosInvalidos(campo, "La fecha final no puede ser anterior a la inicial.")
