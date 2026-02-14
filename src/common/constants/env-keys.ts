/**
 * 환경변수 키 상수
 *
 * 목적: 환경변수 키를 상수로 관리하여 오타 방지 및 타입 안정성 확보
 */
export const ENV_KEYS = {
  // Database
  DATABASE_URL: 'DATABASE_URL',

  // JWT
  JWT_SECRET: 'JWT_SECRET',
  ACCESS_EXPIRES: 'ACCESS_EXPIRES',
  REFRESH_EXPIRES: 'REFRESH_EXPIRES',
  HASH_ROUNDS: 'HASH_ROUNDS',

  // App
  PORT: 'PORT',

  // Postgres (Docker)
  POSTGRES_USER: 'POSTGRES_USER',
  POSTGRES_PASSWORD: 'POSTGRES_PASSWORD',
  POSTGRES_DB: 'POSTGRES_DB',
} as const;

// 타입 추출 (필요시 사용)
export type EnvKey = (typeof ENV_KEYS)[keyof typeof ENV_KEYS];
