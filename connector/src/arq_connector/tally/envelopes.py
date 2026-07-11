"""XML request envelope builders.

WARNING (per plan doc section 8): these skeletons are directionally correct
but not verified against a live Tally gateway. Before trusting parser output
built against these requests: send the request, dump the raw response into
tests/fixtures/, inspect it by hand, and adjust field names to match reality.

LIVE FINDING: naming a custom COLLECTION "List of Companies" collides with a
Tally built-in report/collection of that exact name -- Tally silently ignores
our <FETCH> list and returns its own default field set (no GUID, no
STARTINGFROM) instead of erroring. Prefixing with "ARQ " (same pattern the
plan doc already used for "ARQ Debtor Ledgers") avoids the collision and
makes FETCH actually work. Confirmed against a real TallyPrime instance.
"""

LIST_OF_COMPANIES = """<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>ARQ List of Companies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL><TDLMESSAGE>
        <COLLECTION NAME="ARQ List of Companies" ISMODIFY="No">
          <TYPE>Company</TYPE>
          <FETCH>NAME, GUID, STARTINGFROM</FETCH>
        </COLLECTION>
      </TDLMESSAGE></TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""


def debtor_ledgers(company_name: str) -> str:
    return f"""<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>ARQ Debtor Ledgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL><TDLMESSAGE>
        <COLLECTION NAME="ARQ Debtor Ledgers" ISMODIFY="No">
          <TYPE>Ledger</TYPE>
          <CHILDOF>$$GroupSundryDebtors</CHILDOF>
          <BELONGSTO>Yes</BELONGSTO>
          <FETCH>NAME, GUID, PARENT, CLOSINGBALANCE, ALTERID</FETCH>
        </COLLECTION>
      </TDLMESSAGE></TDL>
    </DESC>
  </BODY>
</ENVELOPE>"""


def bills_receivable(company_name: str) -> str:
    """LIVE-VERIFIED against a real TallyPrime instance with real bill data.

    The plan doc's original skeleton (TYPE=Data, ID="Bills Receivable") returns
    an empty <ENVELOPE></ENVELOPE> -- wrong shape. A more "standard" alternative
    (EXPORTDATA/REQUESTDESC with TALLYREQUEST="EXPORT") returned
    "Unknown Request, cannot be processed". What actually works: TALLYREQUEST
    must be the two-word "Export Data", not "EXPORT" or "Export". No
    date-range variables were needed to get the current outstanding bill.
    """
    return f"""<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Bills Receivable</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>{company_name}</SVCURRENTCOMPANY>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>"""
