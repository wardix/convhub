import { useEffect, useRef, useState } from 'react'
import { api } from '../../api/client'
import { useToast } from '../../hooks/useToast'
import type { Tag } from '../../types'
import { mapTag } from '../../utils/mappers'
import styles from './TagInput.module.css'

interface TagInputProps {
  value: Tag[]
  onChange: (tags: Tag[]) => void
  maxTags?: number
}

export const TagInput = ({ value, onChange, maxTags = 5 }: TagInputProps) => {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<Tag[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const fetchTags = async () => {
      if (!inputValue.trim()) {
        setSuggestions([])
        setSelectedIndex(-1)
        return
      }

      setLoading(true)
      try {
        const data = await api.get<{ data: Tag[] }>(
          `/tags?search=${encodeURIComponent(inputValue)}`,
        )
        const mappedTags = data.data.map(mapTag)
        // Filter out tags already selected
        const available = mappedTags.filter(
          (t) =>
            !value.find((v) => v.name.toLowerCase() === t.name.toLowerCase()),
        )
        setSuggestions(available)
        setSelectedIndex(-1)
      } catch (_err) {
        showToast('Failed to load tag suggestions', 'error')
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(() => {
      fetchTags()
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [inputValue, value, showToast])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddTag = (tag: Tag | string) => {
    if (value.length >= maxTags) return

    let newTag: Tag
    if (typeof tag === 'string') {
      const name = tag.trim().toLowerCase()
      if (!name || value.some((v) => v.name === name)) return

      // Temporary ID and random color for new tag
      newTag = {
        id: `temp-${Date.now()}`,
        name,
        color: [
          '#ef4444',
          '#f97316',
          '#f59e0b',
          '#10b981',
          '#3b82f6',
          '#8b5cf6',
          '#ec4899',
        ][Math.floor(Math.random() * 7)],
      }
    } else {
      newTag = tag
    }

    onChange([...value, newTag])
    setInputValue('')
    setIsDropdownOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalOptions = suggestions.length + (showCreateOption ? 1 : 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (isDropdownOpen && totalOptions > 0) {
        setSelectedIndex((prev) => (prev + 1) % totalOptions)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (isDropdownOpen && totalOptions > 0) {
        setSelectedIndex((prev) => (prev - 1 + totalOptions) % totalOptions)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (isDropdownOpen && selectedIndex >= 0) {
        if (selectedIndex < suggestions.length) {
          handleAddTag(suggestions[selectedIndex])
        } else if (showCreateOption) {
          handleAddTag(inputValue)
        }
      } else if (inputValue.trim()) {
        const match = suggestions.find(
          (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase(),
        )
        handleAddTag(match || inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag when backspacing on empty input
      const newTags = [...value]
      newTags.pop()
      onChange(newTags)
    }
  }

  const handleRemoveTag = (tagId: string) => {
    onChange(value.filter((t) => t.id !== tagId))
  }

  const showCreateOption =
    inputValue.trim().length > 0 &&
    !suggestions.some(
      (s) => s.name.toLowerCase() === inputValue.trim().toLowerCase(),
    )

  return (
    <div className={styles.container} ref={dropdownRef}>
      <div
        className={`${styles.inputWrapper} ${isDropdownOpen ? styles.open : ''} ${value.length >= maxTags ? styles.disabled : ''}`}
      >
        <div className={styles.tagsContainer}>
          {value.map((tag) => (
            <span
              key={tag.id}
              className={styles.tag}
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color || 'var(--text-primary)',
                borderColor: `${tag.color}40`,
              }}
            >
              #{tag.name}
              <button
                type="button"
                className={styles.removeTagBtn}
                onClick={() => handleRemoveTag(tag.id)}
                aria-label={`Remove tag ${tag.name}`}
              >
                ×
              </button>
            </span>
          ))}

          <input
            type="text"
            className={styles.input}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setIsDropdownOpen(true)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={
              value.length >= maxTags
                ? `Max ${maxTags} tags reached`
                : 'Add tags (e.g. debugging, setup)'
            }
            disabled={value.length >= maxTags}
          />
        </div>
      </div>

      {isDropdownOpen && inputValue.trim().length > 0 && (
        <div className={styles.dropdown}>
          {loading ? (
            <div className={styles.loadingItem}>Searching...</div>
          ) : (
            <>
              {suggestions.map((tag, index) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`${styles.suggestionItem} ${index === selectedIndex ? styles.selected : ''}`}
                  onClick={() => handleAddTag(tag)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span
                    className={styles.suggestionColor}
                    style={{
                      backgroundColor: tag.color || 'var(--text-muted)',
                    }}
                  />
                  #{tag.name}
                </button>
              ))}

              {showCreateOption && (
                <button
                  type="button"
                  className={`${styles.createItem} ${selectedIndex === suggestions.length ? styles.selected : ''}`}
                  onClick={() => handleAddTag(inputValue)}
                  onMouseEnter={() => setSelectedIndex(suggestions.length)}
                >
                  Create tag "<strong>{inputValue.trim()}</strong>"
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
