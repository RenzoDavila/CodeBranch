import type { Config } from 'jest';

/**
 * Jest en modo ESM: NestJS 12 publica `@nestjs/*` como `"type": "module"`.
 * Sin `useESM`, ts-jest emite `require()` y Node 22 no puede cargar esos paquetes.
 */
const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  testEnvironment: 'node',
  injectGlobals: true,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          moduleResolution: 'bundler',
          esModuleInterop: true,
          emitDecoratorMetadata: true,
          experimentalDecorators: true,
          isolatedModules: true,
        },
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
};

export default config;
