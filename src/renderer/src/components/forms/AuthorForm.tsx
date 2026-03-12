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
      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
          Basic information
        </p>
        <p className="text-sm leading-6 text-text-secondary">
          Set the visible name, slug, role, and short bio for this author.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          className="min-h-[96px] w-full resize-y rounded-[12px] border border-white/10 bg-[linear-gradient(180deg,rgba(22,22,26,0.94),rgba(14,14,18,0.9))] px-4 py-2.5 text-sm leading-6 text-text-primary placeholder:text-text-tertiary transition-all duration-200 hover:border-white/16 focus:border-white/18 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.05)] focus:outline-none disabled:cursor-not-allowed disabled:bg-white/[0.03] disabled:text-text-tertiary"
        />
      </FormField>

      <div className="elevated-divider" />

      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
          Avatar
        </p>
        <p className="text-sm leading-6 text-text-secondary">
          Add a face to the profile so the author card looks polished in previews and production.
        </p>
      </div>

      <div className="rounded-[16px] border border-white/8 bg-white/[0.03] p-4">
        <div className="flex items-start gap-4">
        {form.avatar ? (
          <div className="relative group">
            <div className="h-20 w-20 overflow-hidden rounded-[14px] border border-white/10 bg-[#0b0b0d] shadow-[0_20px_48px_rgba(3,7,18,0.32)]">
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
              className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#08111f] text-text-tertiary opacity-0 transition-all duration-200 hover:border-danger/30 hover:text-danger group-hover:opacity-100 cursor-pointer"
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
            className="flex h-20 w-20 flex-col items-center justify-center gap-1.5 rounded-[14px] border border-dashed border-white/14 bg-white/[0.03] text-text-tertiary transition-all duration-200 hover:border-cyan/30 hover:bg-cyan-muted/40 hover:text-cyan cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ImagePlus size={18} strokeWidth={1.5} />
            <span className="text-[10px] font-medium uppercase tracking-[0.14em]">Choose</span>
          </button>
        )}

        <div className="flex-1 pt-0.5">
          <p className="text-sm leading-6 text-text-secondary">
            {form.avatar
              ? 'Looking good! The CLI will copy this image into the repository.'
              : 'Click to select an image from your computer. Square images work best.'}
          </p>
          {form.avatar && (
            <p className="mt-2 max-w-xs truncate font-mono text-[11px] text-text-tertiary">
              {form.avatar}
            </p>
          )}
        </div>
      </div>
      </div>

      <div className="elevated-divider" />

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <LinkIcon size={14} className="text-text-tertiary" />
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-tertiary">
            Social links
          </p>
        </div>
        <p className="text-sm leading-6 text-text-secondary">
          Optional destination URLs shown on the author card and profile preview.
        </p>
      </div>

      <div className="space-y-3">
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

      <div className="elevated-divider" />

      <div className="pt-1">
        <Button
          type="submit"
          variant="primary"
          size="md"
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
