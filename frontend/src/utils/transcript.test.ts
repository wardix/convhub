import { describe, expect, it } from 'vitest'
import type { TranscriptEntry } from '../types'
import {
  getTranscriptSummary,
  parseTranscriptFile,
  suggestTitle,
} from './transcript'

describe('transcript utils', () => {
  describe('parseTranscriptFile', () => {
    it('should parse a valid JSONL file', async () => {
      const jsonl = `{"type":"USER_INPUT","content":"hello"}\n{"type":"PLANNER_RESPONSE","content":"world"}`
      const file = new File([jsonl], 'test.jsonl', { type: 'application/json' })

      const result = await parseTranscriptFile(file)
      expect(result).toHaveLength(2)
      expect(result[0].type).toBe('USER_INPUT')
      expect(result[0].content).toBe('hello')
      expect(result[1].type).toBe('PLANNER_RESPONSE')
      expect(result[1].content).toBe('world')
    })

    it('should reject invalid JSONL', async () => {
      const file = new File(['invalid json\n{"type": "ok"}'], 'test.jsonl', {
        type: 'application/json',
      })
      await expect(parseTranscriptFile(file)).rejects.toThrow(
        /Invalid JSON on line 1/,
      )
    })

    it('should reject empty file', async () => {
      const file = new File([''], 'test.jsonl', { type: 'application/json' })
      await expect(parseTranscriptFile(file)).rejects.toThrow('Empty file')
    })
  })

  describe('getTranscriptSummary', () => {
    it('should count messages and tools correctly', () => {
      const entries: TranscriptEntry[] = [
        {
          type: 'USER_INPUT',
          createdAt: '2023-01-01T10:00:00Z',
        } as TranscriptEntry,
        {
          type: 'PLANNER_RESPONSE',
          toolCalls: [{}, {}],
          createdAt: '2023-01-01T10:05:00Z',
        } as TranscriptEntry,
        {
          type: 'TOOL_RESPONSE',
          createdAt: '2023-01-01T10:06:00Z',
        } as TranscriptEntry,
      ]

      const summary = getTranscriptSummary(entries)
      expect(summary.messageCount).toBe(2)
      expect(summary.toolCallCount).toBe(2)
      expect(summary.durationMs).toBe(6 * 60 * 1000) // 6 minutes in ms
    })

    it('should handle empty arrays', () => {
      const summary = getTranscriptSummary([])
      expect(summary.messageCount).toBe(0)
      expect(summary.toolCallCount).toBe(0)
      expect(summary.durationMs).toBe(0)
    })
  })

  describe('suggestTitle', () => {
    it('should suggest title from first user message', () => {
      const entries: TranscriptEntry[] = [
        { type: 'TOOL_RESPONSE', content: 'ignored' } as TranscriptEntry,
        {
          type: 'USER_INPUT',
          content:
            'Hello this is a very long title that should be truncated because it is more than fifty characters long',
        } as TranscriptEntry,
      ]

      const title = suggestTitle(entries)
      expect(title).toBe(
        'Hello this is a very long title that should be tru...',
      )
      expect(title.length).toBeLessThanOrEqual(53)
    })

    it('should stop at newline', () => {
      const entries: TranscriptEntry[] = [
        {
          type: 'USER_INPUT',
          content: 'First line\nSecond line',
        } as TranscriptEntry,
      ]

      expect(suggestTitle(entries)).toBe('First line')
    })

    it('should return default title if no user message', () => {
      const entries: TranscriptEntry[] = [
        { type: 'PLANNER_RESPONSE', content: 'hello' } as TranscriptEntry,
      ]

      expect(suggestTitle(entries)).toBe('Untitled Conversation')
    })
  })
})
