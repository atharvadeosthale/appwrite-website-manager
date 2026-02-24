import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, UserPlus, CheckCircle2 } from 'lucide-react'
import { AuthorForm } from '../components/forms/AuthorForm'
import { TerminalOutput } from '../components/shared/TerminalOutput'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useAuthors } from '../hooks/useAuthors'
import type { CreateAuthorOptions } from '../types'

type PageState = 'form' | 'running' | 'success' | 'error'

export default function CreateAuthorPage(): React.JSX.Element {
  const navigate = useNavigate()
  const toast = useToast()
  const { authors } = useAuthors()
  const existingSlugs = useMemo(() => authors.map((a) => a.slug), [authors])

  const [pageState, setPageState] = useState<PageState>('form')
  const [cliOutput, setCliOutput] = useState<string[]>([])
  const [createdName, setCreatedName] = useState('')
  const [formKey, setFormKey] = useState(0)

  const handleSubmit = useCallback(
    async (options: CreateAuthorOptions) => {
      setPageState('running')
      setCliOutput([])
      setCreatedName(options.name)

      // Set up streaming output listener
      window.api.onCliOutput((data: string) => {
        setCliOutput((prev) => [...prev, data])
      })

      try {
        const result = await window.api.createAuthor(options)

        // Clean up the listener
        window.api.removeCliOutputListener()

        if (result.success) {
          setPageState('success')
          toast.success(`Author "${options.name}" created successfully!`)
        } else {
          setPageState('error')
          toast.error(result.error ?? 'Something went wrong while creating the author.')
        }
      } catch (err) {
        // Clean up the listener
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
    setFormKey((k) => k + 1) // remount form to reset state
  }, [])

  const handleTryAgain = useCallback(() => {
    setPageState('form')
    setCliOutput([])
  }, [])

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Button
          variant="ghost"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/dashboard/authors')}
          aria-label="Back to authors"
        />
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
            Create Author
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary leading-relaxed">
            Add a new author to your website.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl">
        {/* Form State */}
        {(pageState === 'form' || pageState === 'running') && (
          <div className="bg-bg-elevated rounded-xl border border-border-primary shadow-sm p-6 sm:p-8">
            <AuthorForm
              key={formKey}
              onSubmit={handleSubmit}
              loading={pageState === 'running'}
              existingSlugs={existingSlugs}
            />
          </div>
        )}

        {/* Terminal output — shown while running or after completion */}
        {cliOutput.length > 0 && (
          <div className="mt-6 animate-fade-in">
            <TerminalOutput
              lines={cliOutput}
              title="CLI Output"
            />
          </div>
        )}

        {/* Success State */}
        {pageState === 'success' && (
          <div className="mt-6 animate-fade-in">
            <div className="bg-bg-elevated rounded-xl border border-border-primary shadow-sm p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-success-muted mb-5">
                <CheckCircle2 size={28} className="text-success" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-1">
                Author created!
              </h2>
              <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto leading-relaxed">
                <strong>{createdName}</strong> has been added successfully. You can create another author or view your full team.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  icon={Users}
                  onClick={() => navigate('/dashboard/authors')}
                >
                  View Authors
                </Button>
                <Button
                  variant="primary"
                  icon={UserPlus}
                  onClick={handleCreateAnother}
                >
                  Create Another
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {pageState === 'error' && (
          <div className="mt-6 animate-fade-in">
            <div className="bg-bg-elevated rounded-xl border border-border-primary shadow-sm p-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-danger-muted mb-5">
                <span className="text-2xl">&#9888;</span>
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-1">
                Something went wrong
              </h2>
              <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto leading-relaxed">
                The author could not be created. Check the output above for details, then try again.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  icon={ArrowLeft}
                  onClick={() => navigate('/dashboard/authors')}
                >
                  Back to Authors
                </Button>
                <Button
                  variant="primary"
                  onClick={handleTryAgain}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
