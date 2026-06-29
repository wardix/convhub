import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../api/client'
import { ToastProvider } from '../../context/ToastContext'
import * as transcriptUtils from '../../utils/transcript'
import { ToastContainer } from '../ToastContainer/ToastContainer'
import { UploadForm } from './UploadForm'

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual('../../api/client')
  return {
    ...actual,
    api: {
      post: vi.fn(),
    },
  }
})

describe('UploadForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderComponent = () =>
    render(
      <MemoryRouter>
        <ToastProvider>
          <UploadForm />
          <ToastContainer />
        </ToastProvider>
      </MemoryRouter>,
    )

  it('renders initial dropzone', () => {
    renderComponent()
    expect(screen.getByText('Upload JSONL Transcript')).toBeInTheDocument()
    expect(
      screen.getByText(/Drag and drop your file here/i),
    ).toBeInTheDocument()
  })

  it('shows error for invalid file type', async () => {
    renderComponent()

    const file = new File([''], 'test.txt', { type: 'text/plain' })

    const dropzone = screen.getByText('Upload JSONL Transcript').parentElement
      ?.parentElement as HTMLElement
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    })

    expect(
      await screen.findByText('Please upload a valid .jsonl file'),
    ).toBeInTheDocument()
  })

  it('shows error for large file', async () => {
    renderComponent()

    // Create a mock file larger than 10MB
    const file = new File([''], 'large.jsonl', { type: 'application/json' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })

    const dropzone = screen.getByText('Upload JSONL Transcript').parentElement
      ?.parentElement as HTMLElement
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    })

    expect(
      await screen.findByText('File is too large (max 10MB)'),
    ).toBeInTheDocument()
  })

  it('processes valid file and shows metadata form', async () => {
    const mockEntries = [
      {
        type: 'USER_INPUT',
        content: 'hello',
      } as transcriptUtils.TranscriptEntry,
    ]

    vi.spyOn(transcriptUtils, 'parseTranscriptFile').mockResolvedValue(
      mockEntries,
    )
    vi.spyOn(transcriptUtils, 'getTranscriptSummary').mockReturnValue({
      messageCount: 1,
      toolCallCount: 0,
      durationMs: 0,
    })
    vi.spyOn(transcriptUtils, 'suggestTitle').mockReturnValue('hello')

    renderComponent()

    const file = new File(['{"type":"USER_INPUT"}'], 'test.jsonl', {
      type: 'application/json',
    })

    const dropzone = screen.getByText('Upload JSONL Transcript').parentElement
      ?.parentElement as HTMLElement

    await act(async () => {
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      })
    })

    await waitFor(() => {
      expect(screen.getByText('test.jsonl')).toBeInTheDocument()
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument()
      expect(screen.getByDisplayValue('hello')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /Upload Conversation/i }),
      ).toBeInTheDocument()
    })
  })

  it('submits form successfully', async () => {
    const mockEntries = [
      {
        type: 'USER_INPUT',
        content: 'hello',
      } as transcriptUtils.TranscriptEntry,
    ]

    vi.spyOn(transcriptUtils, 'parseTranscriptFile').mockResolvedValue(
      mockEntries,
    )
    vi.spyOn(transcriptUtils, 'getTranscriptSummary').mockReturnValue({
      messageCount: 1,
      toolCallCount: 0,
      durationMs: 0,
    })
    vi.spyOn(transcriptUtils, 'suggestTitle').mockReturnValue('hello')

    vi.mocked(api.post).mockResolvedValue({ id: 'conv-123' })

    renderComponent()

    const file = new File(['{"type":"USER_INPUT"}'], 'test.jsonl', {
      type: 'application/json',
    })
    const dropzone = screen.getByText('Upload JSONL Transcript').parentElement
      ?.parentElement as HTMLElement

    await act(async () => {
      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      })
    })

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Upload Conversation/i }),
      ).toBeInTheDocument()
    })

    // Add description
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: 'This is a test desc' },
    })

    // Submit
    fireEvent.click(
      screen.getByRole('button', { name: /Upload Conversation/i }),
    )

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/conversations',
        expect.any(FormData),
      )
      const callArgs = vi.mocked(api.post).mock.calls[0]
      const formData = callArgs[1] as FormData
      expect(formData.get('title')).toBe('hello')
      expect(formData.get('description')).toBe('This is a test desc')
      expect(formData.has('tags')).toBe(false)
      expect(mockNavigate).toHaveBeenCalledWith('/conversations/conv-123')
    })
  })
})
