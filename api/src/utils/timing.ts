import { performance } from 'node:perf_hooks'

/**
 * Runs `fn`, logging how long it took (and whether it threw) to the console.
 * Useful for tracking down which step of a multi-stage pipeline (e.g. image
 * conversion, a vision model call, an external API lookup) is slow.
 */
export async function withTiming<T> (label: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = performance.now()
  try {
    const result = await fn()
    console.log(`[timing] ${label}: ${(performance.now() - startedAt).toFixed(1)}ms`)
    return result
  } catch (err) {
    console.log(`[timing] ${label}: ${(performance.now() - startedAt).toFixed(1)}ms (failed)`)
    throw err
  }
}
