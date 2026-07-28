"""Tally health checks: process, port, gateway, company discovery.

Windows-only (per plan section 2: target OS is Windows 11 / PowerShell).
Deliberately stdlib-only for the process check (subprocess + tasklist)
instead of adding psutil as a dependency.
"""
import socket
import subprocess
from dataclasses import dataclass, field

from .client import TallyClient, TallyConnectionError, TallyGatewayError
from .envelopes import LIST_OF_COMPANIES
from .parsers import CompanyRef, parse_companies

# The actual TallyPrime application process. NOTE: tallyscheduler.exe is a
# separate licensing/scheduler helper that can be running even when the main
# app (and its port-9000 gateway) is closed — don't treat it as "Tally is up".
TALLY_PROCESS_NAMES = ("tally.exe", "tallyprime.exe")

EXIT_HEALTHY = 0
EXIT_NOT_RUNNING = 10
EXIT_GATEWAY_OFF = 11
EXIT_NO_COMPANY = 12
EXIT_MULTIPLE_COMPANIES = 13


@dataclass(frozen=True)
class DoctorResult:
    exit_code: int
    message: str
    companies: list[CompanyRef] = field(default_factory=list)
    matched_company: CompanyRef | None = None
    matched_by: str = ""  # "guid" | "name" | "" — lets the caller self-heal a drifted name


def _normalize(name: str) -> str:
    return " ".join(name.split()).casefold()


def find_company(companies: list[CompanyRef], configured_company: str,
                 configured_guid: str = "") -> tuple[CompanyRef | None, str]:
    """Locate the pinned company among the open ones.

    GUID wins over name. The backend binds a tenant to the company GUID for
    good, so the GUID — not the display name — is the thing that actually
    identifies the client's books. Matching on it first means renaming the
    company inside Tally can no longer strand an unattended sync and force the
    operator back into the app to re-pick.

    Name matching stays as the fallback for a first-ever run (no GUID stored
    yet) and is whitespace/case tolerant, because operators retype these names.
    """
    if configured_guid:
        for company in companies:
            if company.guid and company.guid == configured_guid:
                return company, "guid"

    if configured_company:
        for company in companies:
            if company.name == configured_company:
                return company, "name"
        wanted = _normalize(configured_company)
        for company in companies:
            if _normalize(company.name) == wanted:
                return company, "name"

    return None, ""


def is_tally_process_running() -> bool:
    try:
        out = subprocess.run(
            ["tasklist", "/FO", "CSV"],
            capture_output=True,
            text=True,
            timeout=10,
            stdin=subprocess.DEVNULL,       # windowed exe: no valid std handles
            creationflags=0x08000000,       # CREATE_NO_WINDOW — no console flash
        ).stdout.lower()
    except (OSError, subprocess.SubprocessError):
        return False
    return any(name in out for name in TALLY_PROCESS_NAMES)


def tcp_port_open(host: str, port: int, timeout: float = 3.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def run_doctor(host: str, port: int, configured_company: str,
               configured_guid: str = "") -> DoctorResult:
    if not is_tally_process_running():
        return DoctorResult(
            exit_code=EXIT_NOT_RUNNING,
            message="Tally chalu nahi hai / Tally is not running. -> Tally kholo (open TallyPrime).",
        )

    if not tcp_port_open(host, port):
        return DoctorResult(
            exit_code=EXIT_GATEWAY_OFF,
            message=(
                f"Tally chalu hai par gateway band hai / Tally is running but the gateway "
                f"(port {port}) is closed. -> F1 (Help) > Settings > Connectivity mein "
                f"'Tally.NET' / HTTP server on karo."
            ),
        )

    client = TallyClient(host=host, port=port)
    try:
        response = client.post_envelope(LIST_OF_COMPANIES)
        companies = parse_companies(response)
    except (TallyConnectionError, TallyGatewayError) as e:
        return DoctorResult(
            exit_code=EXIT_GATEWAY_OFF,
            message=f"Gateway se baat nahi ho payi / Could not talk to the gateway: {e}",
        )

    if not companies:
        return DoctorResult(
            exit_code=EXIT_NO_COMPANY,
            message=(
                f"Tally mein company open karo / Open a company in Tally -> "
                f"Configured: '{configured_company}'"
            ),
        )

    matched, matched_by = find_company(companies, configured_company, configured_guid)

    if matched is None and len(companies) > 1:
        names = ", ".join(c.name for c in companies)
        return DoctorResult(
            exit_code=EXIT_MULTIPLE_COMPANIES,
            message=(
                f"Kai companies khuli hain, koi selected se match nahi / Multiple companies "
                f"open and none matches the selected one: [{names}]. -> App kholkar sahi "
                f"company chuno (open the app and pick the right company)."
            ),
            companies=companies,
        )

    if matched is None:
        names = ", ".join(c.name for c in companies)
        return DoctorResult(
            exit_code=EXIT_NO_COMPANY,
            message=(
                f"Configured company nahi mili / Configured company not found. "
                f"Open: [{names}], Configured: '{configured_company}'"
            ),
            companies=companies,
        )

    return DoctorResult(
        exit_code=EXIT_HEALTHY,
        message=f"OK: '{matched.name}' is open, GUID={matched.guid}",
        companies=companies,
        matched_company=matched,
        matched_by=matched_by,
    )
