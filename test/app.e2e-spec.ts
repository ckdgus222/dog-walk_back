import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';

type AuthTokensResponse = {
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      nickname: string;
    };
  };
};

type ErrorResponse = {
  error: {
    code: string;
    message: string | string[];
    details?: unknown;
  };
};

type MeResponse = {
  data: {
    user: {
      id: string;
      email: string;
      nickname: string;
      profileImage: string | null;
      bio: string | null;
      createdAt: string;
      updatedAt: string;
    };
  };
};

type UploadMediaResponse = {
  data: {
    file: {
      id: string;
      purpose: 'DOG_PROFILE' | 'FEED_POST';
      url: string;
      mimeType: string;
      size: number;
    };
  };
};

const defaultDog = {
  name: '콩이',
  breed: '푸들',
  birthYear: '',
  gender: 'male',
  personality: ['friendly', 'active'],
} as const;

describe('Auth + Me flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.media.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const signupAndGetTokens = async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const password = '123456';
    const nickname = 'tester';

    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password, nickname, dog: defaultDog })
      .expect(201);

    const signupBody = signupResponse.body as AuthTokensResponse;

    return {
      email,
      password,
      nickname,
      accessToken: signupBody.data.accessToken,
      refreshToken: signupBody.data.refreshToken,
      userId: signupBody.data.user.id,
    };
  };

  const uploadDogProfileMedia = async () => {
    const uploadResponse = await request(app.getHttpServer())
      .post('/media/upload')
      .field('purpose', 'DOG_PROFILE')
      .attach('file', Buffer.from('e2e-dog-image'), {
        filename: `dog-${randomUUID()}.jpg`,
        contentType: 'image/jpeg',
      })
      .expect(201);

    return (uploadResponse.body as UploadMediaResponse).data.file.id;
  };

  it('validates login/me/refresh/logout flow with token rotation', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const password = '123456';
    const nickname = 'tester';

    const dogPhotoFileId = await uploadDogProfileMedia();
    const uploadedMediaBeforeSignup = await prisma.media.findUniqueOrThrow({
      where: { id: dogPhotoFileId },
      select: {
        storageKey: true,
        uploaderUserId: true,
      },
    });
    expect(uploadedMediaBeforeSignup.storageKey.startsWith('tmp/media/')).toBe(
      true,
    );
    expect(uploadedMediaBeforeSignup.uploaderUserId).toBeNull();

    const signupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email,
        password,
        nickname,
        dog: {
          ...defaultDog,
          photoFileId: dogPhotoFileId,
        },
      })
      .expect(201);

    const signupBody = signupResponse.body as AuthTokensResponse;
    expect(signupBody.data.user.email).toBe(email);
    expect(signupBody.data.user.nickname).toBe(nickname);
    expect((signupBody.data as Record<string, unknown>).dog).toBeUndefined();

    const createdDog = await prisma.dog.findFirst({
      where: { ownerId: signupBody.data.user.id },
    });
    expect(createdDog).toMatchObject({
      ownerId: signupBody.data.user.id,
      name: defaultDog.name,
      breed: defaultDog.breed,
      birthYear: null,
      gender: defaultDog.gender,
      personality: defaultDog.personality,
      photoFileId: dogPhotoFileId,
    });

    const uploadedMediaAfterSignup = await prisma.media.findUniqueOrThrow({
      where: { id: dogPhotoFileId },
      select: {
        storageKey: true,
        url: true,
        uploaderUserId: true,
      },
    });
    expect(uploadedMediaAfterSignup.storageKey.startsWith('media/')).toBe(true);
    expect(uploadedMediaAfterSignup.storageKey.startsWith('tmp/')).toBe(false);
    expect(uploadedMediaAfterSignup.url).toBe(
      `/uploads/${uploadedMediaAfterSignup.storageKey}`,
    );
    expect(uploadedMediaAfterSignup.uploaderUserId).toBe(
      signupBody.data.user.id,
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const loginBody = loginResponse.body as AuthTokensResponse;
    const accessToken = loginBody.data.accessToken;
    const previousRefreshToken = loginBody.data.refreshToken;

    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const authMeResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(authMeResponse.body).toMatchObject({
      data: {
        user: {
          id: signupBody.data.user.id,
          email,
          type: 'access',
        },
      },
    });

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Refresh-Token', previousRefreshToken)
      .expect(201);

    const refreshBody = refreshResponse.body as AuthTokensResponse;
    const latestRefreshToken = refreshBody.data.refreshToken;
    expect(latestRefreshToken).not.toBe(previousRefreshToken);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Refresh-Token', previousRefreshToken)
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('X-Refresh-Token', latestRefreshToken)
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('X-Refresh-Token', latestRefreshToken)
      .expect(401);

    return request(app.getHttpServer()).get('/me').expect(401);
  });

  it('returns UNAUTHORIZED for duplicate signup and wrong-password login', async () => {
    const email = `duplicate-${randomUUID()}@example.com`;
    const password = '123456';
    const nickname = 'tester';

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password, nickname, dog: defaultDog })
      .expect(201);

    const duplicateSignupResponse = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password, nickname, dog: defaultDog })
      .expect(401);

    expect((duplicateSignupResponse.body as ErrorResponse).error.code).toBe(
      'UNAUTHORIZED',
    );

    const wrongPasswordResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);

    expect((wrongPasswordResponse.body as ErrorResponse).error.code).toBe(
      'UNAUTHORIZED',
    );
  });

  it('supports GET/PATCH /me and rejects refresh token as bearer token', async () => {
    const session = await signupAndGetTokens();

    const beforeUpdateResponse = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect((beforeUpdateResponse.body as MeResponse).data.user).toMatchObject({
      id: session.userId,
      email: session.email,
      nickname: session.nickname,
      profileImage: null,
      bio: null,
    });

    const updateResponse = await request(app.getHttpServer())
      .patch('/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        nickname: 'updated-nickname',
        profileImage: 'https://example.com/avatar.png',
        bio: 'Hello!',
      })
      .expect(200);

    expect((updateResponse.body as MeResponse).data.user).toMatchObject({
      id: session.userId,
      email: session.email,
      nickname: 'updated-nickname',
      profileImage: 'https://example.com/avatar.png',
      bio: 'Hello!',
    });

    const emptyPatchResponse = await request(app.getHttpServer())
      .patch('/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({})
      .expect(200);

    expect((emptyPatchResponse.body as MeResponse).data.user).toMatchObject({
      nickname: 'updated-nickname',
      profileImage: 'https://example.com/avatar.png',
      bio: 'Hello!',
    });

    const refreshAsBearerResponse = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${session.refreshToken}`)
      .expect(401);

    expect((refreshAsBearerResponse.body as ErrorResponse).error.code).toBe(
      'UNAUTHORIZED',
    );
  });

  it('returns BAD_REQUEST for invalid PATCH /me payload', async () => {
    const session = await signupAndGetTokens();

    const invalidPatchResponse = await request(app.getHttpServer())
      .patch('/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ nickname: 'a' })
      .expect(400);

    const body = invalidPatchResponse.body as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(Array.isArray(body.error.message)).toBe(true);
  });

  it('requires dog object on signup', async () => {
    const email = `missing-dog-${randomUUID()}@example.com`;

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email,
        password: '123456',
        nickname: 'tester',
      })
      .expect(400);
  });

  it('rejects unknown photoFileId on signup', async () => {
    const email = `missing-file-${randomUUID()}@example.com`;

    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email,
        password: '123456',
        nickname: 'tester',
        dog: {
          ...defaultDog,
          photoFileId: randomUUID(),
        },
      })
      .expect(400);

    expect((response.body as ErrorResponse).error.code).toBe('BAD_REQUEST');
  });
});
