# Infrastructure

The production topology keeps `api-enhanced` private and exposes only the Gateway.

- Pin a verified `api-enhanced` release or immutable commit.
- Keep解灰/绕过访问控制能力 explicitly disabled in deployment configuration.
- Store Gateway secrets in environment/secret management, never in the mobile bundle.
- Keep local temporary files under `D:\\tmp\\siplayer`.
