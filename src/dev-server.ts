import * as chokidar from 'chokidar'
import * as http from "http"
import * as mimetypes from 'mime-types'
import * as path from 'path'
import { Runtime } from './runtime.ts'

export function startDevServer(runtime: Runtime, config?: {
  port?: number,
  ignore?: (path: string) => boolean,
  hmrPath?: string,
}) {
  const server = new Server()
  server.startServer(config?.port ?? 8080, config?.hmrPath)

  server.handlers = runtime.handlers

  const outfiles = runtime.build()
  server.files = outfiles

  const updatedPaths = new Set<string>()
  let reloadFsTimer: NodeJS.Timeout

  const pathUpdated = (filePath: string) => {
    updatedPaths.add(filePath.split(path.sep).join(path.posix.sep))
    clearTimeout(reloadFsTimer)
    reloadFsTimer = setTimeout(() => {
      console.log('Updated:', [...updatedPaths].map(p => '\n  ' + p).join(''))
      console.log('Rebuilding site...')

      try {
        runtime.pathsUpdated(...updatedPaths)

        const outfiles = runtime.build()
        server.files = outfiles

        updatedPaths.clear()
        server.events.dispatchEvent(new Event('rebuilt'))
      }
      catch (e) {
        console.error(e)
      }

      console.log('Done.')
    }, 100)
  };

  (chokidar.watch('package.json', {
    ignoreInitial: true,
    cwd: process.cwd(),
  })
    .on('change', pathUpdated))

  const opts: chokidar.WatchOptions = {
    ignoreInitial: true,
    cwd: process.cwd(),
  }

  if (config?.ignore) opts.ignored = config.ignore;

  (chokidar.watch(runtime.siteDir, opts)
    .on('add', pathUpdated)
    .on('change', pathUpdated)
    .on('unlink', pathUpdated))
}

class Server {

  files: Map<string, Uint8Array | string> | undefined
  handlers?: Map<string, (body: string) => string> | undefined

  events = new EventTarget();

  #reloadables = new Set<http.ServerResponse>()

  startServer(port: number, hmrPath?: string) {
    if (hmrPath) {
      this.events.addEventListener('rebuilt', () => {
        for (const client of this.#reloadables) {
          console.log('Notifying SSE connection')
          client.write('data: {}\n\n')
        }
      })
    }

    const server = http.createServer((req, res) => {
      const url = req.url!.split('?')[0]!

      if (url === hmrPath) {
        res.once('close', () => {
          this.#reloadables.delete(res)
        })
        res.setHeader('connection', 'keep-alive')
        res.setHeader('content-type', 'text/event-stream')
        res.setHeader('cache-control', 'no-cache')
        res.flushHeaders()
        this.#reloadables.add(res)
        return
      }

      if (req.method === 'POST') {
        const handler = this.handlers?.get(url)
        if (handler) {
          const data: Uint8Array[] = []
          req.on('data', (chunk) => {
            data.push(chunk)
          })
          req.on('end', () => {
            let redirect: string
            this.events.addEventListener('rebuilt', () => {
              res.statusCode = 302
              res.setHeader('Location', redirect)
              res.end()
            }, { once: true })
            const body = Buffer.concat(data).toString('utf8')
            redirect = handler(body)
          })
        }
        return
      }

      const getFile = (url: string) => {
        const content = this.files?.get(url)
        return content && { url, blob: content }
      }

      const found = (
        getFile(url) ??
        getFile(path.posix.join(url, 'index.html'))
      )

      if (found) {
        res.statusCode = 200
        const contentType = mimetypes.contentType(path.extname(found.url))
        res.setHeader('content-type', contentType || 'application/octet-stream')
        res.end(found.blob)
      }
      else {
        res.statusCode = 404
        res.end('File not found')
      }
    })

    server.listen(port)

    server.on('error', (e: Error & { code: string }) => {
      if (e.code === 'EADDRINUSE') {
        console.log(`Port ${port} in use, trying ${port + 1}`)
        server.once('close', () => {
          port++
          server.listen(port)
        })
        server.close()
      }
    })

    server.on('listening', () => {
      console.log(`Running on http://localhost:${port}`)
    })
  }

}
