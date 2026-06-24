# Running Kondor Sync Server on Windows

This guide explains how to run the Kondor sync server as a persistent background service on
Windows using only built-in tools. No third-party service managers are required.

---

## 1. Prerequisites

- Node.js 20+ installed and on PATH (`node --version` to confirm)
- The `server/` directory present with dependencies installed (`npm install`)

---

## 2. Prepare environment variables

Copy the example file and fill in your values:

```
copy server\.env.example server\.env
```

At minimum set a strong `JWT_SECRET`:

```
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the output into `JWT_SECRET=` in `.env`.

---

## 3. Register the server as a Windows startup task

Run this command once in an elevated (Administrator) PowerShell prompt. Adjust paths as needed.

```powershell
$serverDir = "C:\Users\YourName\Projects\Kondor\server"
$nodeExe   = (Get-Command node).Source

schtasks /Create /TN "KondorSyncServer" /TR `
  "$nodeExe $serverDir\node_modules\tsx\dist\cli.mjs $serverDir\src\index.ts" `
  /SC ONLOGON /RL HIGHEST /F `
  /ST 00:00 /SD 01/01/2000

# Set environment variables in the task (edit as needed)
$xml = (schtasks /Query /TN "KondorSyncServer" /XML) -join "`n"
# Easier: set them as user-level env vars instead:
[System.Environment]::SetEnvironmentVariable("JWT_SECRET",       "your-secret-here", "User")
[System.Environment]::SetEnvironmentVariable("GOOGLE_CLIENT_ID", "",                 "User")
[System.Environment]::SetEnvironmentVariable("GITHUB_CLIENT_ID", "",                 "User")
```

To start it immediately without rebooting:

```powershell
schtasks /Run /TN "KondorSyncServer"
```

To stop it:

```powershell
schtasks /End /TN "KondorSyncServer"
```

To remove it entirely:

```powershell
schtasks /Delete /TN "KondorSyncServer" /F
```

---

## 4. Open the firewall port

Allow inbound connections on port 3000 (or your `PORT` value):

```powershell
# Run in an elevated PowerShell prompt
netsh advfirewall firewall add rule `
  name="Kondor Sync Server" `
  dir=in `
  action=allow `
  protocol=TCP `
  localport=3000
```

To remove the rule later:

```powershell
netsh advfirewall firewall delete rule name="Kondor Sync Server"
```

---

## 5. Find your machine's local IP

For LAN access from other devices on the same network:

```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' }).IPAddress
```

In the Kondor app's Settings → Sync, enter:

```
http://192.168.x.x:3000
```

---

## 6. Remote access over the internet (recommended: Tailscale)

Port-forwarding your router exposes your machine directly to the internet. Instead, use
**Tailscale** — it creates a private, encrypted mesh network between your devices with a
stable hostname and automatic TLS (via MagicDNS + HTTPS certificates).

1. Install Tailscale on both the server machine and your phone/tablet:
   <https://tailscale.com/download>

2. Sign in to the same Tailscale account on both devices.

3. Each device gets a stable `100.x.x.x` address and a hostname like `my-pc.tailnet-name.ts.net`.

4. In the Kondor app, set the server URL to:

   ```
   https://my-pc.tailnet-name.ts.net:3000
   ```

   (Tailscale's HTTPS certificates work automatically with MagicDNS — no self-signed cert needed.)

5. No firewall rule for port 3000 is needed for Tailscale traffic — it tunnels through UDP 41641
   which is usually already open.

Benefits over port-forwarding:
- No public IP exposure
- Encrypted end-to-end
- Stable hostname even if your ISP changes your IP
- Free for personal use (up to 100 devices)

---

## 7. Setting CLIENT_ID / CLIENT_SECRET for OAuth

If you enable Google or GitHub login, set the credentials as user-level environment variables
so Task Scheduler picks them up:

```powershell
[System.Environment]::SetEnvironmentVariable("GOOGLE_CLIENT_ID",     "your-id",     "User")
[System.Environment]::SetEnvironmentVariable("GOOGLE_CLIENT_SECRET", "your-secret", "User")
[System.Environment]::SetEnvironmentVariable("GITHUB_CLIENT_ID",     "your-id",     "User")
[System.Environment]::SetEnvironmentVariable("GITHUB_CLIENT_SECRET", "your-secret", "User")
```

Restart the task after setting these:

```powershell
schtasks /End /TN "KondorSyncServer"
schtasks /Run /TN "KondorSyncServer"
```

---

## 8. Verify the server is running

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Expected response: `{ "status": "ok" }`
