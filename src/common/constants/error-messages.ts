/**
 * 에러 메시지 상수
 *
 * 목적: 에러 메시지를 상수로 관리하여 일관성 확보 및 다국어 지원 용이
 */
export const ERROR_MESSAGES = {
  // 인증/토큰/로그인 흐름에서 사용되는 메시지 집합
  AUTH: {
    INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
    EMAIL_ALREADY_EXISTS: '이미 존재하는 이메일입니다.',
    INVALID_TOKEN: '유효하지 않은 토큰입니다.',
    TOKEN_EXPIRED: '토큰이 만료되었습니다.',
    UNAUTHORIZED: '인증이 필요합니다.',
  },
  // 사용자 프로필(/me) 관련 메시지 집합
  USER: {
    NOT_FOUND: '사용자를 찾을 수 없습니다.',
    ALREADY_EXISTS: '이미 존재하는 사용자입니다.',
  },
  // 강아지 도메인(/dogs, signup 내 dog 검증) 메시지 집합
  DOG: {
    NOT_FOUND: '강아지를 찾을 수 없습니다.',
    INVALID_PHOTO_FILE: '유효하지 않은 강아지 사진 파일입니다.',
  },
  // 업로드 파이프라인(/media/upload) 메시지 집합
  MEDIA: {
    FILE_REQUIRED: '업로드할 파일이 필요합니다.',
    UNSUPPORTED_IMAGE_TYPE: '지원하지 않는 이미지 형식입니다.',
    FILE_TOO_LARGE: '이미지 파일 크기는 5MB 이하여야 합니다.',
  },
  // 처리 불가한 서버 오류 메시지 집합
  INTERNAL: {
    SERVER_ERROR: '서버 내부 오류가 발생했습니다.',
    DATABASE_ERROR: '데이터베이스 오류가 발생했습니다.',
  },
} as const;
