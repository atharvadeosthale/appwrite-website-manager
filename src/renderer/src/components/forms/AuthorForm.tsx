import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { ImagePlus, X, Link as LinkIcon } from 'lucide-react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { FormField } from './FormField'
import type { CreateAuthorOptions } from '../../types'

/* ─── Slug generation ─── */

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/* ─── Simple URL validation ─── */

function isValidUrl(value: string): boolean {
  if (!value) return true // empty is fine for optional fields
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/* ─── Types ─── */

export interface AuthorFormData {
  name: string
  slug: string
  role: string
  bio: string
  avatar: string
  twitter: string
  github: string
  linkedin: string
}

interface AuthorFormErrors {
  name?: string
  slug?: string
  role?: string
  twitter?: string
  github?: string
  linkedin?: string
}

interface AuthorFormProps {
  onSubmit: (options: CreateAuthorOptions) => void
  loading?: boolean
  existingSlugs?: string[]
}

const INITIAL_FORM_DATA: AuthorFormData = {
  name: '',
  slug: '',
  role: '',
  bio: '',
  avatar: '',
  twitter: '',
  github: '',
  linkedin: ''
}

/* ─── Component ─── */

export function AuthorForm({ onSubmit, loading = false, existingSlugs = [] }: AuthorFormProps): React.JSX.Element {
  const [form, setForm] = useState<AuthorFormData>(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState<AuthorFormErrors>({})
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Focus name input on mount
  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  /* ─── Field updaters ─── */

  const updateField = useCallback(
    <K extends keyof AuthorFormData>(field: K, value: AuthorFormData[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      // Clear field error when user types
      setErrors((prev) => {
        if (prev[field as keyof AuthorFormErrors]) {
          const next = { ...prev }
          delete next[field as keyof AuthorFormErrors]
          return next
        }
        return prev
      })
    },
    []
  )

  const handleNameChange = useCallback(
    (value: string) => {
      updateField('name', value)
      if (!slugManuallyEdited) {
        setForm((prev) => ({ ...prev, name: value, slug: generateSlug(value) }))
      }
    },
    [slugManuallyEdited, updateField]
  )

  const handleSlugChange = useCallback(
    (value: string) => {
      setSlugManuallyEdited(true)
      updateField('slug', value)
    },
    [updateField]
  )

  /* ─── Real-time slug uniqueness check ─── */

  const slugTakenError = useMemo(() => {
    const trimmed = form.slug.trim()
    if (trimmed && existingSlugs.includes(trimmed)) {
      return 'This slug is already taken'
    }
    return undefined
  }, [form.slug, existingSlugs])

  /* ─── Avatar picker ─── */

  const handleSelectAvatar = useCallback(async () => {
    try {
      const path = await window.api.selectImage()
      if (path) {
        updateField('avatar', path)
      }
    } catch {
      // User cancelled or error — do nothing
    }
  }, [updateField])

  const handleRemoveAvatar = useCallback(() => {
    updateField('avatar', '')
  }, [updateField])

  /* ─── Validation ─── */

  const validate = useCallback((): boolean => {
    const newErrors: AuthorFormErrors = {}

    if (!form.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!form.slug.trim()) {
      newErrors.slug = 'Slug is required'
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim())) {
      newErrors.slug = 'Slug must be lowercase letters, numbers, and hyphens only'
    } else if (existingSlugs.includes(form.slug.trim())) {
      newErrors.slug = 'This slug is already taken'
    }

    if (!form.role.trim()) {
      newErrors.role = 'Role is required'
    }

    if (form.twitter && !isValidUrl(form.twitter)) {
      newErrors.twitter = 'Enter a valid URL (e.g. https://x.com/username)'
    }

    if (form.github && !isValidUrl(form.github)) {
      newErrors.github = 'Enter a valid URL (e.g. https://github.com/username)'
    }

    if (form.linkedin && !isValidUrl(form.linkedin)) {
      newErrors.linkedin = 'Enter a valid URL (e.g. https://linkedin.com/in/username)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [form, existingSlugs])

  /* ─── Submit ─── */

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!validate()) return

      const options: CreateAuthorOptions = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        role: form.role.trim(),
        bio: form.bio.trim()
      }

      if (form.avatar) options.avatar = form.avatar
      if (form.twitter.trim()) options.twitter = form.twitter.trim()
      if (form.github.trim()) options.github = form.github.trim()
      if (form.linkedin.trim()) options.linkedin = form.linkedin.trim()

      onSubmit(options)
    },
    [form, validate, onSubmit]
  )

  /* ─── Reset (exposed for parent to call after success) ─── */

  // We expose a reset via a key-based approach — parent remounts the component

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-1 mb-2">
        <h2 className="text-sm font-semibold text-text-primary tracking-tight">
          Basic Information
        </h2>
        <p className="text-xs text-text-tertiary">
          The essentials about this author.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FormField label="Name" required error={errors.name}>
          <Input
            ref={nameInputRef}
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Jane Doe"
            error={errors.name}
            disabled={loading}
          />
        </FormField>

        <FormField
          label="Slug"
          required
          error={errors.slug || slugTakenError}
          helperText={
            slugTakenError
              ? undefined
              : slugManuallyEdited
                ? 'You are editing the slug manually.'
                : 'Auto-generated from the name.'
          }
        >
          <Input
            value={form.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="e.g. jane-doe"
            error={errors.slug || slugTakenError}
            disabled={loading}
          />
        </FormField>
      </div>

      <FormField label="Role" required error={errors.role}>
        <Input
          value={form.role}
          onChange={(e) => updateField('role', e.target.value)}
          placeholder="e.g. Developer Advocate, Technical Writer"
          error={errors.role}
          disabled={loading}
        />
      </FormField>

      <FormField label="Bio" helperText="A short description that appears on blog posts.">
        <textarea
          value={form.bio}
          onChange={(e) => updateField('bio', e.target.value)}
          placeholder="Tell readers a little about this author..."
          rows={3}
          disabled={loading}
          className="w-full bg-bg-elevated text-text-primary rounded-md font-sans
            border border-border-primary px-3 py-2 text-sm leading-relaxed
            transition-all duration-200
            placeholder:text-text-tertiary
            hover:border-border-secondary
            focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_var(--color-accent-muted)]
            disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed
            resize-y min-h-[80px]"
        />
      </FormField>

      {/* Avatar Section */}
      <div className="pt-2 space-y-1 mb-2">
        <h2 className="text-sm font-semibold text-text-primary tracking-tight">
          Avatar
        </h2>
        <p className="text-xs text-text-tertiary">
          A photo that appears alongside their posts.
        </p>
      </div>

      <div className="flex items-start gap-5">
        {form.avatar ? (
          <div className="relative group">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-border-primary shadow-sm">
              <img
                src={`file://${form.avatar}`}
                alt="Avatar preview"
                className="w-full h-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={loading}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full
                bg-bg-elevated border border-border-primary shadow-sm
                flex items-center justify-center
                text-text-tertiary hover:text-danger hover:border-danger/30
                transition-all duration-200 cursor-pointer
                opacity-0 group-hover:opacity-100"
              aria-label="Remove avatar"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSelectAvatar}
            disabled={loading}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-border-secondary
              flex flex-col items-center justify-center gap-1.5
              text-text-tertiary hover:text-accent hover:border-accent/40 hover:bg-accent-muted/50
              transition-all duration-200 cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImagePlus size={20} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Choose</span>
          </button>
        )}

        <div className="flex-1 pt-1">
          <p className="text-xs text-text-secondary leading-relaxed">
            {form.avatar
              ? 'Looking good! The CLI will copy this image into the repository.'
              : 'Click to select an image from your computer. Square images work best.'}
          </p>
          {form.avatar && (
            <p className="text-[10px] text-text-tertiary mt-1 font-mono truncate max-w-xs">
              {form.avatar}
            </p>
          )}
        </div>
      </div>

      {/* Social Links Section */}
      <div className="pt-2 space-y-1 mb-2">
        <div className="flex items-center gap-2">
          <LinkIcon size={14} className="text-text-tertiary" />
          <h2 className="text-sm font-semibold text-text-primary tracking-tight">
            Social Links
          </h2>
        </div>
        <p className="text-xs text-text-tertiary">
          Optional profiles shown on the author card.
        </p>
      </div>

      <div className="space-y-4">
        <FormField label="Twitter / X" error={errors.twitter}>
          <Input
            type="url"
            value={form.twitter}
            onChange={(e) => updateField('twitter', e.target.value)}
            placeholder="https://x.com/username"
            error={errors.twitter}
            disabled={loading}
          />
        </FormField>

        <FormField label="GitHub" error={errors.github}>
          <Input
            type="url"
            value={form.github}
            onChange={(e) => updateField('github', e.target.value)}
            placeholder="https://github.com/username"
            error={errors.github}
            disabled={loading}
          />
        </FormField>

        <FormField label="LinkedIn" error={errors.linkedin}>
          <Input
            type="url"
            value={form.linkedin}
            onChange={(e) => updateField('linkedin', e.target.value)}
            placeholder="https://linkedin.com/in/username"
            error={errors.linkedin}
            disabled={loading}
          />
        </FormField>
      </div>

      {/* Submit */}
      <div className="pt-4 border-t border-border-primary">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          disabled={loading || !!slugTakenError}
          className="w-full sm:w-auto"
        >
          Create Author
        </Button>
      </div>
    </form>
  )
}
