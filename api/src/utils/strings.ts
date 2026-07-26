export function isBlank (value?: string | null): value is '' | null | undefined {
  return value == null || value === ''
}

export function blankToUndefined (value?: string | null): string | undefined {
  return isBlank(value) ? undefined : value
}

/** Returns the first non-blank string among the candidates, or '' if all are blank. */
export function firstNonBlank (...values: Array<string | null | undefined>): string {
  for (const value of values) {
    if (!isBlank(value)) return value
  }
  return ''
}
