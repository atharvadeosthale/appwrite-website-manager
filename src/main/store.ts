import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

interface StoreSchema {
  repoPath: string
  windowBounds: {
    width: number
    height: number
    x?: number
    y?: number
  }
}

const defaults: StoreSchema = {
  repoPath: '',
  windowBounds: { width: 1200, height: 800 }
}

const storePath = join(app.getPath('userData'), 'config.json')

function readStore(): StoreSchema {
  try {
    if (!existsSync(storePath)) return { ...defaults }
    const data = JSON.parse(readFileSync(storePath, 'utf-8'))
    return { ...defaults, ...data }
  } catch {
    return { ...defaults }
  }
}

function writeStore(data: StoreSchema): void {
  writeFileSync(storePath, JSON.stringify(data, null, 2))
}

const store = {
  get<K extends keyof StoreSchema>(key: K): StoreSchema[K] {
    const data = readStore()
    return data[key]
  },

  set<K extends keyof StoreSchema>(key: K, value: StoreSchema[K]): void {
    const data = readStore()
    data[key] = value
    writeStore(data)
  },

  getAll(): StoreSchema {
    return readStore()
  }
}

export default store
