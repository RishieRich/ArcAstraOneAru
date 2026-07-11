# Builds the single-file exe -> dist\arq-connector.exe
# Run from the connector\ folder:  .\build.ps1

$ErrorActionPreference = "Stop"

.\.venv\Scripts\Activate.ps1

pyinstaller --noconfirm --clean --onefile --windowed `
    --name arq-connector `
    --paths src `
    --hidden-import keyring.backends.Windows `
    src\arq_connector\__main__.py

Write-Host ""
Write-Host "Build complete: $(Resolve-Path dist\arq-connector.exe)"
