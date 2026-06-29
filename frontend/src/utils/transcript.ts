import type { TranscriptEntry } from '../types'

export interface TranscriptSummary {
  messageCount: number
  toolCallCount: number
  durationMs: number
}

export const parseTranscriptFile = (file: File): Promise<TranscriptEntry[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        if (!text) {
          throw new Error('Empty file')
        }

        const lines = text.split('\n').filter((line) => line.trim().length > 0)

        if (lines.length === 0) {
          throw new Error('Empty file')
        }

        const entries: TranscriptEntry[] = lines.map((line, index) => {
          try {
            const entry = JSON.parse(line)
            return {
              stepIndex: entry.step_index ?? index,
              source: entry.source ?? 'UNKNOWN',
              type: entry.type ?? 'UNKNOWN',
              status: entry.status ?? 'DONE',
              createdAt: entry.createdAt ?? new Date().toISOString(),
              content: entry.content,
              thinking: entry.thinking,
              toolCalls: entry.toolCalls || entry.tool_calls,
            } as TranscriptEntry
          } catch {
            throw new Error(`Invalid JSON on line ${index + 1}`)
          }
        })

        resolve(entries)
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export const getTranscriptSummary = (
  entries: TranscriptEntry[],
): TranscriptSummary => {
  if (!entries || entries.length === 0) {
    return { messageCount: 0, toolCallCount: 0, durationMs: 0 }
  }

  let messageCount = 0
  let toolCallCount = 0

  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]
    if (entry.type === 'USER_INPUT' || entry.type === 'PLANNER_RESPONSE') {
      messageCount++
    }
    if (entry.toolCalls && !Array.isArray(entry.toolCalls)) {
      throw new Error(
        `Invalid transcript format: toolCalls must be an array at step ${index}`,
      )
    }
    if (entry.toolCalls && Array.isArray(entry.toolCalls)) {
      toolCallCount += entry.toolCalls.length
    }
  }

  let durationMs = 0
  if (entries.length > 1) {
    try {
      const firstEntry = entries[0]
      const lastEntry = entries[entries.length - 1]

      const start = new Date(firstEntry.createdAt).getTime()
      const end = new Date(lastEntry.createdAt).getTime()

      if (!Number.isNaN(start) && !Number.isNaN(end)) {
        durationMs = Math.max(0, end - start)
      }
    } catch {
      // Ignore parsing errors for dates
    }
  }

  return {
    messageCount,
    toolCallCount,
    durationMs,
  }
}

export const suggestTitle = (entries: TranscriptEntry[]): string => {
  if (!entries || entries.length === 0) return ''

  const firstUserMessage = entries.find(
    (e) => e.type === 'USER_INPUT' && e.content,
  )

  if (firstUserMessage?.content) {
    const text = firstUserMessage.content.trim()
    // Take first 50 chars as title, stopping at newline if earlier
    let title = text.split('\n')[0]
    if (title.length > 50) {
      title = `${title.substring(0, 50).trim()}...`
    }
    return title
  }

  return 'Untitled Conversation'
}
