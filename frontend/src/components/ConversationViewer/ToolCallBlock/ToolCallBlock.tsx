import { useState } from 'react'
import styles from './ToolCallBlock.module.css'

interface ToolCallBlockProps {
  name: string
  arguments: Record<string, unknown>
}

export const ToolCallBlock = ({
  name,
  arguments: rawArgs,
}: ToolCallBlockProps) => {
  const args = rawArgs || {}
  const [isExpanded, setIsExpanded] = useState(false)

  const getToolInfo = () => {
    switch (name) {
      case 'view_file':
      case 'read_file':
        return {
          icon: '📁',
          title: `View File: ${args.AbsolutePath || args.TargetFile || args.Path || 'Unknown'}`,
          summary: 'Reading file contents...',
        }
      case 'run_command':
      case 'execute_command':
        return {
          icon: '⚡',
          title: `Command: ${args.CommandLine || args.Command || 'Unknown'}`,
          summary: 'Executing shell command...',
        }
      case 'replace_file_content':
      case 'write_to_file':
      case 'edit_file':
        return {
          icon: '📝',
          title: `Edit File: ${args.TargetFile || args.Path || args.AbsolutePath || 'Unknown'}`,
          summary: 'Modifying file contents...',
        }
      case 'grep_search':
        return {
          icon: '🔍',
          title: `Search: "${args.Query || args.SearchTerm}" in ${args.SearchPath || 'workspace'}`,
          summary: 'Searching code...',
        }
      case 'search_web':
        return {
          icon: '🌐',
          title: `Web Search: "${args.query || args.search_query}"`,
          summary: 'Searching the web...',
        }
      default:
        return {
          icon: '🔧',
          title: `Tool: ${name}`,
          summary: 'Calling tool...',
        }
    }
  }

  const { icon, title } = getToolInfo()

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.icon}>{icon}</span>
        <span className={styles.title}>{title}</span>
        <svg
          className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="img"
          aria-label="Toggle tool call details"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div
        className={`${styles.contentWrapper} ${isExpanded ? styles.expanded : ''}`}
      >
        <div className={styles.content}>
          <pre className={styles.json}>
            <code>{JSON.stringify(args, null, 2)}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
