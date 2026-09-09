// set up database connection
import 'dotenv/config'
import { drizzle } from 'drizzle-orm/node-postgres'

const databaseUrl = process.env.DATABASE_URL
if (databaseUrl == null || databaseUrl === '') {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const db = drizzle(databaseUrl)
