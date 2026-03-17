export type ViteManifest = Record<
  string,
  {
    file: string
    css?: string[]
    imports?: string[]
    isEntry?: boolean
  }
>

export type SsrAssets = {
  entryJs: string
  css: string[]
}

export function getSsrAssetsFromManifest(
  manifest: ViteManifest,
  entry: string,
): SsrAssets {
  const entryItem = manifest[entry]
  if (!entryItem?.file) {
    throw new Error(`Vite manifest missing entry: ${entry}`)
  }

  const css = new Set<string>()

  const visit = (key: string) => {
    const item = manifest[key]
    if (!item) return
    for (const c of item.css ?? []) css.add(`/${c}`)
    for (const imp of item.imports ?? []) visit(imp)
  }

  visit(entry)

  return {
    entryJs: `/${entryItem.file}`,
    css: [...css],
  }
}

