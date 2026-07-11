"""HTTP transport to the Tally XML/HTTP gateway.

NOTE: response decoding/error-detection rules below (UTF-16, LINEERROR-in-body)
come from the plan doc, not from a live-captured response. Verify against a
real Tally gateway before trusting this in production (see tests/fixtures/README.md).
"""
import re

import httpx

DEFAULT_TIMEOUT_SECONDS = 15.0

# XML 1.0 valid chars: Tab/LF/CR, U+0020..U+D7FF, U+E000..U+FFFD, U+10000..U+10FFFF.
# Built with chr()/format (not literal escapes) to avoid embedding raw
# non-printable / surrogate-adjacent code points directly in this source file.
_VALID_XML_RANGES = [
    (0x09, 0x09), (0x0A, 0x0A), (0x0D, 0x0D),
    (0x20, 0xD7FF), (0xE000, 0xFFFD), (0x10000, 0x10FFFF),
]
_INVALID_XML_CHARS_PATTERN = "[^" + "".join(
    "{}-{}".format(chr(lo), chr(hi)) for lo, hi in _VALID_XML_RANGES
) + "]"
_INVALID_XML_CHARS_RE = re.compile(_INVALID_XML_CHARS_PATTERN)


class TallyGatewayError(Exception):
    """Raised when Tally returns HTTP 200 but the body indicates an error (e.g. LINEERROR)."""


class TallyConnectionError(Exception):
    """Raised when the gateway cannot be reached at all."""


# Tally emits numeric character references (e.g. "&#4;") pointing at code
# points that are illegal in XML 1.0 even as escaped references (control
# chars like U+0004). ElementTree resolves the reference during parsing and
# then rejects the result with "reference to invalid character number" --
# stripping raw control bytes alone (below) doesn't catch this, because the
# four literal characters '&', '#', '4', ';' are themselves perfectly valid
# XML text until parsed. Strip these entity refs before parsing, same as the
# plan doc's "Tally emits &#4; and friends" note describes.
_NUMERIC_CHARREF_RE = re.compile(r"&#x?[0-9A-Fa-f]+;")


def _is_valid_xml_codepoint(cp: int) -> bool:
    return any(lo <= cp <= hi for lo, hi in _VALID_XML_RANGES)


def _strip_invalid_charref(match: re.Match) -> str:
    ref = match.group(0)
    try:
        cp = int(ref[3:-1], 16) if ref[2] in "xX" else int(ref[2:-1])
    except ValueError:
        return ""
    return ref if _is_valid_xml_codepoint(cp) else ""


def strip_invalid_xml_chars(text: str) -> str:
    text = _NUMERIC_CHARREF_RE.sub(_strip_invalid_charref, text)
    return _INVALID_XML_CHARS_RE.sub("", text)


def decode_tally_response(content: bytes) -> tuple[str, str]:
    """Decode Tally's response bytes. Returns (text, encoding_used).

    Live testing showed Tally does NOT always send UTF-16 (plan doc section 2
    says it does, but a plain "List of Companies" response came back as
    ASCII/UTF-8, no BOM). Blindly trying utf-16 first is dangerous: decoding
    ASCII bytes as UTF-16 rarely raises an error, it just silently produces
    garbage text. Detect via BOM, then via the "<" (0x3C) heuristic (a UTF-16
    document starts with '<' as a 2-byte code unit, i.e. b'<\\x00' or
    b'\\x00<'; a UTF-8/ASCII document starts with the single byte b'<').
    """
    if content.startswith(b"\xff\xfe"):
        return content[2:].decode("utf-16-le"), "utf-16-le (bom)"
    if content.startswith(b"\xfe\xff"):
        return content[2:].decode("utf-16-be"), "utf-16-be (bom)"
    if content[:2] == b"<\x00":
        return content.decode("utf-16-le"), "utf-16-le (heuristic)"
    if content[:2] == b"\x00<":
        return content.decode("utf-16-be"), "utf-16-be (heuristic)"
    try:
        return content.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        return content.decode("utf-8", errors="replace"), "utf-8 (replaced)"


class TallyClient:
    def __init__(self, host: str, port: int, timeout: float = DEFAULT_TIMEOUT_SECONDS):
        self.base_url = f"http://{host}:{port}"
        self.timeout = timeout

    def health_check(self) -> bool:
        try:
            resp = httpx.get(self.base_url, timeout=self.timeout)
        except httpx.RequestError:
            return False
        return resp.status_code == 200

    def post_envelope(self, envelope_xml: str) -> str:
        try:
            resp = httpx.post(
                self.base_url,
                content=envelope_xml.encode("utf-8"),
                headers={"Content-Type": "text/xml"},
                timeout=self.timeout,
            )
        except httpx.RequestError as e:
            raise TallyConnectionError(f"Could not reach Tally gateway at {self.base_url}: {e}") from e

        text, _encoding = decode_tally_response(resp.content)
        text = strip_invalid_xml_chars(text)

        if "LINEERROR" in text:
            raise TallyGatewayError(f"Tally reported an error: {text[:500]}")

        return text
