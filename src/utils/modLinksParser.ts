export interface ModLink {
  name: string
  description: string
  version: string
  repository: string
  dependencies: string[]
  links: {
    SHA256: string
    URL: string
  }[]
}

export function parseModLinks(xmlContent: string): ModLink[] {
  if (!xmlContent) return []

  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlContent, 'text/xml')

  const manifestElements = xmlDoc.querySelectorAll('Manifest')
  const mods: ModLink[] = []

  manifestElements.forEach((manifest) => {
    const name = manifest.querySelector('Name')?.textContent || ''
    const description = manifest.querySelector('Description')?.textContent || ''
    const version = manifest.querySelector('Version')?.textContent || '1.0.0.0'
    const repository = manifest.querySelector('Repository')?.textContent || ''

    const dependencies: string[] = []
    manifest.querySelectorAll('Dependencies > string').forEach((dep) => {
      const depName = dep.textContent?.trim()
      if (depName) dependencies.push(depName)
    })

    const links: { SHA256: string; URL: string }[] = []
    manifest.querySelectorAll('Link').forEach((link) => {
      const sha256 = link.getAttribute('SHA256') || ''
      const url = link.textContent?.trim() || ''
      if (sha256 && url) {
        links.push({ SHA256: sha256, URL: url })
      }
    })

    if (name) {
      mods.push({
        name,
        description,
        version,
        repository,
        dependencies,
        links,
      })
    }
  })

  return mods.sort((a, b) => a.name.localeCompare(b.name))
}
