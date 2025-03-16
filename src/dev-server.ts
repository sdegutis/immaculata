import * as chokidar from 'chokidar'
import * as http from "http"
import * as mimetypes from 'mime-types'
import * as path from 'path'
import { Runtime } from './runtime.js'

export function startDevServer(runtime: Runtime, config?: { port?: number }) {
  process.env['DEV'] = '1'

  const server = new Server()
  server.startServer(config?.port ?? 8080)

  server.handlers = runtime.handlers

  const outfiles = runtime.build()
  server.files = outfiles

  const updatedPaths = new Set<string>()
  let reloadFsTimer: NodeJS.Timeout

  const pathUpdated = (filePath: string) => {
    updatedPaths.add(filePath.split(path.sep).join(path.posix.sep))
    clearTimeout(reloadFsTimer)
    reloadFsTimer = setTimeout(() => {
      console.log('Rebuilding site...')

      try {
        runtime.pathsUpdated(...updatedPaths)

        const outfiles = runtime.build()
        server.files = outfiles

        updatedPaths.clear()
        server.rebuilt()
      }
      catch (e) {
        console.error(e)
      }

      console.log('Done.')
    }, 100)
  };

  (chokidar.watch('package.json', { ignoreInitial: true, cwd: process.cwd() })
    .on('change', pathUpdated));

  (chokidar.watch(runtime.siteDir, { ignoreInitial: true, cwd: process.cwd() })
    .on('add', pathUpdated)
    .on('change', pathUpdated)
    .on('unlink', pathUpdated))
}

class Server {

  files: Map<string, Buffer | string> | undefined
  handlers?: Map<string, (body: string) => string> | undefined

  rebuilt = () => { };

  startServer(port: number) {
    const server = http.createServer((req, res) => {
      const url = req.url!.split('?')[0]!

      if (req.method === 'POST') {
        const handler = this.handlers?.get(url)
        if (handler) {
          const data: Buffer[] = []
          req.on('data', (chunk) => {
            data.push(chunk)
          })
          req.on('end', () => {
            let redirect: string
            this.rebuilt = () => {
              res.statusCode = 302
              res.setHeader('Location', redirect)
              res.end()
            }
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
    console.log(`Running on http://localhost:${port}`)
  }

}
