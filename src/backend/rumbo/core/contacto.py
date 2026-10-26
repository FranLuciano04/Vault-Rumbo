"""Contacto del `Cliente` (DEC-0017): validación y clave canónica para detectar duplicados.

Reproduce `esContactoValido` (esquemas/clientes.ts) y `normalizarTelefonoAR` (telefono.ts) de
`packages/shared`: si una regla cambia allá, hay que cambiarla acá.
"""

import re

# Teléfono o WhatsApp: de 7 a 15 dígitos, con `+`, espacios, guiones y paréntesis.
_TELEFONO = re.compile(r"\+?(?=(?:\D*\d){7,15}\D*\Z)[\d\s\-()]+\Z", re.ASCII)
# La misma expresión de email que usa `z.email()` de zod.
_EMAIL = re.compile(
    r"(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]"
    r"@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}\Z"
)
_NO_DE_FORMATO = re.compile(r"[^\d\s()+\-.]", re.ASCII)
_NO_DIGITO = re.compile(r"\D", re.ASCII)


def es_contacto_valido(contacto: str) -> bool:
    """Un teléfono de 7 a 15 dígitos o un email."""
    return bool(_TELEFONO.match(contacto) or _EMAIL.match(contacto))


def _nacional_a_internacional(nacional: str) -> str | None:
    """Recibe el número nacional (código de área + abonado) con posible 0 y 15 de discado local."""
    numero = nacional.removeprefix("0")
    if len(numero) == 10:
        return f"549{numero}"
    for largo_area in (2, 3, 4):
        if numero[largo_area : largo_area + 2] == "15" and len(numero) == 12:
            numero = numero[:largo_area] + numero[largo_area + 2 :]
            return f"549{numero}" if len(numero) == 10 else None
    return None


def normalizar_telefono_ar(contacto: str) -> str | None:
    """Número argentino en formato internacional (solo dígitos, con 549 para celulares), o
    `None` si el contacto no es un único número válido (texto sin dígitos, dos números, email)."""
    texto = contacto.strip()
    if _NO_DE_FORMATO.search(texto):
        return None
    digitos = _NO_DIGITO.sub("", texto)
    if texto.startswith(("+", "00")):
        digitos = digitos.removeprefix("00")
        if not digitos.startswith("54"):
            return None
        return _nacional_a_internacional(digitos[2:].removeprefix("9"))
    if digitos.startswith("549"):
        return _nacional_a_internacional(digitos[3:])
    if digitos.startswith("54") and len(digitos) > 10:
        return _nacional_a_internacional(digitos[2:])
    return _nacional_a_internacional(digitos)


def clave_contacto(contacto: str) -> str:
    """Clave para comparar contactos: el teléfono canónico o, si no es un teléfono argentino
    válido, el texto sin espacios de los extremos y en minúsculas (así los emails no distinguen
    mayúsculas)."""
    return normalizar_telefono_ar(contacto) or contacto.strip().lower()
