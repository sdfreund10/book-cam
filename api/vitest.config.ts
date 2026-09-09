import { defineConfig } from 'vitest/config'

const sharedEnv = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://book_camera:book_camera@localhost:5432/book_camera_test'
}

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    env: sharedEnv,
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'test/identifyBookFromCover.test.ts',
            'test/validateBook.test.ts',
            'test/bookLookupService.test.ts'
          ],
          env: sharedEnv
        }
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: [
            'test/health.test.ts',
            'test/books.test.ts',
            'test/books.scan.test.ts'
          ],
          setupFiles: ['./test/setup.ts'],
          env: sharedEnv
        }
      }
    ]
  }
})
