# Local developer setup

If you use VS Code, this launch script runs `main.ts`
(Node.js allows running `.ts` files natively as of 23.10)
and enables reloading the process when `main.ts` changes.

Then `main.ts` can setup the bare minimum dev environment
(see [Simple build tool](simple-build-tool.md#simple-build-tool))
that loads a module within a HMR-enabled subtree to do
the rest of the work.

```json
// .vscode/launch.json

{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Program",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/main.ts",
      "args": [ "dev" ],
      "skipFiles": [ "<node_internals>/**" ],
      "runtimeArgs": [
        "--watch-path=main.ts",
        "--disable-warning=ExperimentalWarning"
      ],
    }
  ]
}
```
