import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/src/__mocks__/styleMock.ts',
    '^@task-management/data$': '<rootDir>/../../libs/data/src/index.ts',
    '^@task-management/auth$': '<rootDir>/../../libs/auth/src/index.ts',
  },
  setupFilesAfterEnv: [],
};

export default config;
