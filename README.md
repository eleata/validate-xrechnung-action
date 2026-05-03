# validate-xrechnung-action

> Validate EU invoices (Peppol/XRechnung/Factur-X/UBL) in your CI/CD pipeline.
> Powered by [eleata Peppol API](https://peppol.eleata.io).

[![Marketplace](https://img.shields.io/badge/marketplace-eleata%2Fvalidate--xrechnung-blue?logo=github)](https://github.com/marketplace/actions/eleata-validate-xrechnung)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## Add to your workflow

```yaml
name: validate-invoices
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: eleata/validate-xrechnung-action@v1
        with:
          files: ./invoices/**/*.xml
          format: xrechnung-2.x
          api-key: ${{ secrets.ELEATA_KEY }}
```

## Inputs

| Input       | Required | Default            | Description                                 |
|-------------|----------|--------------------|---------------------------------------------|
| `files`     | yes      | —                  | Glob pattern of XML files to validate       |
| `format`    | no       | `peppol-bis-3`     | One of: peppol-bis-3, xrechnung-2.x, factur-x, ubl |
| `api-key`   | yes      | —                  | Your `evk_live_...` API key                 |
| `fail-fast` | no       | `false`            | Exit on first invalid file                  |
| `report`    | no       | `true`             | Generate per-file PR comment                |

## Outputs

| Output        | Description                                |
|---------------|--------------------------------------------|
| `valid-count` | Number of files that passed validation     |
| `error-count` | Number of files that failed validation     |
| `report-urls` | JSON array of public report URLs           |

## Add the badge to your README

```markdown
[![Validates XRechnung in CI](https://img.shields.io/badge/XRechnung-validated-green?logo=github)](https://github.com/marketplace/actions/eleata-validate-xrechnung)
```

Renders as:

[![Validates XRechnung in CI](https://img.shields.io/badge/XRechnung-validated-green?logo=github)](https://github.com/marketplace/actions/eleata-validate-xrechnung)

## How it works

The action loops over each XML file matching `files` and POSTs to the
[eleata API](https://peppol.eleata.io). Validation uses
[phive](https://github.com/phax/phive) under the hood — same Schematron
rules everyone in EU e-invoicing uses.

If any file fails, the action exits non-zero (or continues if
`fail-fast: false`). Per-file reports are posted to the PR if `report: true`.

## Free tier

100 validations/month free. No card needed. Get a key at
[peppol.eleata.io](https://peppol.eleata.io).

## License

MIT
