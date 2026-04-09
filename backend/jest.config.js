/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.ts'
  ],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        target: 'ES2020',
        module: 'commonjs',
        esModuleInterop: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        strict: false,
        skipLibCheck: true
      }
    }]
  },
  // 忽略 dist 和 node_modules
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // 允许转换 uuid 等 ESM 包
  transformIgnorePatterns: ['/node_modules/(?!uuid)'],
  // 收集覆盖率（可选）
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/entities/**',
    '!src/app.ts'
  ],
  // 超时设置
  testTimeout: 10000
};

