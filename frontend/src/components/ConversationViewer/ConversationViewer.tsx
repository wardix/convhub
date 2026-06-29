import type { TranscriptEntry } from '../../../types'
import { ErrorBoundary } from '../ErrorBoundary/ErrorBoundary'
import styles from './ConversationViewer.module.css'
import { MessageBubble } from './MessageBubble/MessageBubble'

interface ConversationViewerProps {
  transcript: TranscriptEntry[]
}

export const ConversationViewer = ({ transcript }: ConversationViewerProps) => {
  return (
    <ErrorBoundary fallbackMessage="Failed to render this conversation. The transcript data might be corrupted.">
      <div className={styles.container}>
        {transcript.map((entry, idx) => {
          // Render normal messages
          if (
            entry.type === 'USER_INPUT' ||
            entry.type === 'PLANNER_RESPONSE'
          ) {
            return <MessageBubble key={entry.stepIndex ?? idx} entry={entry} />
          }

          // Render checkpoints/system dividers
          if (
            entry.type === 'CHECKPOINT' ||
            entry.type === 'CONVERSATION_HISTORY'
          ) {
            return (
              <div key={entry.stepIndex ?? idx} className={styles.divider}>
                <span className={styles.dividerText}>
                  {entry.type === 'CHECKPOINT'
                    ? 'System Checkpoint'
                    : 'Conversation Restored'}
                </span>
              </div>
            )
          }

          return null
        })}
      </div>
    </ErrorBoundary>
  )
}
