import { beforeEach } from 'vitest'

import { db } from '../src/data/connection.js'
import { booksTable, usersTable } from '../src/data/schema.js'

beforeEach(async () => {
  await db.delete(booksTable)
  await db.delete(usersTable)
})
