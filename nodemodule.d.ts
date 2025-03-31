import "module"

declare module "module" {
  export function registerHooks(opts: {
    load?: LoadHook,
    resolve?: ResolveHook,
  }): void
}
