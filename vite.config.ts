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

// Dev-only: lets the Family Tree drag editor persist node positions to
// src/familyTreeLayout.json. Runs only under `vite` (apply: 'serve'), so the
// endpoint never exists in the production build — the editor cannot write in prod.
function familyTreeLayoutPlugin(): Plugin {
  const layoutFile = path.resolve(__dirname, 'src/familyTreeLayout.json')
  return {
    name: 'family-tree-layout-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__family-layout', (req, res) => {
        // GET: return the live on-disk overrides. The editor fetches this on mount
        // so a manual reload reflects the latest saved layout even though the file
        // is excluded from the watcher (writes below must not trigger an HMR reload).
        if (req.method === 'GET') {
          let contents = '{}'
          try { contents = fs.readFileSync(layoutFile, 'utf8') } catch { /* use default */ }
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(contents)
          return
        }
        if (req.method !== 'POST') { res.statusCode = 405; res.end('method not allowed'); return }
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body)
            fs.writeFileSync(layoutFile, JSON.stringify(parsed, null, 2) + '\n')
            res.statusCode = 200; res.end('ok')
          } catch {
            res.statusCode = 400; res.end('invalid json')
          }
        })
      })
    },
  }
}

const isProd = process.env.BUILD_MODE === 'prod'
export default defineConfig({
  define: {
    __BUILD_DATE__: JSON.stringify(new Date().toISOString().split('T')[0]),
  },
  // Writing familyTreeLayout.json from the editor must not trigger an HMR reload
  // (that would drop edit-mode state mid-session); the in-memory state is the
  // source of truth during a session, the file is just for commit + next load.
  server: {
    watch: { ignored: ['**/src/familyTreeLayout.json'] },
  },
  plugins: [
    geviGitDatesPlugin(),
    familyTreeLayoutPlugin(),
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
