import { describe, expect, it } from 'vitest'
import { isValidCompany, normalizeCompany } from './authService'

describe('company login value', () => {
  it('normalizes company identifiers', () => {
    expect(normalizeCompany('  Jasper_Salon-01  ')).toBe('jasper_salon-01')
  })

  it('accepts only the supported stable-key characters', () => {
    expect(isValidCompany('salon_01')).toBe(true)
    expect(isValidCompany('salon-01')).toBe(true)
    expect(isValidCompany('Salon Name')).toBe(false)
    expect(isValidCompany('salon@example')).toBe(false)
  })
})
