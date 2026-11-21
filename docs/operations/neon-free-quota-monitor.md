# Neon Free quota monitor

The `Neon quota monitor` GitHub Actions workflow checks the Lunidex project once per day and on manual dispatch. It calls only `GET /api/v2/projects/{project_id}` on Neon's Management API. It does not connect to Postgres or call Neon Auth, so the monitor does not wake the database compute.

The report warns when compute reaches 50%, 75%, or 90% of 100 CU-hours, or public egress reaches the same percentages of 5 GB. A check at 90% or higher fails visibly; missing credentials, an API error, or missing usage fields are reported as `INCOMPLETE`, never as healthy.

## One-time owner setup

The repository does not currently have a Neon API key for this monitor. Before merging/enabling the schedule:

1. In Neon, create an organization API key scoped to the Lunidex project `withered-block-08834461` with the `Viewer` project permission. Neon documents `Viewer` as read-only access to project metadata and settings.
2. In GitHub, create the environment `neon-quota-monitor` and add the key as an environment secret named `NEON_API_KEY`.
3. Do not put the key in workflow YAML, repository variables, this document, or a chat message. Revoke the key in Neon if it is exposed.
4. Run **Actions → Neon quota monitor → Run workflow** once and confirm the summary contains valid compute and egress metrics.

Until the secret is configured, scheduled/manual runs deliberately fail as `INCOMPLETE`; they do not silently report `GO`. GitHub workflow warnings and summaries are the alert surface. GitHub email notifications depend on the owner's Actions notification preferences.
