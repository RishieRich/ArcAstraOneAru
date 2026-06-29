# ArcAstraOneAru

Date: 30/06/2026

## Project Goal

Build a lightweight Tally connector application that can run on any Windows system where Tally is installed.

The application should connect to the locally running Tally instance, allow data extraction for a selected company, and export the available Tally data into a local folder.

The final application should eventually be packaged as a Windows `.exe`.

## Key Requirements

- Keep the backend clean, lightweight, and secure.
- Avoid unnecessary heavy frameworks.
- Connect to Tally running on the host system.
- Support flexible extraction of available company data.
- Export extracted data into a structured local folder.
- Design the backend so it can later be packaged into a Windows executable.
- Start with only the basic backend folder structure.

## Current Folder Structure

```text
backend/
  app/
    core/
    export/
    schemas/
    tally/
  tests/
```

## Folder Purpose

```text
backend/
  Main backend area for the Tally connector.

backend/app/
  Application source code.

backend/app/core/
  Core configuration, constants, security, and shared backend utilities.

backend/app/tally/
  Tally connection logic, request handling, company selection, and extraction logic.

backend/app/export/
  Export handling, output folder management, and file generation logic.

backend/app/schemas/
  Data structures and contracts used across the backend.

backend/tests/
  Backend tests for connector, export, and security behavior.
```

## Current Status

Only the initial backend folder structure has been created. No implementation files are required at this stage.
