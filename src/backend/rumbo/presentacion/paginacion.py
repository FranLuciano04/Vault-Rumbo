from typing import Annotated

from fastapi import Query
from pydantic import BaseModel

POR_PAGINA_DEFECTO = 20
POR_PAGINA_MAXIMO = 100


class ParametrosPagina(BaseModel):
    pagina: int
    por_pagina: int

    @property
    def desplazamiento(self) -> int:
        return (self.pagina - 1) * self.por_pagina


class Pagina[T](BaseModel):
    items: list[T]
    total: int
    pagina: int
    por_pagina: int


def parametros_pagina(
    pagina: Annotated[int, Query(ge=1)] = 1,
    por_pagina: Annotated[int, Query(ge=1, le=POR_PAGINA_MAXIMO)] = POR_PAGINA_DEFECTO,
) -> ParametrosPagina:
    return ParametrosPagina(pagina=pagina, por_pagina=por_pagina)
