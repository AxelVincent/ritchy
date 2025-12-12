import { expect } from 'vitest'

export const assertOk = (response: { status: number; body?: unknown }) => {
  if (response.status !== 200) {
    console.error('❌ Response error:', JSON.stringify(response.body, null, 2))
  }
  expect(response.status, 'Response should be 200 OK').toBe(200)
}

export const assertLength = (
  description: string,
  array: unknown[],
  expected: number,
) => {
  if (array.length !== expected) {
    console.error(
      `❌ ${description}\n` +
        `   Expected: ${expected} items\n` +
        `   Received: ${array.length} items\n` +
        `   Items: ${JSON.stringify(
          array.map(
            (item: unknown) => (item as { name?: string }).name ?? item,
          ),
          null,
          2,
        )}`,
    )
  }
  expect(array, description).toHaveLength(expected)
}

export const assertAllMatch = <T>(
  description: string,
  array: T[],
  predicate: (item: T) => boolean,
) => {
  const failingItems = array.filter((item) => !predicate(item))
  if (failingItems.length > 0) {
    console.error(
      `❌ ${description}\n` +
        `   Failing items: ${JSON.stringify(failingItems, null, 2)}`,
    )
  }
  expect(array.every(predicate), description).toBe(true)
}

export const assertContainsName = (
  items: Array<{ name: string }>,
  name: string,
) => {
  if (!items.some((i) => i.name === name)) {
    console.error(
      `❌ Should contain item named "${name}"\n` +
        `   Available names: ${items.map((i) => i.name).join(', ')}`,
    )
  }
  expect(
    items.some((i) => i.name === name),
    `Should contain item named "${name}"`,
  ).toBe(true)
}

export const assertSortedBy = <T>(
  items: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'desc',
) => {
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1][key]
    const curr = items[i][key]
    const isCorrectOrder = order === 'desc' ? prev >= curr : prev <= curr
    if (!isCorrectOrder) {
      console.error(
        `❌ Items should be sorted by ${String(key)} ${order.toUpperCase()}\n` +
          `   At index ${i}: ${String(prev)} should be ${order === 'desc' ? '>=' : '<='} ${String(curr)}\n` +
          `   All values: ${items.map((item) => item[key]).join(', ')}`,
      )
    }
    if (order === 'desc') {
      expect(
        prev >= curr,
        `Items should be sorted by ${String(key)} DESC`,
      ).toBe(true)
    } else {
      expect(prev <= curr, `Items should be sorted by ${String(key)} ASC`).toBe(
        true,
      )
    }
  }
}
