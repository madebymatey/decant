import React from "react"
import ReactDOM from "react-dom/client"
import { framer } from "framer-plugin"
import "framer-plugin/framer.css"
import { App } from "./App"

framer.showUI({
  position: "top right",
  width: 320,
  height: 420,
})

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
