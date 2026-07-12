# -*- mode: python ; coding: utf-8 -*-


a = Analysis(
    ['src\\arq_connector\\__main__.py'],
    pathex=['src'],
    binaries=[],
    datas=[('src/arq_connector/assets/arq.ico', 'assets'), ('src/arq_connector/assets/arq_logo.png', 'assets')],
    hiddenimports=['keyring.backends.Windows'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='arq-connector',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['src\\arq_connector\\assets\\arq.ico'],
)
