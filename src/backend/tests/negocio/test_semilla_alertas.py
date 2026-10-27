"""T-060: la semilla de demo de M3 (recordatorios manuales ficticios) queda registrada en
`datos-iniciales --demo` y es idempotente.

Supuestos del ticket (a confirmar): la semilla es `sembrar_alertas(sesion)` en
`rumbo.datos.semillas.alertas` y se registra en `rumbo.datos.semillas.SEMILLAS` después de la de
clientes; crea solo alertas de tipo `manual` (CU-28), pendientes, con fechas relativas a hoy
(`core.fechas.hoy`) para que siempre haya atrasadas, de hoy y próximas; las asociadas a un
cliente usan clientes de la semilla de clientes; los responsables son usuarios de demo
(`@rumbo.test`). Idempotencia: no se vuelve a crear un recordatorio con la misma descripción y
el mismo responsable.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from rumbo.core.fechas import hoy
from rumbo.datos import semillas
from rumbo.datos.modelos import Alerta, Cliente, Usuario
from rumbo.datos.modelos.enums import EstadoAlerta, TipoAlerta
from rumbo.datos.semillas.alertas import sembrar_alertas
from rumbo.datos.semillas.clientes import sembrar_clientes
from rumbo.datos.semillas.configuracion import sembrar_configuracion
from rumbo.presentacion import cli


async def _preparar(sesion: AsyncSession) -> None:
    await sembrar_configuracion(sesion)
    await sembrar_clientes(sesion)
    await sembrar_alertas(sesion)


async def _alertas(sesion: AsyncSession) -> list[Alerta]:
    return list((await sesion.scalars(select(Alerta))).all())


async def _contar(sesion: AsyncSession) -> int:
    return await sesion.scalar(select(func.count()).select_from(Alerta)) or 0


def test_rf080_la_semilla_de_alertas_esta_registrada_en_la_cli() -> None:
    assert sembrar_alertas in semillas.SEMILLAS


def test_rf080_la_semilla_de_alertas_corre_despues_de_la_de_clientes() -> None:
    assert semillas.SEMILLAS.index(sembrar_alertas) > semillas.SEMILLAS.index(sembrar_clientes)


async def test_rf080_la_semilla_carga_recordatorios_manuales_pendientes(
    sesion: AsyncSession,
) -> None:
    await _preparar(sesion)

    alertas = await _alertas(sesion)
    assert len(alertas) >= 5
    assert all(a.tipo == TipoAlerta.manual for a in alertas)
    assert all(a.estado == EstadoAlerta.pendiente for a in alertas)
    assert all(a.descripcion.strip() for a in alertas)
    # Descripciones distintas entre sí: la semilla no se repite.
    assert len({a.descripcion for a in alertas}) == len(alertas)


async def test_rf076_la_semilla_cubre_atrasadas_de_hoy_y_proximas(sesion: AsyncSession) -> None:
    await _preparar(sesion)

    fechas = [a.fecha for a in await _alertas(sesion)]
    assert any(f < hoy() for f in fechas), "falta al menos un recordatorio atrasado"
    assert any(f == hoy() for f in fechas), "falta al menos un recordatorio de hoy"
    assert any(f > hoy() for f in fechas), "falta al menos un recordatorio próximo"


async def test_rf078_la_semilla_reparte_los_recordatorios_entre_varios_responsables(
    sesion: AsyncSession,
) -> None:
    await _preparar(sesion)

    propietarios = {a.propietario_id for a in await _alertas(sesion)}
    assert len(propietarios) >= 2
    emails = (
        await sesion.scalars(select(Usuario.email).where(Usuario.id.in_(propietarios)))
    ).all()
    assert all(email.endswith("@rumbo.test") for email in emails)


async def test_rf080_la_semilla_asocia_algunos_a_clientes_de_la_semilla_de_clientes(
    sesion: AsyncSession,
) -> None:
    await _preparar(sesion)

    alertas = await _alertas(sesion)
    asociadas = [a for a in alertas if a.cliente_id is not None]
    assert asociadas, "al menos un recordatorio queda asociado a un cliente"
    assert len(asociadas) < len(alertas), "también hay recordatorios personales, sin cliente"
    ids = {a.cliente_id for a in asociadas}
    contactos = (await sesion.scalars(select(Cliente.contacto).where(Cliente.id.in_(ids)))).all()
    assert len(contactos) == len(ids)
    assert all(c.endswith("@rumbo.test") or c.startswith("+54") for c in contactos)


async def test_rf080_la_semilla_es_idempotente(sesion: AsyncSession) -> None:
    await _preparar(sesion)
    antes = await _contar(sesion)
    assert antes > 0

    await sembrar_alertas(sesion)

    assert await _contar(sesion) == antes


async def test_rf080_la_semilla_no_duplica_un_recordatorio_ya_cargado(
    sesion: AsyncSession,
) -> None:
    await _preparar(sesion)
    existente = (await sesion.scalars(select(Alerta).limit(1))).one()
    total = await _contar(sesion)
    existente.estado = EstadoAlerta.vista
    await sesion.flush()

    await sembrar_alertas(sesion)

    assert await _contar(sesion) == total
    await sesion.refresh(existente)
    assert existente.estado == EstadoAlerta.vista  # no pisa lo que hizo la agencia


async def test_rf080_demo_de_la_cli_carga_alertas_y_dos_corridas_no_duplican(
    sesion: AsyncSession,
) -> None:
    def crear_cuenta(email: str, nombre: str) -> str:
        return "uid-duena-demo"

    async def correr() -> None:
        await cli.datos_iniciales(
            sesion,
            nombre="Dueña de Prueba",
            email="duena@rumbo.test",
            crear_cuenta=crear_cuenta,
            demo=True,
        )

    await correr()
    total = await _contar(sesion)
    assert total >= 5

    await correr()
    assert await _contar(sesion) == total
