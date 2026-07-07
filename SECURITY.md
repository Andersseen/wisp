# Security Policy

## Supported Versions

Wisp is currently in active pre-v1 development. Only the latest commit on the
`main` branch receives security updates. Once we ship v1, this section will list
explicitly supported release branches.

| Version | Supported          |
| ------- | ------------------ |
| < 1.0   | :white_check_mark: latest `main` only |

## Reporting a Vulnerability

We take security issues seriously. If you discover a vulnerability, please
report it privately so we can fix it before public disclosure.

**Preferred channel**: Open a [GitHub Security Advisory][advisory] on this
repository. This keeps the report confidential and allows threaded discussion.

**Alternative channel**: Email the maintainer directly at
<andriipap01@gmail.com> with the subject `[Wisp Security]`.

Please include as much of the following as possible:

- A clear description of the vulnerability
- Steps to reproduce or a proof-of-concept
- Affected versions, files, or configuration paths
- Potential impact
- Suggested remediation, if any

## Disclosure Timeline

1. **Acknowledgment** — We will acknowledge receipt within 72 hours.
2. **Investigation** — We will validate and scope the issue, usually within one
   week.
3. **Fix & release** — We will prepare and merge a fix to `main` via a private
   security advisory or coordinated pull request.
4. **Public disclosure** — Once the fix is available, we will publish a security
   advisory and update `CHANGELOG.md` with credit to the reporter (unless
   anonymity is requested).

We follow responsible disclosure and ask reporters to keep vulnerabilities
confidential until a fix is released.

[advisory]: https://github.com/Andersseen/wisp/security/advisories/new
