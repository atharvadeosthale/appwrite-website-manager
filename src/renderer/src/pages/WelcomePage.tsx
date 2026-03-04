import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'

export default function WelcomePage(): React.JSX.Element {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [checkingExisting, setCheckingExisting] = useState(true)

  // On mount, check if a repo path is already configured
  useEffect(() => {
    async function checkExistingRepo(): Promise<void> {
      // Check prerequisites first
      try {
        const setupResult = await window.api.setupCheckAll()
        if (!setupResult.allPassed) {
          navigate('/setup', { replace: true })
          return
        }
      } catch {
        // If check fails, don't block — continue to repo check
      }

      try {
        const path = await window.api.getRepoPath()
        if (path) {
          const result = await window.api.validateRepo(path)
          if (result.valid) {
            navigate('/dashboard', { replace: true })
            return
          }
        }
      } catch {
        // No existing repo path, that's fine
      } finally {
        setCheckingExisting(false)
      }
    }
    checkExistingRepo()
  }, [navigate])

  async function handleSelectFolder(): Promise<void> {
    setError(null)
    setValidating(true)
    try {
      const path = await window.api.selectFolder()
      if (!path) {
        setValidating(false)
        return
      }

      const result = await window.api.validateRepo(path)
      if (!result.valid) {
        setError(result.error ?? 'This folder does not appear to be a valid Appwrite website repository.')
        setValidating(false)
        return
      }

      await window.api.setRepoPath(path)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setValidating(false)
    }
  }

  if (checkingExisting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-primary">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary">
      <div className="animate-fade-in flex flex-col items-center max-w-md w-full mx-4">
        {/* Card */}
        <div className="w-full bg-bg-elevated rounded-xl shadow-lg border border-border-primary p-10 flex flex-col items-center text-center">
          {/* App branding */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-accent-muted mb-5">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-accent"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              Website Manager
            </h1>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">
              Select your Appwrite website repository to get started
            </p>
          </div>

          {/* Select Folder button */}
          <Button
            variant="primary"
            size="lg"
            icon={FolderOpen}
            loading={validating}
            onClick={handleSelectFolder}
          >
            Select Folder
          </Button>

          {/* Error message */}
          {error && (
            <p className="mt-4 text-sm text-danger leading-relaxed animate-fade-in">
              {error}
            </p>
          )}
        </div>

        {/* Footer hint */}
        <p className="mt-6 text-xs text-text-tertiary text-center leading-relaxed">
          Choose the root folder of your cloned Appwrite website repository.
        </p>
      </div>
    </div>
  )
}
