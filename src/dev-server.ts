import * as http from "http"
import * as mimetypes from 'mime-types'
import * as path from 'path'

/**
 * Simple, robust dev server compatible with LiveTree.
 * 
 * Customizable SSE route and POST event handlers.
 */
export class DevServer {

  public files: Map<string, Buffer | string> | undefined
  public handlers?: Map<string, (body: string) => string> | undefined

  public reload = () => this.events.dispatchEvent(new Event('reload'))
  private events = new EventTarget();
  private reloadables = new Set<http.ServerResponse>()

  public constructor(port: number, hmrPath?: string) {
    if (hmrPath) {
      this.events.addEventListener('reload', () => {
        for (const client of this.reloadables) {
          console.log('Notifying SSE connection')
          client.write('data: {}\n\n')
        }
      })
    }

    const server = http.createServer((req, res) => {
      const url = req.url!.split('?')[0]!

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

      if (req.method === 'POST') {
        const handler = this.handlers?.get(url)
        if (handler) {
          const data: Buffer[] = []
          req.on('data', (chunk) => {
            data.push(chunk)
          })
          req.on('end', () => {
            let redirect: string
            this.events.addEventListener('reload', () => {
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
