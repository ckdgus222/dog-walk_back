/**
 * 에러 메시지 상수
 *
 * 목적: 에러 메시지를 상수로 관리하여 일관성 확보 및 다국어 지원 용이
 */
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
    EMAIL_ALREADY_EXISTS: '이미 존재하는 이메일입니다.',
    INVALID_TOKEN: '유효하지 않은 토큰입니다.',
    TOKEN_EXPIRED: '토큰이 만료되었습니다.',
    UNAUTHORIZED: '인증이 필요합니다.',
  },
  USER: {
    NOT_FOUND: '사용자를 찾을 수 없습니다.',
    ALREADY_EXISTS: '이미 존재하는 사용자입니다.',
  },
  INTERNAL: {
    SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
    DATABASE_ERROR: '데이터베이스 오류가 발생했습니다.',
  },
} as const;
