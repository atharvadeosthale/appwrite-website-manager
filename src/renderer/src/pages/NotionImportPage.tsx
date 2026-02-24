import { useState, useCallback } from 'react'
import clsx from 'clsx'
import { Download, FileArchive, CheckCircle2, ArrowRight, Play } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { FileDropZone } from '../components/shared/FileDropZone'
import { BlogSelector } from '../components/shared/BlogSelector'
import { TerminalOutput } from '../components/shared/TerminalOutput'
import { useToast } from '../components/ui/Toast'
import { useBlogs } from '../hooks/useBlogs'
import type { Blog } from '../types'

/* ─── Helpers ─── */

function getFileName(path: string): string {
  return path.split('/').pop() || path.split('\\').pop() || path
}

/* ─── Step Indicator ─── */

function StepIndicator({
  step,
  currentStep,
  label
}: {
  step: number
  currentStep: number
  label: string
}): React.JSX.Element {
  const isComplete = currentStep > step
  const isActive = currentStep === step
  const isPending = currentStep < step

  return (
    <div className="flex items-center gap-3">
      <div
        className={clsx(
          'flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold',
          'transition-all duration-300',
          isComplete && 'bg-success text-white',
          isActive && 'bg-accent text-white shadow-accent',
          isPending && 'bg-bg-tertiary text-text-tertiary'
        )}
      >
        {isComplete ? <CheckCircle2 size={16} /> : step}
      </div>
      <span
        className={clsx(
          'text-sm font-medium transition-colors duration-200',
          isActive && 'text-text-primary',
          isComplete && 'text-success',
          isPending && 'text-text-tertiary'
        )}
      >
        {label}
      </span>
    </div>
  )
}

function StepConnector({ complete }: { complete: boolean }): React.JSX.Element {
  return (
    <div className="flex items-center px-2">
      <ArrowRight
        size={16}
        className={clsx(
          'transition-colors duration-200',
          complete ? 'text-success' : 'text-text-tertiary/40'
        )}
      />
    </div>
  )
}

/* ─── Page ─── */

export default function NotionImportPage(): React.JSX.Element {
  const toast = useToast()
  const { blogs, loading: blogsLoading } = useBlogs()

  // Step 1: Zip file
  const [zipPath, setZipPath] = useState<string | null>(null)

  // Step 2: Blog selection
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null)

  // Step 3: Execution
  const [cliOutput, setCliOutput] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)

  // Determine which step we're on
  const currentStep = !zipPath ? 1 : !selectedBlog ? 2 : 3

  const handleSelectZipDialog = useCallback(async () => {
    try {
      const path = await window.api.selectZip()
      if (path) {
        setZipPath(path)
      }
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
    <div className="p-8 animate-fade-in space-y-8">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-accent-muted shrink-0">
          <Download size={20} strokeWidth={1.8} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Import from Notion
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
            Import a Notion export (.zip) into an existing blog post. The content will replace the
            current markdown.
          </p>
        </div>
      </div>

      {/* Step Progress */}
      <div className="flex items-center">
        <StepIndicator step={1} currentStep={currentStep} label="Select Zip File" />
        <StepConnector complete={currentStep > 1} />
        <StepIndicator step={2} currentStep={currentStep} label="Choose Blog Post" />
        <StepConnector complete={currentStep > 2} />
        <StepIndicator step={3} currentStep={currentStep} label="Confirm & Import" />
      </div>

      {/* Step 1: Select Zip File */}
      <Card className={clsx(currentStep !== 1 && zipPath && 'opacity-60')}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              Step 1 &mdash; Notion Export File
            </h2>
            {zipPath && (
              <button
                type="button"
                onClick={() => {
                  setZipPath(null)
                  setSelectedBlog(null)
                  setCliOutput([])
                  setCompleted(false)
                }}
                className="text-xs text-accent hover:underline cursor-pointer"
              >
                Change file
              </button>
            )}
          </div>

          {zipPath ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success-muted border border-success/20">
              <FileArchive size={20} className="text-success shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">
                  {getFileName(zipPath)}
                </p>
                <p className="text-xs text-text-tertiary truncate">{zipPath}</p>
              </div>
              <CheckCircle2 size={18} className="text-success shrink-0" />
            </div>
          ) : (
            <div className="space-y-3">
              <FileDropZone
                accept=".zip"
                onFile={handleFileDrop}
                label="Drop your Notion export here, or click to browse"
                icon={FileArchive}
              />
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-border-primary" />
                <span className="text-xs text-text-tertiary">or</span>
                <div className="flex-1 border-t border-border-primary" />
              </div>
              <Button variant="secondary" size="sm" onClick={handleSelectZipDialog}>
                Browse for .zip file
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Step 2: Select Blog */}
      <Card
        className={clsx(
          'transition-opacity duration-300',
          currentStep < 2 && 'opacity-40 pointer-events-none'
        )}
      >
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">
            Step 2 &mdash; Target Blog Post
          </h2>
          <p className="text-xs text-text-secondary leading-relaxed">
            Choose which blog post should receive the Notion content. The existing markdown will be
            replaced.
          </p>
          <BlogSelector
            blogs={blogs}
            loading={blogsLoading}
            selected={selectedBlog}
            onSelect={setSelectedBlog}
            label=""
            placeholder="Search by title or slug..."
          />
        </div>
      </Card>

      {/* Step 3: Confirm & Execute */}
      <Card
        className={clsx(
          'transition-opacity duration-300',
          currentStep < 3 && 'opacity-40 pointer-events-none'
        )}
      >
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">
            Step 3 &mdash; Confirm & Import
          </h2>

          {zipPath && selectedBlog && (
            <div className="p-4 rounded-lg bg-bg-secondary border border-border-primary">
              <p className="text-sm text-text-primary leading-relaxed">
                Import{' '}
                <span className="font-semibold text-accent">{getFileName(zipPath)}</span>{' '}
                into{' '}
                <span className="font-semibold text-accent">{selectedBlog.title}</span>
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Slug: {selectedBlog.slug}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              icon={Play}
              onClick={handleImport}
              loading={running}
              disabled={!zipPath || !selectedBlog || running}
            >
              {running ? 'Importing...' : 'Import'}
            </Button>
            {completed && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Import another
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Terminal Output */}
      {cliOutput.length > 0 && (
        <div className="animate-fade-in">
          <TerminalOutput lines={cliOutput} title="Notion Import" />
        </div>
      )}
    </div>
  )
}
