import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('communicates the queue value without unsupported claims', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'A Smarter Queue for Walk-In Businesses' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'No Remote Position Holding' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /request a demo/i })).not.toHaveLength(0)
    expect(screen.queryByText(/customers served/i)).not.toBeInTheDocument()
  })

  it('routes demo actions to the contact section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    for (const link of screen.getAllByRole('link', { name: 'Request a Demo' })) {
      expect(link).toHaveAttribute('href', '/about#contact')
    }
  })
})
