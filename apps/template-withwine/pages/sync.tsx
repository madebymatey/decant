import { useEffect, useState } from "react"

type SyncCounts = {
  wineTypes: number
  varietals: number
  vintages: number
  regions: number
  products: number
}

/**
 * Minimal admin page to trigger a manual Framer CMS sync — the "Sync now"
 * button. POSTs to /api/sync/run with your SYNC_KEY as a Bearer token.
 *
 * The key is stored only in your browser (localStorage), never in the code.
 */
export default function SyncPage() {
  const [key, setKey] = useState("")
  const [busy, setBusy] = useState(false)
  const [counts, setCounts] = useState<SyncCounts | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setKey(localStorage.getItem("decant:syncKey") ?? "")
  }, [])

  async function syncNow() {
    if (busy) return
    setBusy(true)
    setCounts(null)
    setError(null)
    localStorage.setItem("decant:syncKey", key)
    try {
      const res = await fetch("/api/sync/run", {
        method: "POST",
        headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      })
      const json = await res.json()
      if (json.ok) setCounts(json.result as SyncCounts)
      else setError(typeof json.error === "string" ? json.error : JSON.stringify(json))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={page}>
      <h1 style={{ fontSize: 18, margin: 0 }}>Decant → Framer Sync</h1>
      <p style={{ margin: 0, color: "#666", fontSize: 13 }}>
        Manually push the catalog into Framer CMS. Uses the same engine as the
        scheduled cron.
      </p>

      <label style={label}>
        Sync key
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="your SYNC_KEY"
          disabled={busy}
          style={input}
        />
      </label>

      <button type="button" onClick={syncNow} disabled={busy || !key} style={button}>
        {busy ? (
          <>
            <span className="spinner" /> Syncing…
          </>
        ) : (
          "Sync now"
        )}
      </button>

      {busy && (
        <div style={statusRow}>
          <span className="spinner spinner-dark" />
          <span>Syncing catalog → Framer… this can take a minute.</span>
        </div>
      )}

      {counts && (
        <div style={{ ...statusBox, borderColor: "#16a34a55", background: "#16a34a11" }}>
          <strong style={{ color: "#15803d" }}>✓ Sync complete</strong>
          <ul style={countList}>
            <li>Products: <b>{counts.products}</b></li>
            <li>Wine Types: <b>{counts.wineTypes}</b></li>
            <li>Varietals: <b>{counts.varietals}</b></li>
            <li>Vintages: <b>{counts.vintages}</b></li>
            <li>Regions: <b>{counts.regions}</b></li>
          </ul>
        </div>
      )}

      {error && (
        <div style={{ ...statusBox, borderColor: "#dc262655", background: "#dc262611" }}>
          <strong style={{ color: "#b91c1c" }}>Sync failed</strong>
          <pre style={pre}>{error}</pre>
        </div>
      )}

      <style jsx>{`
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: -2px;
          margin-right: 6px;
        }
        .spinner-dark {
          border-color: rgba(89, 79, 238, 0.25);
          border-top-color: #594fee;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  )
}

const page: React.CSSProperties = {
  maxWidth: 520,
  margin: "60px auto",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
  fontFamily: "system-ui, sans-serif",
}
const label: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "#444",
}
const input: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
}
const button: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  background: "#594FEE",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
}
const statusRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  fontSize: 13,
  color: "#555",
}
const statusBox: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 8,
  padding: 12,
  fontSize: 13,
  display: "flex",
  flexDirection: "column",
  gap: 8,
}
const countList: React.CSSProperties = {
  margin: 0,
  paddingLeft: 18,
  lineHeight: 1.7,
  color: "#333",
}
const pre: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  color: "#7f1d1d",
}
