import pytest

from tests.conftest import url_de_tests

BASE = "postgresql+asyncpg://rumbo:clave@{host}:5435/rumbo_test"


def test_t154_localhost_pasa_a_127_0_0_1() -> None:
    assert url_de_tests(BASE.format(host="localhost"), None) == BASE.format(host="127.0.0.1")


def test_t154_otro_host_no_se_toca() -> None:
    url = BASE.format(host="db.interna")
    assert url_de_tests(url, None) == url


def test_t154_sin_worker_la_base_queda_igual() -> None:
    assert url_de_tests(BASE.format(host="127.0.0.1"), None).endswith("/rumbo_test")


@pytest.mark.parametrize("worker", ["gw0", "gw7"])
def test_t154_cada_worker_tiene_su_base_y_conserva_el_sufijo_test(worker: str) -> None:
    url = url_de_tests(BASE.format(host="localhost"), worker)
    assert url.endswith(f"/rumbo_{worker}_test")
    assert "@127.0.0.1:5435/" in url
