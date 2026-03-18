/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          // Override to CommonJS for Jest compatibility
          module: 'commonjs',
          moduleResolution: 'node',
          // Relax for test environment
          isolatedModules: false,
        },
      },
    ],
  },
  moduleNameMapper: {
    // Resolve Next.js path alias @/* → project root
    '^@/(.*)$': '<rootDir>/$1',
  },
}
