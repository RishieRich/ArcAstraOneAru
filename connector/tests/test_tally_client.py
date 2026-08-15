import httpx
import pytest

from arq_connector.tally.client import TallyClient, TallyConnectionError


def test_connection_refused_message_is_actionable_and_hides_winerror(monkeypatch):
    request = httpx.Request("POST", "http://localhost:9000")

    def refuse(*_args, **_kwargs):
        raise httpx.ConnectError("[WinError 10061] target machine refused it", request=request)

    monkeypatch.setattr(httpx, "post", refuse)

    with pytest.raises(TallyConnectionError) as caught:
        TallyClient("localhost", 9000).post_envelope("<ENVELOPE />")

    message = str(caught.value)
    assert "Open TallyPrime" in message
    assert "Connectivity" in message
    assert "port 9000" in message
    assert "WinError" not in message
