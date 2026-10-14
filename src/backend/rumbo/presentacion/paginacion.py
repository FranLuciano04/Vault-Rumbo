from pydantic import BaseModel


class ParametrosPagina(BaseModel):
    pagina: int
    por_pagina: int

    @property
    def desplazamiento(self) -> int:
        raise NotImplementedError


class Pagina[T](BaseModel):
    items: list[T]
    total: int
    pagina: int
    por_pagina: int


def parametros_pagina() -> ParametrosPagina:
    raise NotImplementedError
