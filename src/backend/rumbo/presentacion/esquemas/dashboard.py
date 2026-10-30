"""Esquemas del dashboard y los reportes (CU-21, CU-22). Todo se calcula, nada se guarda."""

import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field
from pydantic.json_schema import JsonDict

from rumbo.datos.modelos import EstadoOportunidad, EstadoPago, EstadoViaje, Moneda, TipoPago
from rumbo.presentacion.esquemas.comunes import DecimalConSigno, Fraccion, Importe

_SOLO_LECTURA: JsonDict = {"readOnly": True}


class MontoPorMoneda(BaseModel):
    """Un total en una moneda: ARS y USD no se suman entre sí (DEC-0007)."""

    moneda: Moneda
    monto: DecimalConSigno


class EtapaEmbudo(BaseModel):
    estado: EstadoOportunidad
    cantidad: int = Field(ge=0)


class Embudo(BaseModel):
    """Oportunidades por estado y tasa de conversión (ganadas sobre las cerradas)."""

    etapas: list[EtapaEmbudo]
    tasa_conversion: Fraccion


class VentaMensual(BaseModel):
    mes: date = Field(description="Primer día del mes.")
    ventas: list[MontoPorMoneda]


class VencimientoProximo(BaseModel):
    pago_id: uuid.UUID
    viaje_id: uuid.UUID
    cliente_nombre: str
    tipo: TipoPago
    monto: Importe
    moneda: Moneda
    vencimiento: date
    estado: EstadoPago


class ViajeProximo(BaseModel):
    viaje_id: uuid.UUID
    cliente_nombre: str
    destino_nombre: str
    fecha_salida: date
    estado: EstadoViaje
    pasajeros: int | None = Field(description="De la oportunidad de origen; vacío si no hay.")


class DestinoVendido(BaseModel):
    destino_id: uuid.UUID
    destino_nombre: str
    viajes: int = Field(ge=0, description="Viajes vendidos al destino en el período.")
    pasajeros: int = Field(
        ge=0, description="Pasajeros de las oportunidades de origen de esos viajes."
    )


class VentaPorVendedor(BaseModel):
    vendedor_id: uuid.UUID
    vendedor_nombre: str
    viajes: int = Field(ge=0)
    ventas: list[MontoPorMoneda]
    comisiones: list[MontoPorMoneda]


Seccion = Literal["oportunidades", "viajes", "alertas"]


class DetalleIndicador(BaseModel):
    """Listado al que lleva un contador (RF-128): sección de la web y sus filtros."""

    seccion: Seccion
    filtros: dict[str, str]


class DetallesIndicadores(BaseModel):
    """Un detalle por contador del dashboard (RF-128)."""

    consultas_pendientes: DetalleIndicador
    presupuestos_abiertos: DetalleIndicador
    reservas_confirmadas: DetalleIndicador
    viajes_activos: DetalleIndicador
    alertas_pendientes: DetalleIndicador


class Dashboard(BaseModel):
    """Foto del negocio en el período (CU-21), de solo lectura. Admin y dueño ven toda la agencia;
    el resto, lo propio (DEC-0005, DEC-0008). Sin actividad, las listas vienen vacías y los
    contadores en cero."""

    desde: date = Field(json_schema_extra=_SOLO_LECTURA, description="Inicio del período.")
    hasta: date = Field(json_schema_extra=_SOLO_LECTURA, description="Fin del período.")
    embudo: Embudo = Field(json_schema_extra=_SOLO_LECTURA)
    ventas: list[MontoPorMoneda] = Field(json_schema_extra=_SOLO_LECTURA)
    ventas_mensuales: list[VentaMensual] = Field(
        json_schema_extra=_SOLO_LECTURA, description="Comparación con los meses anteriores."
    )
    ganancia_estimada: list[MontoPorMoneda] = Field(json_schema_extra=_SOLO_LECTURA)
    margen: list[MontoPorMoneda] = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Fracción de la venta que es ganancia (0.2500 = 25 %), ponderada por moneda.",
    )
    comisiones: list[MontoPorMoneda] = Field(
        json_schema_extra=_SOLO_LECTURA, description="Comisión de los vendedores sobre las ventas."
    )
    ticket_promedio: list[MontoPorMoneda] = Field(json_schema_extra=_SOLO_LECTURA)
    cobrado: list[MontoPorMoneda] = Field(json_schema_extra=_SOLO_LECTURA)
    pendiente_de_cobrar: list[MontoPorMoneda] = Field(
        json_schema_extra=_SOLO_LECTURA, description="A pasajeros."
    )
    pendiente_de_pagar: list[MontoPorMoneda] = Field(
        json_schema_extra=_SOLO_LECTURA, description="A operadores."
    )
    proximos_vencimientos: list[VencimientoProximo] = Field(json_schema_extra=_SOLO_LECTURA)
    viajes_proximos: list[ViajeProximo] = Field(json_schema_extra=_SOLO_LECTURA)
    consultas_pendientes: int = Field(ge=0, json_schema_extra=_SOLO_LECTURA)
    presupuestos_abiertos: int = Field(ge=0, json_schema_extra=_SOLO_LECTURA)
    reservas_confirmadas: int = Field(ge=0, json_schema_extra=_SOLO_LECTURA)
    viajes_activos: int = Field(
        ge=0,
        json_schema_extra=_SOLO_LECTURA,
        description="Viajes que no están finalizados ni cancelados.",
    )
    alertas_pendientes: int = Field(
        ge=0,
        json_schema_extra=_SOLO_LECTURA,
        description="Alertas de pasajeros próximos a viajar (documentación, pagos, requisitos).",
    )
    destinos_mas_vendidos: list[DestinoVendido] = Field(json_schema_extra=_SOLO_LECTURA)
    ventas_por_vendedor: list[VentaPorVendedor] = Field(json_schema_extra=_SOLO_LECTURA)
    detalles: DetallesIndicadores = Field(
        json_schema_extra=_SOLO_LECTURA,
        description="Por contador, el listado al que lleva con los filtros que ese listado "
        "acepta: `estado` (un solo valor), `mios` (el empleado) y `responsable_id` o "
        "`propietario_id` (la dirección, donde el listado lo tiene).",
    )


class ReporteCatalogo(BaseModel):
    """Un reporte del catálogo de CU-22."""

    id: str = Field(description="Identificador de la ruta `/reportes/{reporte_id}`.")
    nombre: str
    descripcion: str


class ColumnaReporte(BaseModel):
    clave: str
    titulo: str
    tipo: Literal["texto", "entero", "importe"]
    moneda: Moneda | None = Field(
        description="Moneda de una columna de importe (DEC-0007); vacía en las demás."
    )


Fila = dict[str, str | int | None]


class Reporte(BaseModel):
    """Reporte del período en formato JSON (el Excel y el PDF llevan el mismo contenido). Los
    importes de las filas viajan como texto decimal. `filas_comparadas` viene solo si se pidió un
    período de comparación (CU-22 A2)."""

    id: str
    nombre: str
    desde: date
    hasta: date
    comparar_desde: date | None
    comparar_hasta: date | None
    columnas: list[ColumnaReporte]
    filas: list[Fila]
    filas_comparadas: list[Fila] | None
