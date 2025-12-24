import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://casterfind.com/*"],
  world: "MAIN",
  run_at: "document_end"
}
