---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/logging-config-changes.html
---

# Logging configuration changes [logging-config-changes]

::::{warning}
{{kib}} 8.0.0 and later uses a new logging system. Before you upgrade, read the documentation for your {{kib}} version.
::::


$$$logging-pattern-format-old-and-new-example$$$

| Parameter | Log record in **pattern*** format | Legacy log record in ***text** format |
| --- | --- | --- |
| @timestamp | ISO8601_TZ `2012-01-31T23:33:22.011-05:00` | Absolute `23:33:22.011` |
| logger | `parent.child` | `['parent', 'child']` |
| level | `DEBUG` | `['debug']` |
| meta | stringified JSON object `{"to": "v8"}` | N/A |
| pid | can be configured as `%pid` | N/A |

$$$logging-json-format-old-and-new-example$$$

| Parameter | Log record in **json*** format | Legacy log record ***json** format |
| --- | --- | --- |
| @timestamp | ISO8601_TZ `2012-01-31T23:33:22.011-05:00` | ISO8601 `2012-01-31T23:33:22.011Z` |
| logger | `log.logger: parent.child` | `tags: ['parent', 'child']` |
| level | `log.level: DEBUG` | `tags: ['debug']` |
| meta | merged in log record  `{... "to": "v8"}` | merged in log record  `{... "to": "v8"}` |
| pid | `process.pid: 12345` | `pid: 12345` |
| type | N/A | `type: log` |
| error | `{ message, name, stack }` | `{ message, name, stack, code, signal }` |
