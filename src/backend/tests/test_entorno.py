import os


def test_rnf15_sslkeylogfile_no_llega_a_los_tests() -> None:
    assert "SSLKEYLOGFILE" not in os.environ
