import { useState, useCallback } from 'react'
import { Sparkles, Play, Info } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { BlogSelector } from '../components/shared/BlogSelector'
import { TerminalOutput } from '../components/shared/TerminalOutput'
import { useToast } from '../components/ui/Toast'
import { useBlogs } from '../hooks/useBlogs'
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
    <div className="p-8 animate-fade-in space-y-8">
      {/* Page Header */}
      <div className="flex items-start gap-4">
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-warning-muted shrink-0">
          <Sparkles size={20} strokeWidth={1.8} className="text-warning" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Sanitize Blog Post
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">
            Clean up and optimize a blog post with one click.
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-accent-muted/50 border border-accent/10">
        <Info size={18} className="text-accent shrink-0 mt-0.5" />
        <p className="text-sm text-text-secondary leading-relaxed">
          Sanitize fixes heading levels and smart quotes in your blog post, then runs optimization
          and formatting. This is safe to run multiple times.
        </p>
      </div>

      {/* Blog Selection */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-primary">Choose a blog post</h2>
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

      {/* Action */}
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          icon={Play}
          onClick={handleSanitize}
          loading={running}
          disabled={!selectedBlog || running}
        >
          {running ? 'Sanitizing...' : 'Sanitize'}
        </Button>
        {completed && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Sanitize another
          </Button>
        )}
      </div>

      {/* Terminal Output */}
      {cliOutput.length > 0 && (
        <div className="animate-fade-in">
          <TerminalOutput lines={cliOutput} title="Sanitize" />
        </div>
      )}
    </div>
  )
}
