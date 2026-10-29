"""Configuración de logging del arranque: el logger `rumbo` emite INFO por stderr (como Uvicorn).

`docker logs` junta stdout y stderr.

Uvicorn solo configura sus propios loggers; sin esto, `logger.info` de la aplicación se descarta
(hereda WARNING del raíz). No se tocan el raíz ni `uvicorn`.
Se deja `propagate` (`caplog` engancha en el raíz): si alguien agrega un handler al raíz, la línea
saldría duplicada.
"""

import logging
import sys

# Atributos que todo registro trae; lo demás en `__dict__` son los campos `extra`.
_ATRIBUTOS_ESTANDAR = frozenset(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {
    "message",
    "asctime",
    "taskName",
}


class FormatoConCampos(logging.Formatter):
    """Imprime el mensaje seguido de los campos `extra` presentes, como `campo=valor`."""

    def format(self, record: logging.LogRecord) -> str:
        linea = super().format(record)
        campos = {c: v for c, v in record.__dict__.items() if c not in _ATRIBUTOS_ESTANDAR}
        if not campos:
            return linea
        return f"{linea} " + " ".join(f"{c}={v!r}" for c, v in campos.items())


class _HandlerStderr(logging.Handler):
    """Escribe en el `sys.stderr` vigente al emitir (como `logging.lastResort`)."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            stream = sys.stderr
            stream.write(self.format(record) + "\n")
            stream.flush()
        except Exception:  # noqa: BLE001 (igual que StreamHandler)
            self.handleError(record)


def configurar_logs() -> None:
    """Deja el logger `rumbo` en INFO con un handler a stderr. Idempotente."""
    logger = logging.getLogger("rumbo")
    logger.setLevel(logging.INFO)
    if any(isinstance(h, _HandlerStderr) for h in logger.handlers):
        return
    handler = _HandlerStderr()
    handler.setFormatter(FormatoConCampos("%(levelname)s %(name)s: %(message)s"))
    logger.addHandler(handler)
