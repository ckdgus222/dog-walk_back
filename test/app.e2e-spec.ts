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
  };
};

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('validates login/me/refresh/logout flow with token rotation', async () => {
    const email = `e2e-${randomUUID()}@example.com`;
    const password = '123456';
    const nickname = 'tester';

    await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email, password, nickname })
      .expect(201);

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
});
