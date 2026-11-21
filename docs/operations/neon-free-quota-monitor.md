# Neon Free quota monitor

The `Neon quota monitor` GitHub Actions workflow checks the Lunidex project once per day and on manual dispatch. It calls only `GET /api/v2/projects/{project_id}` on Neon's Management API. It does not connect to Postgres or call Neon Auth, so the monitor does not wake the database compute.

The report warns when compute reaches 50%, 75%, or 90% of 100 CU-hours, or public egress reaches the same percentages of 5 GB. Reaching any threshold fails the workflow, which creates a native GitHub Actions failed-run notification; 90% also emits an error annotation. Missing credentials, an API error, or missing usage fields are reported as `INCOMPLETE`, never as healthy.

## One-time owner setup

The repository does not currently have a Neon API key for this monitor. A project-scoped organization API key is not suitable: Neon currently grants those keys `Editor` access, which is broader than this read-only monitor needs. Personal API keys inherit the memberships and permissions of their owner.

The project owner must authorize and perform the Neon account setup. The monitor remains `INCOMPLETE` until the required secret is configured; do not invite a member or create/configure a key as part of this code change.

1. In GitHub, explicitly create the `neon-quota-monitor` environment before the first scheduled run. Repository environment metadata currently shows that it does not exist. A workflow run referencing a missing environment creates it implicitly, but that implicit environment has no secrets or protection rules. If available, restrict its deployment branches to `master`.
2. Have the owner create or invite a dedicated Neon user whose organization role is `Collaborator`. Neon describes `Collaborator` as having no default access to organization settings or projects.
3. Grant that user the `Viewer` role only on the Lunidex project `withered-block-08834461`. Confirm the dedicated user has no other organization or project memberships, since a personal API key inherits all of its owner's access. Neon lists project role permissions in its [organization and project permissions documentation](https://neon.com/blog/neon-now-has-per-project-permissions).
4. As that dedicated user, create a personal Neon API key. Do not create a project-scoped organization API key (`Editor` access) or use an administrator's personal key. See Neon's [API key documentation](https://neon.com/docs/manage/orgs-api).
5. Add the personal key only to the `neon-quota-monitor` environment as a secret named `NEON_API_KEY`; do not add it as a repository-wide secret. Do not put it in workflow YAML, repository variables, this document, or a chat message. Revoke the key in Neon if it is exposed.
6. Run **Actions → Neon quota monitor → Run workflow** once and confirm the summary contains valid compute and egress metrics. A 403, missing metrics, or absent secret must remain `INCOMPLETE` and must not be treated as a successful check.

Until the secret is configured, scheduled/manual runs deliberately fail as `INCOMPLETE`; they do not silently report `GO`.

## Receive notifications

To receive threshold alerts, watch the Lunidex repository and enable GitHub Actions notifications in **GitHub → Settings → Notifications → System → Actions**. Select **Email** or **On GitHub**; **Only notify for failed workflows** is sufficient because threshold crossings fail the workflow. See [GitHub's Actions notification settings](https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications).

GitHub sends scheduled workflow notifications to the account that initially created the workflow schedule. Ensure the account that should receive these alerts creates or updates the schedule. The monitor runs daily and does not persist prior alert state, so it may send one failed-run notification per day while usage remains at or above 50% until the quota resets.
