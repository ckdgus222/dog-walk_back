import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { MediaPurpose } from '@prisma/client';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
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

type DogProfile = {
  id: string;
  ownerId: string;
  name: string;
  breed: string;
  birthYear: string | null;
  gender: 'male' | 'female';
  personality: string[];
  photoFileId: string | null;
  createdAt: string;
  updatedAt: string;
};

type DogResponse = {
  data: {
    dog: DogProfile;
  };
};

type DogListResponse = {
  data: {
    dogs: DogProfile[];
  };
};

type ErrorResponse = {
  error: {
    code: string;
    message: string | string[];
    details?: unknown;
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

const signupDogPayload = {
  name: '가입강아지',
  breed: '믹스',
  birthYear: '',
  gender: 'male',
  personality: ['calm'],
} as const;

describe('Dogs API (e2e)', () => {
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
    await prisma.dog.deleteMany();
    await prisma.user.deleteMany();
    await prisma.media.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const signupAndGetSession = async (nicknamePrefix: string) => {
    const email = `dogs-${randomUUID()}@example.com`;
    const password = '123456';
    const nickname = `${nicknamePrefix}-${randomUUID().slice(0, 8)}`;

    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email,
        password,
        nickname,
        dog: signupDogPayload,
      })
      .expect(201);

    const body = response.body as AuthTokensResponse;

    return {
      userId: body.data.user.id,
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
    };
  };

  const createDogProfileMedia = async (
    options: { uploaderUserId?: string; purpose?: MediaPurpose } = {},
  ) => {
    const media = await prisma.media.create({
      data: {
        purpose: options.purpose ?? MediaPurpose.DOG_PROFILE,
        storageKey: `media/e2e-dogs-${randomUUID()}.jpg`,
        url: `https://example.com/e2e-dogs-${randomUUID()}.jpg`,
        mimeType: 'image/jpeg',
        size: 1024,
        uploaderUserId: options.uploaderUserId,
      },
      select: { id: true },
    });

    return media.id;
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

  it('POST /dogs creates dog and claims photo ownership when photoFileId is provided', async () => {
    const session = await signupAndGetSession('owner');
    const photoFileId = await uploadDogProfileMedia();
    const uploadedMediaBeforeCreate = await prisma.media.findUniqueOrThrow({
      where: { id: photoFileId },
      select: {
        storageKey: true,
        uploaderUserId: true,
      },
    });
    expect(uploadedMediaBeforeCreate.storageKey.startsWith('tmp/media/')).toBe(
      true,
    );
    expect(uploadedMediaBeforeCreate.uploaderUserId).toBeNull();

    const response = await request(app.getHttpServer())
      .post('/dogs')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name: '콩이',
        breed: '푸들',
        birthYear: '',
        gender: 'male',
        personality: ['friendly', 'active'],
        photoFileId,
      })
      .expect(201);

    const body = response.body as DogResponse;
    expect(body.data.dog).toMatchObject({
      ownerId: session.userId,
      name: '콩이',
      breed: '푸들',
      birthYear: null,
      gender: 'male',
      personality: ['friendly', 'active'],
      photoFileId,
    });

    const claimedMedia = await prisma.media.findUnique({
      where: { id: photoFileId },
      select: { uploaderUserId: true, storageKey: true, url: true },
    });
    expect(claimedMedia?.uploaderUserId).toBe(session.userId);
    expect(claimedMedia?.storageKey.startsWith('media/')).toBe(true);
    expect(claimedMedia?.storageKey.startsWith('tmp/')).toBe(false);
    expect(claimedMedia?.url).toBe(`/uploads/${claimedMedia?.storageKey}`);
  });

  it('GET /dogs/my returns only current user dogs in createdAt desc order', async () => {
    const me = await signupAndGetSession('me');
    const other = await signupAndGetSession('other');

    await request(app.getHttpServer())
      .post('/dogs')
      .set('Authorization', `Bearer ${me.accessToken}`)
      .send({
        name: '두부',
        breed: '리트리버',
        birthYear: '2021',
        gender: 'female',
        personality: ['active'],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/dogs')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({
        name: '남의강아지',
        breed: '시바',
        birthYear: '2020',
        gender: 'male',
        personality: ['smart'],
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/dogs/my')
      .set('Authorization', `Bearer ${me.accessToken}`)
      .expect(200);

    const dogs = (response.body as DogListResponse).data.dogs;
    expect(dogs.length).toBe(2);
    expect(dogs.every((dog) => dog.ownerId === me.userId)).toBe(true);
    expect(dogs.map((dog) => dog.name)).toEqual(['두부', '가입강아지']);

    const createdAtTimes = dogs.map((dog) => new Date(dog.createdAt).getTime());
    expect(createdAtTimes[0]).toBeGreaterThanOrEqual(createdAtTimes[1]);
  });

  it('PATCH /dogs/:id updates owned dog with partial payload', async () => {
    const session = await signupAndGetSession('owner');
    const ownedDog = await prisma.dog.findFirstOrThrow({
      where: { ownerId: session.userId },
      select: { id: true },
    });
    const newPhotoFileId = await uploadDogProfileMedia();

    const response = await request(app.getHttpServer())
      .patch(`/dogs/${ownedDog.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name: '수정콩이',
        birthYear: '',
        personality: ['gentle'],
        photoFileId: newPhotoFileId,
      })
      .expect(200);

    const dog = (response.body as DogResponse).data.dog;
    expect(dog).toMatchObject({
      id: ownedDog.id,
      ownerId: session.userId,
      name: '수정콩이',
      birthYear: null,
      personality: ['gentle'],
      photoFileId: newPhotoFileId,
    });

    const claimedMedia = await prisma.media.findUnique({
      where: { id: newPhotoFileId },
      select: { uploaderUserId: true, storageKey: true },
    });
    expect(claimedMedia?.uploaderUserId).toBe(session.userId);
    expect(claimedMedia?.storageKey.startsWith('media/')).toBe(true);
  });

  it('POST /dogs returns 400 for invalid payload', async () => {
    const session = await signupAndGetSession('owner');

    const response = await request(app.getHttpServer())
      .post('/dogs')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name: '',
        breed: '푸들',
        birthYear: '2022',
        gender: 'male',
        personality: ['friendly'],
      })
      .expect(400);

    const body = response.body as ErrorResponse;
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(Array.isArray(body.error.message)).toBe(true);
  });

  it('dogs endpoints return 401 without access token', async () => {
    const session = await signupAndGetSession('owner');
    const ownedDog = await prisma.dog.findFirstOrThrow({
      where: { ownerId: session.userId },
      select: { id: true },
    });

    await request(app.getHttpServer()).post('/dogs').send({}).expect(401);
    await request(app.getHttpServer()).get('/dogs/my').expect(401);
    await request(app.getHttpServer())
      .patch(`/dogs/${ownedDog.id}`)
      .send({})
      .expect(401);
  });

  it('PATCH /dogs/:id returns 404 for non-owned dog', async () => {
    const owner = await signupAndGetSession('owner');
    const intruder = await signupAndGetSession('intruder');
    const ownerDog = await prisma.dog.findFirstOrThrow({
      where: { ownerId: owner.userId },
      select: { id: true },
    });

    const response = await request(app.getHttpServer())
      .patch(`/dogs/${ownerDog.id}`)
      .set('Authorization', `Bearer ${intruder.accessToken}`)
      .send({
        name: '침입수정',
      })
      .expect(404);

    expect((response.body as ErrorResponse).error.code).toBe('NOT_FOUND');
  });

  it('POST /dogs returns 400 for photoFileId owned by another user', async () => {
    const owner = await signupAndGetSession('owner');
    const intruder = await signupAndGetSession('intruder');
    const foreignPhotoFileId = await createDogProfileMedia({
      uploaderUserId: owner.userId,
    });

    const response = await request(app.getHttpServer())
      .post('/dogs')
      .set('Authorization', `Bearer ${intruder.accessToken}`)
      .send({
        name: '사진검증',
        breed: '포메',
        birthYear: '2020',
        gender: 'female',
        personality: ['bright'],
        photoFileId: foreignPhotoFileId,
      })
      .expect(400);

    expect((response.body as ErrorResponse).error.code).toBe('BAD_REQUEST');
  });
});
