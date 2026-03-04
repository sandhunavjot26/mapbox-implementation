# Figma → Cursor (Next.js) — Step-by-Step Process

Step-by-step guide so a **new person** can go from **Figma Desktop → Cursor → Next.js UI code** using **Figma Console MCP + Desktop Bridge plugin**, and optionally apply/bind design tokens so Figma and code share a single token source.

---

## Glossary


| Term                      | Meaning                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| **MCP server**            | Local process Cursor runs to talk to Figma (tools like `figma_get_status`, `figma_execute`, etc.). |
| **Desktop Bridge plugin** | Figma Desktop plugin that connects to the MCP server via WebSocket (ports 9223–9232).              |
| **fileUrl**               | Your Figma file URL, e.g. `https://www.figma.com/design/<fileKey>/...`                             |
| **nodeId**                | Figma node ID, e.g. `73:2171` (frame/component).                                                   |
| **Variable modes**        | Light/Dark (or others). Tokens can have different values per mode.                                 |


---

## Prerequisites (one-time)

- **Figma Desktop** installed (not browser-only).
- **Node.js 18+** installed.
- **Cursor** installed.
- A **Figma Personal Access Token** (PAT), starting with `figd_...`. Keep it private; do not commit it.

---

## Section 1 — Connect Figma to Cursor (MCP + Desktop plugin)

### 1A) Configure Cursor MCP

1. Open **Cursor** → **Settings** → **MCP and tools** → **Add new MCP**.
2. Add the Figma Console MCP server. Use the config from the [official repo](https://github.com/southleft/figma-console-mcp):
  - **Command:** `npx`
  - **Args:** `-y`, `figma-console-mcp@latest`
  - **Env:**  
    - `FIGMA_ACCESS_TOKEN` = your token (starts with `figd_...`)  
    - `ENABLE_MCP_APPS` = `true`
     Or paste this in the MCP config (e.g. when adding a custom server):
3. Wait until all resources are loaded (green flag / ready state).

### 1B) Download and install the Desktop Bridge plugin

Follow the steps from the [Figma Console MCP repo](https://github.com/southleft/figma-console-mcp) and the [Desktop Bridge folder](https://github.com/southleft/figma-console-mcp/tree/main/figma-desktop-bridge):

1. **Create a new folder** (e.g. `figma-desktop-bridge` or your project folder).
2. **Download the plugin** from:
  [https://github.com/southleft/figma-console-mcp/tree/main/figma-desktop-bridge](https://github.com/southleft/figma-console-mcp/tree/main/figma-desktop-bridge)  
   (Clone the repo and use the `figma-desktop-bridge` folder, or download the repo as ZIP and extract that folder. You need `manifest.json`, `code.js`, and `ui.html` in that folder.)
3. **Open the Figma Desktop app** (not the browser).
4. Go to **Plugins** → **Development** → **Import plugin from manifest…**.
5. **Select the manifest file** (`manifest.json`) from the folder you downloaded.
6. The plugin appears in Development plugins as **“Figma Desktop Bridge”**.

**After 1B — in the Figma application:**

- **Open Figma** (Desktop app).
- Turn on **Dev Mode** (required so the MCP and plugin stay running).
- Set **image source = download**. This allows exported images to overwrite existing files so you can overwrite Figma files / assets when re-running.
- Then start the MCP server locally (step 1C).

### 1C) Start the MCP server locally

In a terminal, run the Figma Console MCP server and **keep it running** (do not close the terminal):

```bash
npx figma-console-mcp
```

Leave this terminal open. The plugin in Figma will connect to this server.

### 1D) Start the bridge in your Figma file (each session)

1. Open the target Figma file.
2. Right-click → **Plugins** → **Development** → **Figma Desktop Bridge**.
3. Leave the plugin window open (it stays active).

### 1E) Verify connection from Cursor

In Cursor chat, ask the agent to run `**figma_get_status`**.

You should see connection status and an active transport (Desktop Bridge / WebSocket).

Optional: run `figma_capture_screenshot` or a small `figma_execute` call to confirm read/write.

---

## Section 2 — If Figma doesn't have tokens applied: create, add, and apply through Cursor

When Figma doesn't have tokens applied: **create the missing tokens**, add them in **both Figma and `tokens.ts`**, then **apply (bind) them through Cursor** using the Figma MCP tools. That keeps Figma and code in sync.

### 2A) Token source in this repo

- **Core tokens:** `tokens/output/tokens.ts`
- **Next.js app (UI):** `user-app/src/tokens/tokens.ts`
- **Re-export:** `src/token.ts`

Use `**user-app/src/tokens/tokens.ts`** as the single source of truth for parity: any token you add in Figma must also exist in `tokens.ts`, and vice versa.

### 2B) Create tokens that are not available

**1. Find what’s missing in Figma**

- In Cursor, use `**figma_get_variables`** (with your file open and Desktop Bridge running) to list existing Figma variables.
- Compare with the design: scan frames for raw colors, spacing, radius, etc. (e.g. via `**figma_get_file_data**` or `**figma_execute**`). Any value that has no matching variable is “missing.”

**2. Create missing tokens in Figma (through Cursor)**

- Use `**figma_setup_design_tokens`** to create a collection, modes, and up to **100 variables** per call.
- For more than 100: use `**figma_get_variables`** to get collection/mode IDs, then `**figma_batch_create_variables**` (and `**figma_batch_update_variables**` if you need to change values).

**3. Add the same tokens in `tokens.ts`**

- Edit `**user-app/src/tokens/tokens.ts**` and add the new token keys and values (color, spacing, radius, etc.) so they match what you created in Figma.
- Keep naming and values aligned so Figma variables and `tokens.ts` stay a single source of truth.

### 2C) Apply through Cursor

- **Bind** the new (and existing) variables to the design in Figma using MCP tools:
  - `**figma_execute`** to run plugin code that binds variable IDs to fills, strokes, padding, itemSpacing, corner radius, etc.
  - `**figma_capture_screenshot**` to verify after binding.
- Do this from Cursor chat or Plan Mode: ask the agent to “apply tokens from tokens.ts to this frame” or “bind variables to the current page.”

### 2D) What can be bound in Figma

From [figma-to-code-token-audit.md](figma-to-code-token-audit.md):

- **Bindable:** colors (fills, strokes), spacing (padding, itemSpacing), radius, strokeWeight (if FLOAT variables exist).
- **Not fully bindable:** typography, shadows/effects. Code should still use tokens for these.

---

## Section 3 — Apply/bind tokens to a Figma page (no UI change)

Goal: **same look**, but layers use **Variable bindings** instead of raw values.

### Workflow

1. **Get variables:** `figma_get_variables` (summary or standard first).
2. **Scan** the target frame(s) for raw values (fills, strokes, padding, radius).
3. **Match** raw values to token values (exact or small tolerance).
4. **Bind** via `**figma_execute`** (paint, layout, radius bindings).
5. **Verify:** `figma_capture_screenshot`; fix and re-run if needed (2–3 iterations).

Limitation: typography and effects are not fully bindable; code must use tokens for those.

---

## Section 4 — Cursor Plan Mode prompt (Figma → Next.js code)

Copy/paste into **Cursor Plan Mode** and fill the placeholders.

```
You are implementing a Figma design into our existing Next.js app.

## Hard rules (do not violate)
- ONLY change UI. Do NOT change business logic, state flows, API calls, routing, or SSO behavior.
- All changes must be inside `user-app/` (this is the Next.js app).
- Must support partner theming + dark/light:
  - Avoid hardcoded hex colors in inline styles.
  - Prefer CSS variables (e.g. var(--mainText), var(--green)) and existing theme patterns.
  - Follow user-app/docs/THEMING_AND_DARK_MODE.md.

## Token rules
- Use tokens from user-app/src/tokens/tokens.ts for spacing/radius/shadow/border/font/color where appropriate.
- If a value must be themeable (e.g. primary/CTA), use CSS vars like var(--green), not fixed token hex.

## Figma inputs
- Figma fileUrl: <PASTE_FIGMA_FILE_URL>
- Target frame(s)/component(s) nodeId(s): <PASTE_NODE_IDS>

## What to fetch from Figma (use MCP tools)
- For each target nodeId, call figma_get_component_for_development to get:
  - rendered image
  - layout + typography + visual properties
- For a full page, also use figma_get_file_data and take a screenshot.

## Implementation expectations
- Output a file-by-file plan first (which components/pages to edit, structure changes, how tokens + theming are preserved).
- Then implement the UI changes.
- Provide a parity checklist: spacing, typography, radii, borders, shadows, gradients, dark/light + partner theme notes.
```

---

## Section 5 — Troubleshooting


| Issue                                    | What to check                                                                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **figma_get_status shows not connected** | Figma Desktop (not web); Desktop Bridge plugin running in the open file; MCP server running (Cursor restarted after editing mcp.json). |
| **“No fileUrl available”**               | Pass `fileUrl` in the tool call, or open the file in Figma and run the Desktop Bridge plugin.                                          |
| **Plugin not in menu**                   | Plugins → Development → Refresh plugin list; re-import manifest if needed.                                                             |
| **Port conflicts**                       | MCP uses ports 9223–9232; restart MCP and plugin if something else uses them.                                                          |
| **Variables exist but nothing is bound** | Creating variables ≠ binding. Binding is done via figma_execute (Plugin API).                                                          |
| **100% Figma-to-code match**             | See [figma-to-code-token-audit.md](figma-to-code-token-audit.md) for what’s bindable and what remains code-only.                       |


---

## Repo references

- [docs/figma-to-code-token-audit.md](figma-to-code-token-audit.md) — What can/can’t be token-bound; remaining gaps.
- [tokens/output/tokens.ts](../tokens/output/tokens.ts) — Core design tokens.
- [user-app/src/tokens/tokens.ts](../user-app/src/tokens/tokens.ts) — Next.js app tokens.
- [src/token.ts](../src/token.ts) — Re-export of tokens.
- [figma-mcp-local/package.json](../figma-mcp-local/package.json) — Local Figma MCP dependency.
- [figma-mcp-local/node_modules/figma-console-mcp/figma-desktop-bridge/README.md](../figma-mcp-local/node_modules/figma-console-mcp/figma-desktop-bridge/README.md) — Desktop Bridge plugin usage.

