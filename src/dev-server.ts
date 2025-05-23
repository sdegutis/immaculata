import { EventEmitter } from "events"
import * as http from "http"
import * as mimetypes from 'mime-types'
import * as path from 'path'

export class DevServer {

  public files: Map<string, Buffer | string> | undefined
  public notFound?: (path: string) => string

  public reload = (data?: any) => this.events.emit('reload', data ?? {})
  private events = new EventEmitter<{ reload: [data: any] }>();
  private reloadables = new Set<http.ServerResponse>()

  public constructor(port: number, opts?: {
    hmrPath?: string,
    prefix?: string,
    onRequest?: (res: http.ServerResponse) => 'handled' | void,
  }) {
    const hmrPath = opts?.hmrPath

    if (hmrPath) {
      this.events.on('reload', (data) => {
        for (const client of this.reloadables) {
          console.log('Notifying SSE connection')
          client.write(`data: ${JSON.stringify(data)}\n\n`)
        }
      })
    }

    const server = http.createServer((req, res) => {
      if (opts?.onRequest?.(res) === 'handled') return

      let url = req.url!.split('?')[0]!

      if (opts?.prefix) {
        const prefix = opts.prefix

        if (!url.startsWith(prefix)) {
          res.statusCode = 404
          res.end(`Error: Routes must begin with "${prefix}"`)
          return
        }

        url = url.slice(prefix.length)
      }

      if (url === hmrPath) {
        res.once('close', () => {
          this.reloadables.delete(res)
        })
        res.setHeader('connection', 'keep-alive')
        res.setHeader('content-type', 'text/event-stream')
        res.setHeader('cache-control', 'no-cache')
        res.flushHeaders()
        this.reloadables.add(res)
        return
      }

      let found = (
        this.getFile(url) ??
        this.getFile(path.posix.join(url, 'index.html'))
      )

      if (!found) {
        res.statusCode = 404
        found = this.notFound ? this.getFile(this.notFound(req.url!)) : undefined
        res.end(found?.blob ?? 'File not found')
        return
      }

      res.statusCode = 200
      const contentType = mimetypes.contentType(path.extname(found.url))
      res.setHeader('content-type', contentType || 'application/octet-stream')
      res.end(found.blob)
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

  private getFile(url: string) {
    const content = this.files?.get(url)
    return content ? { url, blob: content } : undefined
  }

}
