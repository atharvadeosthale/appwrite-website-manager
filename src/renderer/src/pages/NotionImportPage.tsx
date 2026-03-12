import { useState, useCallback } from 'react'
import clsx from 'clsx'
import { FileArchive, CheckCircle2, Play, RotateCcw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { FileDropZone } from '../components/shared/FileDropZone'
import { BlogSelector } from '../components/shared/BlogSelector'
import { TerminalOutput } from '../components/shared/TerminalOutput'
import { useToast } from '../components/ui/Toast'
import { useBlogs } from '../hooks/useBlogs'
import { InfoPill, PageIntro, PageScaffold, SurfaceCard } from '../components/layout/PageScaffold'
import type { Blog } from '../types'

function getFileName(path: string): string {
  return path.split('/').pop() || path.split('\\').pop() || path
}

function StepCard({
  step,
  title,
  active,
  complete,
  children
}: {
  step: number
  title: string
  active: boolean
  complete: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <SurfaceCard className={clsx(active ? 'border-white/14 shadow-[0_20px_46px_rgba(0,0,0,0.24)]' : 'opacity-80', !active && !complete && 'opacity-60')}>
      <div className="mb-5 flex items-center gap-4">
        <div
          className={clsx(
            'flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-semibold',
            complete && 'border-success/24 bg-success-muted text-success',
            active && !complete && 'border-white/12 bg-white/[0.07] text-text-primary',
            !active && !complete && 'border-white/8 bg-white/[0.04] text-text-tertiary'
          )}
        >
          {complete ? <CheckCircle2 size={18} strokeWidth={2} /> : step}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Step {step}</p>
          <h2 className="mt-1 font-display text-2xl text-text-primary">{title}</h2>
        </div>
      </div>
      {children}
    </SurfaceCard>
  )
}

export default function NotionImportPage(): React.JSX.Element {
  const toast = useToast()
  const { blogs, loading: blogsLoading } = useBlogs()

  const [zipPath, setZipPath] = useState<string | null>(null)
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null)
  const [cliOutput, setCliOutput] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)

  const currentStep = !zipPath ? 1 : !selectedBlog ? 2 : 3

  const handleSelectZipDialog = useCallback(async () => {
    try {
      const path = await window.api.selectZip()
      if (path) setZipPath(path)
    } catch {
      toast.error('Failed to open file picker')
    }
  }, [toast])

  const handleFileDrop = useCallback((path: string) => {
    setZipPath(path)
  }, [])

  const handleImport = useCallback(async () => {
    if (!zipPath || !selectedBlog) return

    setCliOutput([])
    setRunning(true)
    setCompleted(false)

    window.api.onCliOutput((data: string) => {
      setCliOutput((prev) => [...prev, data])
    })

    try {
      const result = await window.api.importNotion(zipPath, selectedBlog.slug)
      if (result.success) {
        toast.success('Notion import complete! Your blog post has been updated.')
        setCompleted(true)
      } else {
        toast.error(result.error || 'Import failed')
      }
    } catch {
      toast.error('Import failed unexpectedly')
    } finally {
      window.api.removeCliOutputListener()
      setRunning(false)
    }
  }, [zipPath, selectedBlog, toast])

  const handleReset = useCallback(() => {
    setZipPath(null)
    setSelectedBlog(null)
    setCliOutput([])
    setCompleted(false)
  }, [])

  return (
    <PageScaffold>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Notion Import"
          title="Convert a Notion export into a live post."
          description="Drop in an exported archive, choose the target story, and let the CLI replace the current markdown with the converted Notion content."
          meta={<InfoPill>{blogsLoading ? 'Loading post library' : `${blogs.length} possible targets`}</InfoPill>}
          actions={
            <Button variant="primary" icon={Play} onClick={handleImport} loading={running} disabled={!zipPath || !selectedBlog || running}>
              {running ? 'Importing...' : 'Run Import'}
            </Button>
          }
        />

        <div className="grid gap-4 xl:grid-cols-3">
          <StepCard step={1} title="Source archive" active={currentStep === 1} complete={!!zipPath}>
            {zipPath ? (
              <div className="rounded-[16px] border border-success/18 bg-success-muted p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-success/20 bg-success/10 text-success">
                    <FileArchive size={20} strokeWidth={1.8} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{getFileName(zipPath)}</p>
                    <p className="truncate text-xs text-text-tertiary">{zipPath}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="secondary" size="sm" onClick={() => { setZipPath(null); setSelectedBlog(null); setCliOutput([]); setCompleted(false) }}>
                    Change file
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FileDropZone accept=".zip" onFile={handleFileDrop} label="Drop your Notion export here" icon={FileArchive} />
                <div className="flex items-center gap-3">
                  <div className="elevated-divider flex-1" />
                  <span className="text-xs uppercase tracking-[0.14em] text-text-tertiary">or</span>
                  <div className="elevated-divider flex-1" />
                </div>
                <Button variant="secondary" size="sm" onClick={handleSelectZipDialog}>
                  Browse for .zip
                </Button>
              </div>
            )}
          </StepCard>

          <StepCard step={2} title="Choose target" active={currentStep === 2} complete={!!selectedBlog}>
            <div className="space-y-4">
              <p className="text-sm leading-7 text-text-secondary">
                Choose which blog post should receive the imported content. The existing markdown for that story will be replaced.
              </p>
              <BlogSelector blogs={blogs} loading={blogsLoading} selected={selectedBlog} onSelect={setSelectedBlog} label="" placeholder="Search by title or slug..." />
            </div>
          </StepCard>

          <StepCard step={3} title="Execute import" active={currentStep === 3} complete={completed}>
            <div className="space-y-4">
              <p className="text-sm leading-7 text-text-secondary">
                When you run the import, the CLI converts the archive and writes the resulting markdown into the selected post.
              </p>
              <div className="rounded-[16px] border border-white/8 bg-white/[0.04] p-4 text-sm text-text-secondary">
                <div className="flex items-center justify-between gap-3">
                  <span>Archive</span>
                  <span className="muted-code">{zipPath ? getFileName(zipPath) : 'Pending'}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span>Target</span>
                  <span className="muted-code">{selectedBlog?.slug ?? 'Pending'}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" icon={Play} onClick={handleImport} loading={running} disabled={!zipPath || !selectedBlog || running}>
                  {running ? 'Importing...' : 'Start Import'}
                </Button>
                {completed && (
                  <Button variant="secondary" icon={RotateCcw} onClick={handleReset}>
                    Import Another
                  </Button>
                )}
              </div>
            </div>
          </StepCard>
        </div>

        {cliOutput.length > 0 && <TerminalOutput lines={cliOutput} title="Notion Import" />}
      </div>
    </PageScaffold>
  )
}
