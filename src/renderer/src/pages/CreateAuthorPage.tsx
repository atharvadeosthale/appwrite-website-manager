import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, UserPlus, CheckCircle2, AlertTriangle } from 'lucide-react'
import { AuthorForm } from '../components/forms/AuthorForm'
import { TerminalOutput } from '../components/shared/TerminalOutput'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useAuthors } from '../hooks/useAuthors'
import { InfoPill, PageScaffold, SurfaceCard } from '../components/layout/PageScaffold'
import type { CreateAuthorOptions } from '../types'

type PageState = 'form' | 'running' | 'success' | 'error'

export default function CreateAuthorPage(): React.JSX.Element {
  const navigate = useNavigate()
  const toast = useToast()
  const { authors } = useAuthors()
  const existingSlugs = useMemo(() => authors.map((author) => author.slug), [authors])

  const [pageState, setPageState] = useState<PageState>('form')
  const [cliOutput, setCliOutput] = useState<string[]>([])
  const [createdName, setCreatedName] = useState('')
  const [formKey, setFormKey] = useState(0)

  const handleSubmit = useCallback(
    async (options: CreateAuthorOptions) => {
      setPageState('running')
      setCliOutput([])
      setCreatedName(options.name)

      window.api.onCliOutput((data: string) => {
        setCliOutput((prev) => [...prev, data])
      })

      try {
        const result = await window.api.createAuthor(options)
        window.api.removeCliOutputListener()

        if (result.success) {
          setPageState('success')
          toast.success(`Author "${options.name}" created successfully!`)
        } else {
          setPageState('error')
          toast.error(result.error ?? 'Something went wrong while creating the author.')
        }
      } catch (err) {
        window.api.removeCliOutputListener()
        setPageState('error')
        toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.')
      }
    },
    [toast]
  )

  const handleCreateAnother = useCallback(() => {
    setPageState('form')
    setCliOutput([])
    setCreatedName('')
    setFormKey((key) => key + 1)
  }, [])

  const handleTryAgain = useCallback(() => {
    setPageState('form')
    setCliOutput([])
  }, [])

  return (
    <PageScaffold>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/dashboard/authors')}>
            Back to Authors
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">Author Studio</p>
            <h1 className="font-display text-[2rem] leading-none text-text-primary">Create author</h1>
            <p className="max-w-2xl text-sm leading-6 text-text-secondary">
              Add the byline metadata, avatar, and links for a new profile.
            </p>
          </div>
          <InfoPill>{existingSlugs.length} authors indexed</InfoPill>
        </div>

        {(pageState === 'form' || pageState === 'running') && (
          <SurfaceCard className="max-w-3xl overflow-hidden p-0" highlight>
            <div className="border-b border-white/8 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-tertiary">Author details</p>
              <h2 className="mt-1 font-display text-xl text-text-primary">Profile information</h2>
            </div>
            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <AuthorForm key={formKey} onSubmit={handleSubmit} loading={pageState === 'running'} existingSlugs={existingSlugs} />
            </div>
          </SurfaceCard>
        )}

        {cliOutput.length > 0 && (
          <div className="max-w-3xl">
            <TerminalOutput lines={cliOutput} title="Author generation" />
          </div>
        )}

        {pageState === 'success' && (
          <SurfaceCard className="max-w-3xl px-6 py-8 text-center" highlight>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[14px] border border-success/20 bg-success-muted text-success">
              <CheckCircle2 size={26} strokeWidth={1.8} />
            </div>
            <h2 className="mt-4 font-display text-3xl text-text-primary">Author created</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">
              <strong>{createdName}</strong> is now available across the content system. Create another profile or head back to the team index.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button variant="secondary" icon={Users} onClick={() => navigate('/dashboard/authors')}>
                View Authors
              </Button>
              <Button variant="primary" icon={UserPlus} onClick={handleCreateAnother}>
                Create Another
              </Button>
            </div>
          </SurfaceCard>
        )}

        {pageState === 'error' && (
          <SurfaceCard className="max-w-3xl px-6 py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[14px] border border-danger/20 bg-danger-muted text-danger">
              <AlertTriangle size={26} strokeWidth={1.8} />
            </div>
            <h2 className="mt-4 font-display text-3xl text-text-primary">Creation failed</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-text-secondary">
              The author profile could not be generated. Inspect the command output above, then retry with corrected input.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/dashboard/authors')}>
                Back to Authors
              </Button>
              <Button variant="primary" onClick={handleTryAgain}>
                Try Again
              </Button>
            </div>
          </SurfaceCard>
        )}
      </div>
    </PageScaffold>
  )
}
