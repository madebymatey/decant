import { useEffect, useRef, useState } from "react"
import { framer, type ManagedCollection } from "framer-plugin"
import { loadCollectionConfig, syncDataset, type Dataset } from "./sync"
import { inspectCollections } from "./inspect"

const DEFAULT_BASE_URL = "https://template-withwine.vercel.app"

const mode = framer.mode
const isSyncMode = mode === "syncManagedCollection"
const isConfigureMode = mode === "configureManagedCollection"
const isCollectionMode = isSyncMode || isConfigureMode

export function App() {
  const [collection, setCollection] = useState<ManagedCollection | null>(null)
  const [dataset, setDataset] = useState<Dataset>("wineTypes")
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL)
  const [feedKey, setFeedKey] = useState("")
  const [busy, setBusy] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const ranAuto = useRef(false)

  const append = (message: string) => setLog((prev) => [...prev, message])

  // Core sync used by both the manual button and the headless auto-run.
  async function runSync(
    active: ManagedCollection,
    ds: Dataset,
    url: string,
    key: string | undefined,
    closeOnDone: boolean
  ) {
    setBusy(true)
    setLog([])
    try {
      await syncDataset(ds, active, url, key, append)
      framer.notify(`${label(ds)} synced`, { variant: "success" })
      if (closeOnDone) await framer.closePlugin()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      append(`Error: ${message}`)
      framer.notify("Sync failed — see plugin log", { variant: "error" })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!isCollectionMode) return
    let cancelled = false
    framer.getActiveManagedCollection().then(async (active) => {
      if (cancelled) return
      setCollection(active)
      const config = await loadCollectionConfig(active)
      if (config) {
        setDataset(config.dataset)
        setBaseUrl(config.baseUrl)
        setFeedKey(config.feedKey ?? "")
        // Framer triggered a re-sync (the automation hook): run headless and
        // close. Manual setup happens in configure mode instead.
        if (isSyncMode && !ranAuto.current) {
          ranAuto.current = true
          await runSync(active, config.dataset, config.baseUrl, config.feedKey, true)
        }
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleInspect() {
    if (busy) return
    setBusy(true)
    setLog([])
    try {
      await inspectCollections(append)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      append(`Error: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  // Canvas mode: not a sync context — show guidance + diagnostics.
  if (!isCollectionMode) {
    return (
      <main style={page}>
        <p style={{ margin: 0 }}>
          This is a CMS sync plugin. Open it from a CMS Collection:
        </p>
        <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
          <li>Create a new CMS Collection.</li>
          <li>Choose to sync it with <strong>Decant Sync</strong>.</li>
          <li>Sync <strong>Wine Types</strong> (and <strong>Varietals</strong>) first, then <strong>Products</strong>.</li>
        </ol>

        <hr style={divider} />

        <p style={{ margin: 0, color: "var(--framer-color-text-secondary)" }}>
          Diagnostics: dump every collection's fields + sample items (ids, slugs,
          names).
        </p>
        <button type="button" onClick={handleInspect} disabled={busy} style={button}>
          {busy ? "Reading…" : "Inspect collections"}
        </button>

        {log.length > 0 && <pre style={logBox}>{log.join("\n")}</pre>}
      </main>
    )
  }

  return (
    <main style={page}>
      <p style={{ margin: 0, color: "var(--framer-color-text-secondary)" }}>
        Sync a dataset into this collection. Sync <strong>Wine Types</strong> and{" "}
        <strong>Varietals</strong> before <strong>Products</strong> so references
        can link. Your choice is saved, so Framer's <em>Sync</em> button re-runs
        it automatically.
      </p>

      <label style={fieldLabel}>
        Dataset
        <select
          value={dataset}
          onChange={(e) => setDataset(e.target.value as Dataset)}
          disabled={busy}
          style={input}
        >
          <option value="wineTypes">Wine Types</option>
          <option value="varietals">Varietals</option>
          <option value="products">Products</option>
        </select>
      </label>

      <label style={fieldLabel}>
        Feed base URL
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={DEFAULT_BASE_URL}
          disabled={busy}
          style={input}
        />
      </label>

      <label style={fieldLabel}>
        Feed key (optional)
        <input
          type="password"
          value={feedKey}
          onChange={(e) => setFeedKey(e.target.value)}
          placeholder="only if FEED_KEY is set"
          disabled={busy}
          style={input}
        />
      </label>

      <button
        type="button"
        onClick={() =>
          collection &&
          runSync(collection, dataset, baseUrl.trim(), feedKey.trim() || undefined, false)
        }
        disabled={busy || !collection || baseUrl.trim().length === 0}
        style={{ ...button, opacity: busy ? 0.6 : 1 }}
      >
        {busy ? "Syncing…" : `Sync ${label(dataset)}`}
      </button>

      {log.length > 0 && <pre style={logBox}>{log.join("\n")}</pre>}
    </main>
  )
}

const label = (d: Dataset) =>
  d === "wineTypes" ? "Wine Types" : d === "varietals" ? "Varietals" : "Products"

const page: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  padding: 12,
  height: "100%",
  boxSizing: "border-box",
  fontSize: 12,
}

const divider: React.CSSProperties = {
  width: "100%",
  border: "none",
  borderTop: "1px solid var(--framer-color-divider)",
}

const fieldLabel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 11,
  color: "var(--framer-color-text-secondary)",
}

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
}

const button: React.CSSProperties = {
  width: "100%",
  cursor: "pointer",
}

const logBox: React.CSSProperties = {
  margin: 0,
  marginTop: "auto",
  padding: 8,
  fontSize: 11,
  lineHeight: 1.5,
  background: "var(--framer-color-bg-secondary)",
  borderRadius: 8,
  overflow: "auto",
  whiteSpace: "pre-wrap",
}
