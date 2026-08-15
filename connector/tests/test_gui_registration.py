import queue

from arq_connector import gui


class FakeVar:
    def __init__(self, value=""):
        self.value = value

    def get(self):
        return self.value

    def set(self, value):
        self.value = value


class FakeWidget:
    def __init__(self):
        self.config = {}

    def configure(self, **kwargs):
        self.config.update(kwargs)


class FakeLogger:
    def __init__(self):
        self.events = []

    def info(self, message, *args):
        self.events.append(("info", message, args))

    def error(self, message, *args):
        self.events.append(("error", message, args))


def registration_state_app():
    app = gui.ConnectorApp.__new__(gui.ConnectorApp)
    app.settings = {"company_name": "Acme Traders"}
    app.company_var = FakeVar("Acme Traders")
    app.reg_status = FakeWidget()
    app.company_box = FakeWidget()
    app.pairing_entry = FakeWidget()
    app.register_btn = FakeWidget()
    app.deregister_btn = FakeWidget()
    app.pill_device = FakeWidget()
    app.logger = FakeLogger()
    app._log_status = lambda *_args, **_kwargs: None
    return app


def test_registered_state_locks_company_and_offers_reset(monkeypatch):
    app = registration_state_app()
    monkeypatch.setattr(gui.credentials, "load_token", lambda: "stored-token")

    app._refresh_registration_state()

    assert app.company_box.config["state"] == "disabled"
    assert app.pairing_entry.config["state"] == "disabled"
    assert app.register_btn.config["state"] == "disabled"
    assert app.deregister_btn.config["state"] == "normal"
    assert "Acme Traders" in app.reg_status.config["text"]


def test_unregistered_state_unlocks_company_and_fresh_code(monkeypatch):
    app = registration_state_app()
    monkeypatch.setattr(gui.credentials, "load_token", lambda: None)

    app._refresh_registration_state()

    assert app.company_box.config["state"] == "readonly"
    assert app.pairing_entry.config["state"] == "normal"
    assert app.register_btn.config["state"] == "normal"
    assert app.deregister_btn.config["state"] == "disabled"


def test_credential_read_failure_pauses_registration_controls(monkeypatch):
    app = registration_state_app()
    monkeypatch.setattr(
        gui.credentials,
        "load_token",
        lambda: (_ for _ in ()).throw(RuntimeError("do not expose this detail")),
    )

    app._refresh_registration_state()

    assert app.company_box.config["state"] == "disabled"
    assert app.register_btn.config["state"] == "disabled"
    assert app.deregister_btn.config["state"] == "disabled"
    assert "Credential Manager" in app.reg_status.config["text"]
    assert app.logger.events[0][2] == ("RuntimeError",)


def test_reset_confirmation_cancel_changes_nothing(monkeypatch):
    app = gui.ConnectorApp.__new__(gui.ConnectorApp)
    app.root = object()
    reset_called = []
    monkeypatch.setattr(gui.messagebox, "askyesno", lambda *_args, **_kwargs: False)
    monkeypatch.setattr(
        gui.registration,
        "deregister_local_device",
        lambda _settings: reset_called.append(True),
    )

    app._deregister()

    assert reset_called == []


def test_token_save_failure_unlocks_ui_without_logging_token(monkeypatch):
    app = gui.ConnectorApp.__new__(gui.ConnectorApp)
    app.pairing_var = FakeVar("fresh-code")
    app.company_var = FakeVar("New Company")
    app.companies = {"New Company": "new-guid"}
    app.settings = {"api_base_url": "https://example.test"}
    app.results = queue.Queue()
    app.logger = FakeLogger()
    app._save_current_settings = lambda: None
    app._run_in_thread = lambda work: work()
    messages = []
    busy_states = []
    app._log_status = lambda message, tag="muted": messages.append((message, tag))
    app._busy = lambda busy: busy_states.append(busy)

    monkeypatch.setattr(gui, "register_device", lambda *_args: "super-secret-token")
    monkeypatch.setattr(
        gui.credentials,
        "save_token",
        lambda _token: (_ for _ in ()).throw(RuntimeError("keyring failed")),
    )

    app._register()
    app.results.get_nowait()()

    assert busy_states[-1] is False
    assert "code is now spent" in messages[-1][0]
    assert "super-secret-token" not in str(messages)
    assert "super-secret-token" not in str(app.logger.events)
