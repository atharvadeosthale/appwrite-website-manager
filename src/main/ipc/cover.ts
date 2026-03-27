import { app, ipcMain } from 'electron'
import { execFileSync, spawn } from 'child_process'
import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { join, resolve, sep } from 'path'
import store from '../store'

const COVER_API_BASE_URL = 'https://cover.appwrite.network'
const TEXT_DOES_NOT_FIT_CODE = 'TEXT_DOES_NOT_FIT'

interface CoverTemplate {
  id: string
  maxCharLimit: number
}

interface CoverTemplatesResponse {
  templates: CoverTemplate[]
}

interface PrepareGeneratedCoverInput {
  title: string
  slug: string
  templateId: string
  maxCharLimit: number
}

interface PrepareGeneratedCoverResult {
  success: boolean
  tempPath?: string
  coverText?: string
  usedAiFallback?: boolean
  error?: string
}

interface CLIResult {
  success: boolean
  output: string
  error?: string
}

interface CleanupTempFileResult {
  success: boolean
  error?: string
}

interface CoverGenerationFailure {
  ok: false
  error: string
  code?: string
  lines?: string[]
}

interface CoverGenerationSuccess {
  ok: true
  buffer: Buffer
}

type CoverGenerationResult = CoverGenerationSuccess | CoverGenerationFailure

function getRepoPath(): string {
  const repoPath = store.get('repoPath')
  if (!repoPath) {
    throw new Error('Repository path not configured')
  }
  return repoPath
}

function getCliEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  const home = process.env.HOME || ''
  const bunDir = `${home}/.bun/bin`

  if (env.PATH && !env.PATH.includes(bunDir)) {
    env.PATH = `${bunDir}:${env.PATH}`
  }

  return env
}

function isCoverTemplate(value: unknown): value is CoverTemplate {
  if (!value || typeof value !== 'object') return false

  const maybeTemplate = value as Partial<CoverTemplate>
  return typeof maybeTemplate.id === 'string' && typeof maybeTemplate.maxCharLimit === 'number'
}

function normalizeCoverText(value: string): string {
  return value
    .trim()
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'`]+/, '')
    .replace(/["'`]+$/, '')
    .trim()
}

function sanitizeTempSegment(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || 'cover'
}

function getGeneratedCoverTempDir(): string {
  return join(app.getPath('temp'), 'appwrite-website-manager-generated-covers')
}

async function ensureGeneratedCoverTempDir(): Promise<string> {
  const tempDir = getGeneratedCoverTempDir()
  await mkdir(tempDir, { recursive: true })
  return tempDir
}

function resolveClaudePath(): string {
  try {
    return execFileSync('/usr/bin/env', ['which', 'claude'], {
      encoding: 'utf-8',
      env: getCliEnv()
    }).trim()
  } catch {
    return 'claude'
  }
}

async function fetchCoverTemplates(): Promise<CoverTemplatesResponse> {
  const response = await fetch(`${COVER_API_BASE_URL}/templates`)

  if (!response.ok) {
    const errorText = (await response.text()).trim()
    throw new Error(errorText || `Failed fetching cover templates (${response.status})`)
  }

  const payload = (await response.json()) as Partial<CoverTemplatesResponse>
  const templates = Array.isArray(payload.templates)
    ? payload.templates.filter(isCoverTemplate)
    : []

  if (templates.length === 0) {
    throw new Error('Cover templates API returned no valid templates')
  }

  return { templates }
}

async function requestCoverGeneration(
  templateId: string,
  coverText: string
): Promise<CoverGenerationResult> {
  const url = new URL(`${COVER_API_BASE_URL}/generate`)
  url.searchParams.set('template', templateId)
  url.searchParams.set('text', coverText)

  const response = await fetch(url)

  if (response.ok) {
    const buffer = Buffer.from(await response.arrayBuffer())
    return { ok: true, buffer }
  }

  const rawBody = await response.text()

  try {
    const parsed = JSON.parse(rawBody) as {
      error?: string
      code?: string
      lines?: string[]
    }

    return {
      ok: false,
      error: parsed.error || `Cover generation failed (${response.status})`,
      code: parsed.code,
      lines: Array.isArray(parsed.lines) ? parsed.lines : undefined
    }
  } catch {
    return {
      ok: false,
      error: rawBody.trim() || `Cover generation failed (${response.status})`
    }
  }
}

function sanitizeClaudeSuggestion(output: string): string {
  const normalized = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')

  return normalizeCoverText(normalized)
}

async function suggestCoverText(
  title: string,
  templateId: string,
  maxCharLimit: number,
  lines?: string[]
): Promise<string> {
  const prompt = [
    'Suggest short text for a blog cover image.',
    `Blog title: "${title}"`,
    `Template: ${templateId}`,
    `Max character limit: ${maxCharLimit}`,
    lines && lines.length > 0 ? `The cover API split the text like this and it did not fit: ${lines.join(' | ')}` : '',
    'The actual blog title must stay exactly the same. Do not rewrite the title itself.',
    'Only suggest separate cover text.',
    'Do not read any files. Do not use tools.',
    'Return only the cover text in plain text. No quotes. No bullets. No explanation.'
  ]
    .filter(Boolean)
    .join('\n')

  return new Promise((resolve, reject) => {
    const claudePath = resolveClaudePath()
    const proc = spawn(claudePath, ['-p', prompt], {
      cwd: process.cwd(),
      shell: false,
      env: getCliEnv(),
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    const timeout = setTimeout(() => {
      proc.kill()
      reject(new Error('Cover text suggestion timed out'))
    }, 90_000)

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    proc.on('close', (code) => {
      clearTimeout(timeout)

      if (code !== 0) {
        reject(new Error(stderr.trim() || `Claude exited with code ${code}`))
        return
      }

      const suggestion = sanitizeClaudeSuggestion(stdout || stderr)
      if (!suggestion) {
        reject(new Error('Claude returned an empty cover text suggestion'))
        return
      }

      resolve(suggestion)
    })
  })
}

async function writeGeneratedCoverTempFile(slug: string, buffer: Buffer): Promise<string> {
  const tempDir = await ensureGeneratedCoverTempDir()
  const fileName = `${sanitizeTempSegment(slug || randomUUID())}-${randomUUID()}.png`
  const tempPath = join(tempDir, fileName)
  await writeFile(tempPath, buffer)
  return tempPath
}

async function prepareGeneratedCover(
  input: PrepareGeneratedCoverInput
): Promise<PrepareGeneratedCoverResult> {
  const title = normalizeCoverText(input.title)
  const slug = input.slug.trim()
  const templateId = input.templateId.trim()

  if (!title) {
    return { success: false, error: 'Title is required to generate a cover.' }
  }

  if (!slug) {
    return { success: false, error: 'Slug is required to generate a cover.' }
  }

  if (!templateId) {
    return { success: false, error: 'Template is required to generate a cover.' }
  }

  const maxCharLimit = Number(input.maxCharLimit)
  if (!Number.isFinite(maxCharLimit) || maxCharLimit < 1) {
    return { success: false, error: 'A valid template character limit is required.' }
  }

  let coverText = title
  let usedAiFallback = false

  try {
    if (coverText.length > maxCharLimit) {
      coverText = await suggestCoverText(title, templateId, maxCharLimit)
      usedAiFallback = true
    }

    let generationResult = await requestCoverGeneration(templateId, coverText)

    if (
      !generationResult.ok &&
      generationResult.code === TEXT_DOES_NOT_FIT_CODE &&
      !usedAiFallback
    ) {
      coverText = await suggestCoverText(title, templateId, maxCharLimit, generationResult.lines)
      usedAiFallback = true
      generationResult = await requestCoverGeneration(templateId, coverText)
    }

    if (!generationResult.ok) {
      return {
        success: false,
        coverText,
        usedAiFallback,
        error: generationResult.error
      }
    }

    const tempPath = await writeGeneratedCoverTempFile(slug, generationResult.buffer)
    return {
      success: true,
      tempPath,
      coverText,
      usedAiFallback
    }
  } catch (err) {
    return {
      success: false,
      coverText,
      usedAiFallback,
      error: err instanceof Error ? err.message : 'Failed generating cover image'
    }
  }
}

async function runOptimize(): Promise<CLIResult> {
  const cwd = getRepoPath()

  return new Promise((resolve) => {
    const proc = spawn('bun', ['run', 'optimize'], {
      cwd,
      shell: false,
      env: getCliEnv()
    })

    let output = ''

    proc.stdout.on('data', (data: Buffer) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      output += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output })
      } else {
        resolve({
          success: false,
          output,
          error: output.trim() || `bun run optimize exited with code ${code}`
        })
      }
    })

    proc.on('error', (err) => {
      resolve({
        success: false,
        output,
        error: err.message
      })
    })
  })
}

async function cleanupGeneratedCoverTempFile(filePath: string): Promise<CleanupTempFileResult> {
  if (!filePath) return { success: true }

  const tempDir = resolve(await ensureGeneratedCoverTempDir())
  const targetPath = resolve(filePath)
  const tempDirPrefix = tempDir.endsWith(sep) ? tempDir : `${tempDir}${sep}`

  if (!targetPath.startsWith(tempDirPrefix) && targetPath !== tempDir) {
    return {
      success: false,
      error: 'Refusing to delete a file outside the generated cover temp directory.'
    }
  }

  if (!existsSync(targetPath)) {
    return { success: true }
  }

  try {
    await unlink(targetPath)
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed cleaning up generated cover temp file'
    }
  }
}

export function registerCoverHandlers(): void {
  ipcMain.handle('cover:get-templates', async (): Promise<CoverTemplatesResponse> => {
    return fetchCoverTemplates()
  })

  ipcMain.handle(
    'cover:prepare-generated-cover',
    async (_event, input: PrepareGeneratedCoverInput): Promise<PrepareGeneratedCoverResult> => {
      return prepareGeneratedCover(input)
    }
  )

  ipcMain.handle('cover:run-optimize', async (): Promise<CLIResult> => {
    return runOptimize()
  })

  ipcMain.handle(
    'cover:cleanup-temp-file',
    async (_event, filePath: string): Promise<CleanupTempFileResult> => {
      return cleanupGeneratedCoverTempFile(filePath)
    }
  )
}
