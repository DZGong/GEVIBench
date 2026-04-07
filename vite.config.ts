import path from "path"
import fs from "fs"
import { execSync } from "child_process"
import react from "@vitejs/plugin-react"
import { defineConfig, Plugin } from "vite"
import sourceIdentifierPlugin from 'vite-plugin-source-identifier'

function geviGitDatesPlugin(): Plugin {
  const virtualId = 'virtual:gevi-git-dates'
  const resolvedId = '\0' + virtualId
  return {
    name: 'gevi-git-dates',
    resolveId(id) { if (id === virtualId) return resolvedId },
    load(id) {
      if (id !== resolvedId) return
      const dir = path.resolve(__dirname, 'src/gevis')
      const dates: Record<string, string> = {}
      for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
        const fp = path.join(dir, f)
        const name = f.replace('.json', '')
        try {
          const d = execSync(`git log -1 --format='%ai' -- "${fp}"`, { encoding: 'utf8' }).trim()
          dates[name] = d.split(' ')[0]
        } catch { dates[name] = '' }
      }
      return `export default ${JSON.stringify(dates)}`
    }
  }
}

const isProd = process.env.BUILD_MODE === 'prod'
export default defineConfig({
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0]),
  },
  plugins: [
    geviGitDatesPlugin(),
    react(),
    ...(isProd ? [sourceIdentifierPlugin({
      enabled: true,
      attributePrefix: 'data-matrix',
      includeProps: true,
    })] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
