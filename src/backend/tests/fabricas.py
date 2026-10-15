"""Fábricas de factory-boy, una por entidad del ER (T-007).

Producen instancias válidas SIN persistir y sin claves foráneas: el padre se pasa
explícito (`HotelFactory.build(destino_id=destino.id)`). `crear` las persiste.
"""

from datetime import date
from decimal import Decimal
from enum import Enum
from typing import Any

import factory
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.datos import modelos as m


def _enum(clase: type[Enum], valor: str) -> Any:
    """Miembro del enum por su valor SQL, resuelto al construir (no al importar)."""
    return factory.LazyFunction(lambda: clase(valor))


class UsuarioFactory(factory.Factory[m.Usuario]):
    class Meta:
        model = m.Usuario

    nombre = factory.Faker("name")
    email = factory.Sequence(lambda n: f"usuario{n}@rumbo.test")
    firebase_uid = factory.Sequence(lambda n: f"uid-{n}")
    rol = _enum(m.RolUsuario, "empleado")


class ConfiguracionFactory(factory.Factory[m.Configuracion]):
    class Meta:
        model = m.Configuracion


class DestinoFactory(factory.Factory[m.Destino]):
    class Meta:
        model = m.Destino

    nombre = factory.Faker("city")
    pais = factory.Faker("country")


class RequisitoDestinoFactory(factory.Factory[m.RequisitoDestino]):
    class Meta:
        model = m.RequisitoDestino

    nombre = "Visa EE.UU."
    tipo = _enum(m.TipoRequisito, "visa")
    obligatorio = True
    anticipacion_dias = 30


class OperadorFactory(factory.Factory[m.Operador]):
    class Meta:
        model = m.Operador

    nombre = factory.Faker("company")


class HotelFactory(factory.Factory[m.Hotel]):
    class Meta:
        model = m.Hotel

    nombre = factory.Faker("company")
    categoria = "4 estrellas"
    precio_referencia = factory.LazyFunction(lambda: Decimal("85000.00"))
    servicios = "wifi, desayuno"


class ClienteFactory(factory.Factory[m.Cliente]):
    class Meta:
        model = m.Cliente

    nombre = factory.Faker("name")
    contacto = factory.Sequence(lambda n: f"+54911000{n:04d}")
    segmento = _enum(m.SegmentoCliente, "familia")


class OportunidadFactory(factory.Factory[m.Oportunidad]):
    class Meta:
        model = m.Oportunidad

    canal = _enum(m.CanalOportunidad, "whatsapp")
    destino_consultado = "Bariloche"
    pasajeros = 2


class CotizacionFactory(factory.Factory[m.Cotizacion]):
    class Meta:
        model = m.Cotizacion

    fecha = date(2026, 10, 1)
    moneda = _enum(m.Moneda, "ARS")
    items = factory.LazyFunction(lambda: [{"concepto": "Paquete", "precio": "1500000.00"}])
    total = factory.LazyFunction(lambda: Decimal("1500000.00"))
    validez_hasta = date(2026, 11, 1)


class ViajeFactory(factory.Factory[m.Viaje]):
    class Meta:
        model = m.Viaje

    fecha_salida = date(2027, 1, 10)
    fecha_regreso = date(2027, 1, 20)
    categoria = _enum(m.CategoriaViaje, "individual")
    moneda = _enum(m.Moneda, "ARS")
    precio_venta = factory.LazyFunction(lambda: Decimal("1000000.00"))
    costo = factory.LazyFunction(lambda: Decimal("750000.00"))
    comision_tipo = _enum(m.TipoComision, "porcentaje")
    comision_vendedor = factory.LazyFunction(lambda: Decimal("10.00"))


class PagoFactory(factory.Factory[m.Pago]):
    class Meta:
        model = m.Pago

    monto = factory.LazyFunction(lambda: Decimal("300000.00"))
    tipo = _enum(m.TipoPago, "sena")
    vencimiento = date(2026, 12, 1)


class ViajeHotelFactory(factory.Factory[m.ViajeHotel]):
    class Meta:
        model = m.ViajeHotel

    check_in = date(2027, 1, 10)
    check_out = date(2027, 1, 15)
    orden = 1


class ResenaFactory(factory.Factory[m.Resena]):
    class Meta:
        model = m.Resena

    puntaje = 5
    comentario = "Excelente atención"
    fecha = date(2027, 2, 1)


class AlertaFactory(factory.Factory[m.Alerta]):
    class Meta:
        model = m.Alerta

    tipo = _enum(m.TipoAlerta, "manual")
    descripcion = "Llamar al cliente"
    fecha = date(2026, 10, 20)


class ContenidoRedFactory(factory.Factory[m.ContenidoRed]):
    class Meta:
        model = m.ContenidoRed

    titulo = "Playas del Caribe"
    canal = _enum(m.CanalContenido, "instagram")
    fecha_publicacion = date(2026, 11, 5)


async def crear[T](sesion: AsyncSession, fabrica: type[factory.Factory[T]], **campos: Any) -> T:
    """Construye con la fábrica, persiste (flush) y recarga la fila de la base."""
    objeto = fabrica.build(**campos)
    sesion.add(objeto)
    await sesion.flush()
    await sesion.refresh(objeto)
    return objeto
