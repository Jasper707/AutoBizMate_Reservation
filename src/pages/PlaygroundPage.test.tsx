import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../app/providers/ToastProvider'
import { PlaygroundPage } from './PlaygroundPage'

vi.mock('../lib/supabaseClient', () => ({
  supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('offline') }) },
}))

function renderPage() {
  return render(<ToastProvider><PlaygroundPage /></ToastProvider>)
}

describe('PlaygroundPage', () => {
  it('opens without authentication and explains local-only storage', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Staff Queue Playground' })).toBeInTheDocument()
    expect(screen.getByText(/never reaches Supabase, n8n, Redis, or Telegram/i)).toBeInTheDocument()
    expect(screen.getByText(/Closing the tab or browser session clears it/i)).toBeInTheDocument()
  })

  it('validates and adds a local record with an explicit source', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Add a record' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('alert')).toHaveTextContent('required')

    await user.type(screen.getByLabelText(/This customer arrived/i), 'Demo Customer')
    await waitFor(() => expect(screen.getByLabelText(/chose this service/i)).toHaveDisplayValue('Select a service'))
    await user.selectOptions(screen.getByLabelText(/chose this service/i), 'haircut')
    await user.click(screen.getByRole('button', { name: 'Schedule' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(screen.getByText('Demo Customer')).toBeInTheDocument()
    expect(sessionStorage.getItem('autobizmate.playground.queue.v1')).toContain('Demo Customer')
  })
})
