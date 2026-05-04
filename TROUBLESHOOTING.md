# Troubleshooting

Common environment / deployment issues and concrete fixes. For
configuration basics, see the main [README](README.md).

---

## Local dev

### `EADDRINUSE: address already in use :::5174`
Another process is on the Vite port. Either stop it or change the port:

```bash
# Find and stop the other listener (Linux/macOS)
lsof -iTCP:5174 -sTCP:LISTEN
kill <PID>

# Or run Vite on a different port
npm run dev -- --port 5175
```

### Tests fail with `Cannot find module '@testing-library/react'`
You installed with `--production`. Re-install dev deps:

```bash
npm ci
```

---

## Docker

The container layout (see [Dockerfile](Dockerfile) / [docker-compose.yml](docker-compose.yml)):

| | |
| --- | --- |
| Nginx port inside container | **8080** (unprivileged) |
| Host port published | **80** (overridable) |
| Health check | `GET /health` → `200 ok` |
| Filesystem | read-only, with writable tmpfs for nginx cache |

### `permission denied while trying to connect to the Docker daemon socket`
Your user is not in the `docker` group.

```bash
sudo usermod -aG docker "$USER"
newgrp docker            # apply in current shell, no logout needed
docker ps                # should now work without sudo
```

If that still fails (e.g. shared VM), check the socket:

```bash
ls -l /var/run/docker.sock
sudo systemctl status docker
```

### `docker-compose: command not found`
Modern Docker ships Compose as a subcommand (note: no hyphen):

```bash
docker compose up -d
```

If you need the standalone binary:

```bash
# Ubuntu / Debian
sudo apt-get install -y docker-compose-plugin
```

### `bind: address already in use` on port 80
Something else (often another nginx / apache) is using 80. Options:

```bash
# See what holds the port
sudo ss -tlnp sport = :80

# Publish on a different host port instead
docker run -d -p 8080:8080 --name edgeone edgeone-pricing-calculator
# then open http://host:8080/
```

Or edit `docker-compose.yml`:

```yaml
ports:
  - "8080:8080"   # host:container
```

### `listen EACCES: permission denied 0.0.0.0:80` (running `reverse-proxy.js`)
Binding to port 80 requires root on Linux. Three options:

1. Run the proxy on `8080` (the default now) and let Nginx/another proxy
   publish 80 for you.
2. Grant Node the capability once (persists for that binary):
   ```bash
   sudo setcap 'cap_net_bind_service=+ep' "$(which node)"
   ```
3. Run with `sudo npm start` (simplest, but the process owns as root).

### Container starts then the healthcheck stays `starting` forever
Hit the endpoint directly to see the error:

```bash
docker exec -it edgeone-pricing-calculator wget -qO- http://127.0.0.1:8080/health
docker logs edgeone-pricing-calculator
```

Most common causes:
- nginx failed to start because `nginx.conf` has a syntax error → the logs
  will show the failing directive.
- The image was rebuilt without `dist/` being regenerated. Run `npm run build`
  before `docker build`, or use the provided [build-docker.sh](build-docker.sh).

---

## DevCloud / remote VM

### Domain on a custom port returns 403
DevCloud's ingress only forwards standard ports (`80`, `443`) through the
public `*.devcloud.woa.com` domain. Direct URLs like
`http://<host>.devcloud.woa.com:5174/` are not proxied and will 403.

Fixes, in order of preference:

1. **Deploy with Docker** (maps host `80` → container `8080`) so the domain
   works with no port suffix.
2. **Use the reverse proxy** (`npm run proxy`, see above) to forward `:80`
   to the Vite dev server on `:5174`.
3. **Use the VM's direct IP** with the Vite port (`http://<vm-ip>:5174/`) —
   this bypasses the domain ingress entirely. IP-based URLs are not rewritten,
   so this works in most DevCloud pools.

### Hot reload (HMR) doesn't work behind the proxy
By default Vite's HMR uses the same origin. When proxying through `:80`, the
WebSocket may be blocked. Pass an explicit client hostname:

```bash
npm run dev -- --host 0.0.0.0 --hmr-host <your-public-hostname>
```

---

## Data / state

### `ErrorBoundary` shows "Something went wrong" on load
A corrupted `localStorage` draft broke deserialization. The boundary's
**Reset saved drafts** button clears both keys:

```text
edgeone_calculator_drafts
edgeone_calculator_active_draft
```

You can also clear them manually from DevTools ▸ Application ▸ Local Storage.

### All my drafts disappeared
Drafts live only in the browser's `localStorage`. Clearing site data, using
incognito, or switching browsers removes them. There is no server-side
backup. If your team needs persistence, see the "Sharable URLs" /
"Saved exports history" items in the [enhancement ideas](README.md#contributing--enhancement-ideas).
