import { useState, useCallback } from 'react'
import { Play, Info, RotateCcw } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { BlogSelector } from '../components/shared/BlogSelector'
import { TerminalOutput } from '../components/shared/TerminalOutput'
import { useToast } from '../components/ui/Toast'
import { useBlogs } from '../hooks/useBlogs'
import { InfoPill, PageIntro, PageScaffold, SurfaceCard } from '../components/layout/PageScaffold'
import type { Blog } from '../types'

export default function SanitizePage(): React.JSX.Element {
  const toast = useToast()
  const { blogs, loading: blogsLoading } = useBlogs()

  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null)
  const [cliOutput, setCliOutput] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)

  const handleSanitize = useCallback(async () => {
    if (!selectedBlog) return

    setCliOutput([])
    setRunning(true)
    setCompleted(false)

    window.api.onCliOutput((data: string) => {
      setCliOutput((prev) => [...prev, data])
    })

    try {
      const result = await window.api.sanitize(selectedBlog.slug)
      if (result.success) {
        toast.success(`"${selectedBlog.title}" has been sanitized successfully!`)
        setCompleted(true)
      } else {
        toast.error(result.error || 'Sanitize failed')
      }
    } catch {
      toast.error('Sanitize failed unexpectedly')
    } finally {
      window.api.removeCliOutputListener()
      setRunning(false)
    }
  }, [selectedBlog, toast])

  const handleReset = useCallback(() => {
    setSelectedBlog(null)
    setCliOutput([])
    setCompleted(false)
  }, [])

  return (
    <PageScaffold>
      <div className="space-y-8">
        <PageIntro
          eyebrow="Sanitizer"
          title="Clean up a post before it ships."
          description="Normalize headings, repair smart quotes, and run the repository’s formatting and optimization pipeline against a selected story."
          meta={<InfoPill>{blogsLoading ? 'Scanning blog catalog' : `${blogs.length} posts available`}</InfoPill>}
          actions={
            <Button variant="primary" icon={Play} onClick={handleSanitize} loading={running} disabled={!selectedBlog || running}>
              {running ? 'Sanitizing...' : 'Run Sanitize'}
            </Button>
          }
        />

        <SurfaceCard className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan-muted text-cyan">
            <Info size={20} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">What this does</p>
            <p className="mt-2 text-sm leading-7 text-text-secondary">
              Sanitize is safe to run repeatedly. It standardizes structure and formatting, then hands control back to your normal editing flow.
            </p>
          </div>
        </SurfaceCard>

        <SurfaceCard className="max-w-4xl" highlight>
          <div className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Target post</p>
              <h2 className="mt-2 font-display text-2xl text-text-primary">Choose what to sanitize</h2>
            </div>
            <BlogSelector blogs={blogs} loading={blogsLoading} selected={selectedBlog} onSelect={setSelectedBlog} label="" placeholder="Search by title or slug..." />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" icon={Play} onClick={handleSanitize} loading={running} disabled={!selectedBlog || running}>
                {running ? 'Sanitizing...' : 'Start Cleanup'}
              </Button>
              {completed && (
                <Button variant="secondary" icon={RotateCcw} onClick={handleReset}>
                  Sanitize Another
                </Button>
              )}
            </div>
          </div>
        </SurfaceCard>

        {cliOutput.length > 0 && <TerminalOutput lines={cliOutput} title="Sanitize" />}
      </div>
    </PageScaffold>
  )
}
