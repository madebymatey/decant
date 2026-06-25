export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", maxWidth: 640 }}>
      <h1>WithWine → Framer middleware</h1>
      <p>
        This is an API-only middleware deployment. It exposes origin- and
        token-protected JSON endpoints that a Framer code component consumes.
      </p>
      <ul>
        <li>
          <code>POST /api/token</code> — issue a short-lived, origin-bound token
        </li>
        <li>
          <code>GET /api/products</code> — Framer-ready product list
        </li>
        <li>
          <code>GET /api/products/:id</code> — single product
        </li>
        <li>
          <code>GET /api/health</code> — liveness probe
        </li>
      </ul>
    </main>
  )
}
