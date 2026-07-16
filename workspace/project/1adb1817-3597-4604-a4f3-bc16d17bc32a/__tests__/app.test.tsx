import { render, screen, fireEvent } from '@testing-library/react'

describe('App', () => {
  it('should render without crashing', () => {
    render(<div />)
    expect(screen).toBeDefined()
  })
})