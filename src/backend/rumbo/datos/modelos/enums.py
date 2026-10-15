"""Los 20 tipos enumerados de `rumbo.sql`: un enum Python por cada `CREATE TYPE`.

El nombre del miembro es el valor SQL; el nombre del tipo en PostgreSQL es la clase en snake_case
(`RolUsuario` -> `rol_usuario`), lo resuelve `base.py`.
"""

import enum


class RolUsuario(enum.Enum):
    admin = "admin"
    empleado = "empleado"
    dueno = "dueno"
    freelance = "freelance"


class TipoComision(enum.Enum):
    """El porcentaje es sobre la ganancia (DEC-0007, DEC-0013)."""

    importe = "importe"
    porcentaje = "porcentaje"


class SegmentoCliente(enum.Enum):
    familia = "familia"
    amigos = "amigos"
    individual = "individual"
    pareja = "pareja"


class CanalOportunidad(enum.Enum):
    instagram = "instagram"
    whatsapp = "whatsapp"
    presencial = "presencial"


class EstadoOportunidad(enum.Enum):
    nueva = "nueva"
    en_gestion = "en_gestion"
    cotizada = "cotizada"
    ganada = "ganada"
    perdida = "perdida"


class MotivoPerdida(enum.Enum):
    precio = "precio"
    fechas_disponibilidad = "fechas_disponibilidad"
    desistio = "desistio"
    otra_agencia = "otra_agencia"
    sin_respuesta = "sin_respuesta"
    otro = "otro"


class Moneda(enum.Enum):
    ARS = "ARS"
    USD = "USD"


class EstadoCotizacion(enum.Enum):
    borrador = "borrador"
    enviada = "enviada"
    aceptada = "aceptada"
    rechazada = "rechazada"
    vencida = "vencida"


class CategoriaViaje(enum.Enum):
    grupal = "grupal"
    individual = "individual"


class EstadoViaje(enum.Enum):
    reservado = "reservado"
    vendido = "vendido"
    confirmado = "confirmado"
    en_curso = "en_curso"
    finalizado = "finalizado"
    cancelado = "cancelado"


class TipoPago(enum.Enum):
    sena = "sena"
    cuota = "cuota"
    saldo = "saldo"


class EstadoPago(enum.Enum):
    pendiente = "pendiente"
    pagado = "pagado"
    vencido = "vencido"
    anulado = "anulado"


class FormaPago(enum.Enum):
    efectivo = "efectivo"
    transferencia = "transferencia"
    tarjeta_credito = "tarjeta_credito"
    tarjeta_debito = "tarjeta_debito"
    cheque = "cheque"
    deposito = "deposito"


class TipoRequisito(enum.Enum):
    visa = "visa"
    vacunacion = "vacunacion"
    documentacion = "documentacion"
    seguro = "seguro"
    formulario = "formulario"
    otro = "otro"


class EstadoHotel(enum.Enum):
    activo = "activo"
    cerrado = "cerrado"


class EstadoResena(enum.Enum):
    publicada = "publicada"
    oculta = "oculta"


class TipoAlerta(enum.Enum):
    pago = "pago"
    formulario = "formulario"
    salida = "salida"
    insistencia = "insistencia"
    resena = "resena"
    manual = "manual"
    recontacto = "recontacto"
    viaje = "viaje"


class EstadoAlerta(enum.Enum):
    pendiente = "pendiente"
    vista = "vista"
    resuelta = "resuelta"


class CanalContenido(enum.Enum):
    instagram = "instagram"
    tiktok = "tiktok"
    whatsapp_ventas = "whatsapp_ventas"


class EstadoKanban(enum.Enum):
    idea = "idea"
    en_produccion = "en_produccion"
    listo = "listo"
    publicado = "publicado"
    descartado = "descartado"
