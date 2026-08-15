ARQ ASTRA TALLY CONNECTOR
=========================

Supported systems
-----------------
Windows 10 or Windows 11, 64-bit (x64).
TallyPrime must be installed on the same PC.

Install
-------
1. Extract the ZIP completely. Do not run the app from inside the ZIP.
2. Keep the EXE in a permanent folder such as C:\ARQ Astra.
3. Double-click the EXE, enter the one-time pairing code, and follow the app.
4. If Windows shows a security prompt, verify the publisher before running it.

Integrity check
---------------
SHA256SUMS.txt contains the expected SHA-256 checksum. In PowerShell:

  Get-FileHash ".\*.exe" -Algorithm SHA256

The value must exactly match SHA256SUMS.txt. A checksum detects an incomplete or
changed download; only a valid digital publisher signature proves who signed it.

Troubleshooting
---------------
If Windows says "This app can't run on your PC":
- Re-extract the ZIP and confirm the checksum.
- Confirm System type says "64-bit operating system".
- Open Properties > Digital Signatures and verify the ARQ publisher signature.
- Send ARQ support a screenshot plus the Windows edition and System type.

Never send a password, device token, or database connection string in a support
message. The connector stores its device token in Windows Credential Manager.

Use another pairing code
------------------------
If this PC already shows a saved registration, click "Reset registration" and
read the warning. The reset removes only this PC's protected token, remembered
company and old sync status, and turns automatic sync off. Tally and dashboard
data are untouched. Select the intended Tally company and use a fresh one-time
code; a spent code cannot be reused. The ARQ admin must separately revoke an old
server device when a PC is lost, stolen or transferred.

If the Activity box says Tally is not accepting connections on port 9000, open
TallyPrime, load the company, then set F1 > Settings > Connectivity >
TallyPrime acts as Both, port 9000, and press Refresh.
