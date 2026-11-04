import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RichTextEditor } from './RichTextEditor'

describe('rich text editor', () => {
  it('renders an editable document surface and formatting toolbar', () => {
    render(<RichTextEditor content={{ type: 'doc', content: [{ type: 'paragraph' }] }} editable onChange={vi.fn()} />)
    expect(screen.getByRole('toolbar', { name: 'Formatting toolbar' })).toBeInTheDocument()
    expect(screen.getByLabelText('Document editor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
  })
})
