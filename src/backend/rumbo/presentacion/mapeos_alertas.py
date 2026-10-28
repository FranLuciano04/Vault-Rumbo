"""Mapeo de una alerta del ORM y su contexto al esquema `Alerta` del contrato; lo comparten los
routers de alertas y de oportunidades."""

from pydantic import BaseModel
from sqlalchemy import inspect

from rumbo.datos import modelos
from rumbo.negocio.servicios.alertas import ContextoDeAlerta
from rumbo.presentacion.esquemas.alertas import (
    Alerta,
    ClienteDeAlerta,
    ContextoAlerta,
    OportunidadDeAlerta,
    PagoDeAlerta,
    ResponsableAlerta,
    ViajeDeAlerta,
)


def _contexto(contexto: ContextoDeAlerta) -> ContextoAlerta:
    def de[E: BaseModel](esquema: type[E], origen: object | None) -> E | None:
        return None if origen is None else esquema.model_validate(origen, from_attributes=True)

    viaje, pago = contexto.viaje, contexto.pago
    return ContextoAlerta(
        cliente=de(ClienteDeAlerta, contexto.cliente),
        oportunidad=de(OportunidadDeAlerta, contexto.oportunidad),
        viaje=None
        if viaje is None
        else ViajeDeAlerta(
            id=viaje.viaje.id,
            destino_id=viaje.viaje.destino_id,
            destino=viaje.destino,
            estado=viaje.viaje.estado,
            fecha_salida=viaje.viaje.fecha_salida,
            fecha_regreso=viaje.viaje.fecha_regreso,
        ),
        pago=None
        if pago is None
        else PagoDeAlerta(
            id=pago.pago.id,
            tipo=pago.pago.tipo,
            monto=pago.pago.monto,
            moneda=pago.moneda,
            vencimiento=pago.pago.vencimiento,
            estado=pago.pago.estado,
        ),
    )


def esquema_de_alerta(alerta: modelos.Alerta, contexto: ContextoDeAlerta) -> Alerta:
    """La `Alerta` del ORM con su responsable y su contexto, validada contra el contrato."""
    columnas = {c.key: getattr(alerta, c.key) for c in inspect(modelos.Alerta).column_attrs}
    return Alerta.model_validate(
        {
            **columnas,
            "responsable": ResponsableAlerta.model_validate(
                contexto.responsable, from_attributes=True
            ),
            "contexto": _contexto(contexto),
        }
    )
