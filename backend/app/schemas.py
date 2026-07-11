from datetime import date
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class RegisterRequest(BaseModel):
    pairing_code: str
    company_guid: str
    machine_label: str | None = None


class RegisterResponse(BaseModel):
    device_token: str


class LedgerIn(BaseModel):
    tally_guid: str
    name: str
    parent_group: str | None = None
    closing_balance: Decimal | None = None
    alter_id: int | None = None


class BillIn(BaseModel):
    party_guid: str | None = None
    party_name: str
    bill_ref: str | None = None
    bill_date: date | None = None
    due_date: date | None = None
    pending_amount: Decimal
    overdue_days: int | None = None


class SyncPayload(BaseModel):
    sync_run_id: UUID
    company_guid: str
    ledgers: list[LedgerIn] = []
    bills: list[BillIn] = []


class SyncResponse(BaseModel):
    sync_run_id: UUID
    status: str
    counts: dict
