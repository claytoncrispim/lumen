# Lumen — Travel Risk & Logistics Platform (In Development)

> 🚧 **Status: Active Greenfield Development**  
> This project is currently under active construction as a hands-on architectural exploration of full-stack data ingestion frameworks. The backend service layer is under current assembly, and features are being committed iteratively.

## API contract note (current)

- `POST /api/generate-guide/` now expects Gemini to return the **presentation-layer contract v1** (`schemaVersion: "1.0.0"`), including:
  - `query`
  - `outputViewA`
  - `comparison`
- The backend enriches each guide-generation prompt with **authoritative location and safety context** resolved from local `Location` and `SafetyIndex` data.
- In development, clients can send `includeDebugContext: true` to receive the resolved authoritative context in the `X-Lumen-Debug-Context` response header.
- The backend validates the response strictly and returns `GEMINI_INVALID_SCHEMA` with structured `details` when the payload is invalid.
- The backend response is now canonical-only (legacy projection fields are not added).