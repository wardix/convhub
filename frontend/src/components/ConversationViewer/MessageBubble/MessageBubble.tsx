import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { TranscriptEntry } from '../../../types'
import { CodeBlock } from '../CodeBlock/CodeBlock'
import { ThinkingBlock } from '../ThinkingBlock/ThinkingBlock'
import { ToolCallBlock } from '../ToolCallBlock/ToolCallBlock'
import styles from './MessageBubble.module.css'

interface MessageBubbleProps {
  entry: TranscriptEntry
}

export const MessageBubble = ({ entry }: MessageBubbleProps) => {
  const isUser = entry.type === 'USER_INPUT'
  const isAi = entry.type === 'PLANNER_RESPONSE'

  if (!isUser && !isAi) return null

  // Strip XML tags from user input
  const cleanContent = (content: string) => {
    if (!isUser) return content
    return content
      .replace(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/g, '$1')
      .trim()
  }

  const markdownComponents: Components = {
    // biome-ignore lint/suspicious/noExplicitAny: complex react-markdown props
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <CodeBlock
          language={match[1]}
          value={String(children).replace(/\n$/, '')}
        />
      ) : (
        <code className={styles.inlineCode} {...props}>
          {children}
        </code>
      )
    },
    // biome-ignore lint/suspicious/noExplicitAny: complex react-markdown props
    a({ node, href, children, ...props }: any) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
          {...props}
        >
          {children}
        </a>
      )
    },
  }

  return (
    <div className={`${styles.container} ${isUser ? styles.user : styles.ai}`}>
      <div className={styles.avatar}>
        {isUser ? (
          <div className={styles.userIcon}>U</div>
        ) : (
          <div className={styles.aiIcon}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4" />
              <line x1="8" y1="16" x2="8" y2="16" />
              <line x1="16" y1="16" x2="16" y2="16" />
            </svg>
          </div>
        )}
      </div>

      <div className={styles.bubble}>
        {/* Thinking Block */}
        {isAi && entry.thinking && <ThinkingBlock content={entry.thinking} />}

        {/* Content */}
        {entry.content && (
          <div className={styles.content}>
            {isUser ? (
              <p className={styles.userText}>{cleanContent(entry.content)}</p>
            ) : (
              <div className={styles.markdown}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {entry.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Tool Calls */}
        {isAi && entry.toolCalls && entry.toolCalls.length > 0 && (
          <div className={styles.toolsList}>
            {(
              entry.toolCalls as {
                name: string
                arguments: Record<string, unknown>
              }[]
            ).map((tool, idx) => (
              <ToolCallBlock
                // biome-ignore lint/suspicious/noArrayIndexKey: order is stable
                key={idx}
                name={tool.name}
                arguments={tool.arguments}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
