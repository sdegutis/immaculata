# DevServer

## constructor

```ts
constructor(port: number, opts?: {
  hmrPath?: string,
  prefix?: string,
  onRequest?: (res: http.ServerResponse) => 'handled' | void,
})
```

Creates a new http server and begins listening immediately
at the given port.

```ts
const server = new DevServer(8080)
```

Optional fn `onRequest` can modify `res` or `res.req`.

If `onRequest` closes the request, it must return `handled`.




## files

```ts
files: Map<string, string|Buffer>
```

The files to serve. Has the same path format as `tree.files`.

```ts
server.files = new Map([
  ['/index.html', 'hello world!'],
])
```



## notFound

```ts
notFound?: (path: string) => string
```

Handler that returns 404 and the given content
when the path isn't present in `server.files`.



## reload

```ts
reload(): void
```

Triggers SSE for listeners of `hmrPath` (see constructor).
