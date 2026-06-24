# Kondor — Self-hosting the Web PWA

This guide explains how to build the Kondor web app, serve it as a Progressive Web App
(PWA), and optionally run it alongside the sync server on the same Windows machine.

---

## 1. Build the web app

From the project root:

```bash
npx expo export --platform web
```

Output lands in **`dist/`**. This folder is fully static — no server-side rendering
required. It includes:

- `index.html` — the app shell
- `sw.js` — service worker for offline support
- `icon-192.png`, `icon-512.png` — PWA icons
- `_expo/static/` — hashed JS/CSS bundles

---

## 2. Serve locally (quickest option)

```bash
npx serve dist
```

`serve` starts a local HTTP server on **port 3000** by default (pass `-p 8080` to use
port 8080). Open `http://localhost:3000` in Chrome or Edge.

For a permanent local server on a different port:

```bash
npx serve dist -p 8080
```

---

## 3. Run the web app alongside the sync server

The Fastify sync server runs on port **3000**; serve the web app on port **8080**
so both coexist on the same machine:

| Service     | Port | Command                                |
|-------------|------|----------------------------------------|
| Sync server | 3000 | `cd server && npm start`               |
| Web PWA     | 8080 | `npx serve dist -p 8080`              |

In the Kondor app's **Settings → Sync**, enter the server URL as:

```
http://localhost:3000
```

(or the machine's LAN IP / Tailscale hostname for cross-device access).

---

## 4. Install as PWA from Chrome

1. Open `http://localhost:8080` (or your server's address) in **Chrome** or **Edge**.
2. Wait for the page to fully load — the service worker registers in the background.
3. In Chrome: click the **⋮ menu → Cast, save and share → Install Kondor…**
   In Edge: click the **⊕ icon** in the address bar, then **Install**.
4. Kondor opens in its own window, with no browser chrome, just like a native app.
5. The icon appears on your desktop and in the Start menu.

> **Note:** Chrome requires the site to be served over **HTTPS** *or* from
> `localhost` / `127.0.0.1` to allow PWA installation. For LAN / remote access,
> use Tailscale (which provides automatic HTTPS via MagicDNS) — see
> `server/WINDOWS_SERVER.md` for setup instructions.

---

## 5. Open the firewall for port 8080

To allow other devices on your LAN to reach the web app, run this in an elevated
PowerShell prompt:

```powershell
netsh advfirewall firewall add rule `
  name="Kondor Web PWA" `
  dir=in `
  action=allow `
  protocol=TCP `
  localport=8080
```

To remove the rule later:

```powershell
netsh advfirewall firewall delete rule name="Kondor Web PWA"
```

---

## 6. Find your machine's local IP

```powershell
(Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }).IPAddress
```

Share `http://192.168.x.x:8080` with devices on the same network.

---

## 7. Offline usage

The service worker caches the app shell and all static assets on the first visit.
After that, Kondor loads and runs **completely offline** — the local SQLite database
(OPFS-backed in the browser) holds all your decks, cards, and review history.

Sync to the server only requires connectivity at sync time; everything else works
without a network connection.

---

## 8. Running the web server as a Windows startup task

Use the same Task Scheduler approach described in `server/WINDOWS_SERVER.md`,
substituting the `serve` command:

```powershell
$distDir = "C:\Users\YourName\Projects\Kondor\dist"

schtasks /Create /TN "KondorWebPWA" /TR `
  "npx serve $distDir -p 8080" `
  /SC ONLOGON /RL HIGHEST /F

schtasks /Run /TN "KondorWebPWA"
```

---

## 9. Production hosting (optional)

The `dist/` output can be deployed to any static host:

| Host              | Command / method                                          |
|-------------------|-----------------------------------------------------------|
| **Cloudflare Pages** | `npx wrangler pages deploy dist`                       |
| **Netlify**       | Drag-and-drop `dist/` in the Netlify dashboard            |
| **Vercel**        | `vercel dist`                                             |
| **GitHub Pages**  | Push `dist/` to `gh-pages` branch                        |
| **nginx**         | `root /path/to/dist;` + `try_files $uri /index.html;`    |

For any production host, the sync server still needs to run separately (see
`server/WINDOWS_SERVER.md`). Set CORS on the sync server to allow the hosting
domain by updating `@fastify/cors` in `server/src/app.ts`.
