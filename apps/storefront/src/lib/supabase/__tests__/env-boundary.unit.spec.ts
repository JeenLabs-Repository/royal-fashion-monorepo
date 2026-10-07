import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const STOREFRONT_ROOT = join(__dirname, "../../..")
const FORBIDDEN = /NEXT_PUBLIC_[A-Z0-9_]*(SERVICE|SECRET|service_role)[A-Z0-9_]*/i

function walkFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (
      name === "node_modules" ||
      name === ".next" ||
      name === "dist" ||
      name === ".turbo"
    ) {
      continue
    }
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      walkFiles(full, acc)
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs|env|example|template|md|json)$/i.test(name)) {
      acc.push(full)
    }
  }
  return acc
}

describe("Supabase env boundary (SESS-03)", () => {
  it("forbids SERVICE/SECRET/service_role in NEXT_PUBLIC_ key names under storefront", () => {
    const hits: string[] = []
    for (const file of walkFiles(STOREFRONT_ROOT)) {
      const text = readFileSync(file, "utf8")
      const match = text.match(FORBIDDEN)
      if (match) {
        hits.push(`${relative(STOREFRONT_ROOT, file)}: ${match[0]}`)
      }
    }
    assert.equal(
      hits.length,
      0,
      `Forbidden public secret key names:\n${hits.join("\n")}`
    )
  })
})
