import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import type { Tag, TranscriptEntry } from '../../types'
import {
  type TranscriptSummary,
  getTranscriptSummary,
  parseTranscriptFile,
  suggestTitle,
} from '../../utils/transcript'
import { TagInput } from '../TagInput/TagInput'
import styles from './UploadForm.module.css'

export const UploadForm = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)

  // File state
  const [file, setFile] = useState<File | null>(null)
  const [entries, setEntries] = useState<TranscriptEntry[]>([])
  const [summary, setSummary] = useState<TranscriptSummary | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<Tag[]>([])

  // UI state
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { showToast } = useToast()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.jsonl')) {
      showToast('Please upload a valid .jsonl file', 'error')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      // 10MB limit
      showToast('File is too large (max 10MB)', 'error')
      return
    }

    setIsProcessing(true)
    try {
      const parsedEntries = await parseTranscriptFile(selectedFile)
      if (parsedEntries.length === 0) {
        throw new Error('File contains no valid transcript entries')
      }

      const fileSummary = getTranscriptSummary(parsedEntries)
      const suggestedTitle = suggestTitle(parsedEntries)

      setFile(selectedFile)
      setEntries(parsedEntries)
      setSummary(fileSummary)
      setTitle(suggestedTitle)
      setStep(2)
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Failed to parse file',
        'error',
      )
      resetFile()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }

  const resetFile = () => {
    setFile(null)
    setEntries([])
    setSummary(null)
    setStep(1)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    if (!file || entries.length === 0) {
      showToast('Valid transcript file is required', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)
      if (description) {
        formData.append('description', description)
      }
      if (tags.length > 0) {
        formData.append('tags', tags.map((t) => t.name).join(','))
      }

      const response = await api.post<{ conversation: { id: string } }>(
        '/conversations',
        formData,
      )
      showToast('Conversation uploaded successfully', 'success')
      navigate(`/conversations/${response.conversation.id}`)
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, 'error')
      } else {
        showToast('Failed to upload conversation', 'error')
      }
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      {step === 1 ? (
        <div
          className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${isProcessing ? styles.processing : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              if (!isProcessing) fileInputRef.current?.click()
            }
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".jsonl"
            className={styles.hiddenInput}
          />

          {isProcessing ? (
            <div className={styles.processingContent}>
              <div className={styles.spinner} />
              <p>Parsing transcript...</p>
            </div>
          ) : (
            <div className={styles.uploadContent}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.uploadIcon}
                role="img"
                aria-labelledby="upload-icon"
              >
                <title id="upload-icon">Upload file</title>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <h3>Upload JSONL Transcript</h3>
              <p>Drag and drop your file here, or click to browse</p>
              <span className={styles.fileHint}>
                Supports .jsonl files only (Max 10MB)
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className={styles.metadataForm}>
          <div className={styles.fileSummaryCard}>
            <div className={styles.fileInfo}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.fileIcon}
                role="img"
                aria-labelledby="file-icon"
              >
                <title id="file-icon">File</title>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <div>
                <h4>{file?.name}</h4>
                <span className={styles.fileSize}>
                  {((file?.size ?? 0) / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Messages</span>
                <span className={styles.statValue}>
                  {summary?.messageCount || 0}
                </span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Tool Calls</span>
                <span className={styles.statValue}>
                  {summary?.toolCallCount || 0}
                </span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Duration</span>
                <span className={styles.statValue}>
                  {summary?.durationMs
                    ? `${Math.ceil(summary.durationMs / 60000)} min`
                    : '< 1 min'}
                </span>
              </div>
            </div>

            <button
              type="button"
              className={styles.removeFileBtn}
              onClick={resetFile}
              disabled={isSubmitting}
            >
              Remove file
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your conversation a title"
                className={styles.input}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this conversation about? (Markdown supported)"
                className={styles.textarea}
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            <div className={styles.formGroup}>
              <span>Tags</span>
              <TagInput value={tags} onChange={setTags} maxTags={5} />
            </div>

            <div className={styles.previewSection}>
              <span>Preview</span>
              <div className={styles.previewCard}>
                <h3 className={styles.previewTitle}>{title || 'Untitled'}</h3>
                <div className={styles.previewTags}>
                  {tags.map((t) => (
                    <span
                      key={t.id}
                      className={styles.previewTag}
                      style={{
                        backgroundColor: `${t.color}20`,
                        color: t.color || 'inherit',
                      }}
                    >
                      #{t.name}
                    </span>
                  ))}
                </div>
                {description && (
                  <p className={styles.previewDesc}>{description}</p>
                )}

                <div className={styles.previewMessages}>
                  {entries.slice(0, 3).map(
                    (entry, idx) =>
                      entry.content && (
                        <div
                          key={entry.stepIndex ?? idx}
                          className={`${styles.previewMessage} ${entry.type === 'USER_INPUT' ? styles.previewUserMsg : styles.previewAiMsg}`}
                        >
                          <div className={styles.msgAvatar}>
                            {entry.type === 'USER_INPUT' ? 'U' : 'AI'}
                          </div>
                          <div className={styles.msgContent}>
                            {entry.content.substring(0, 100)}
                            {entry.content.length > 100 ? '...' : ''}
                          </div>
                        </div>
                      ),
                  )}
                </div>
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={resetFile}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={isSubmitting || !title.trim()}
              >
                {isSubmitting ? (
                  <>
                    <span className={styles.btnSpinner} /> Uploading...
                  </>
                ) : (
                  'Upload Conversation'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
