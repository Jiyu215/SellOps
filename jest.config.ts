import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          // ts-jest는 Next.js 플러그인 없이 실행되므로 strict 완화
          diagnostics: false,
        },
      },
    ],
  },
  moduleNameMapper: {
    // @/ 경로 별칭 (tsconfig paths와 동일)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  // next/navigation 등 Next.js 서버 전용 모듈은 테스트에서 자동 모킹
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
};

export default config;
