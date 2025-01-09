import '@testing-library/jest-dom'
import * as matchers from '@testing-library/jest-dom/matchers'
import { cleanup } from '@testing-library/react'
import { afterEach, expect } from 'vitest'

// Add custom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})
