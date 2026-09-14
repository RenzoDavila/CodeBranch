import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/auth/domain/user-role.enum';

/**
 * Pruebas end-to-end del contrato RBAC: verifican que el login simulado emite
 * tokens y que los guards bloquean los roles no autorizados.
 */
describe('Financial Dashboard API (e2e)', () => {
  let app: INestApplication<App>;

  /**
   * Levanta la aplicación completa antes de la suite.
   */
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  /**
   * Libera los recursos de la aplicación al terminar.
   */
  afterAll(async () => {
    await app.close();
  });

  /**
   * Obtiene un access token para un rol dado.
   * @param role Rol solicitado.
   * @returns JWT firmado.
   */
  const login = async (role: UserRole): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/mock-login')
      .send({ role })
      .expect(200);

    return (response.body as { accessToken: string }).accessToken;
  };

  it('GET /health responde ok', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });

  it('POST /auth/mock-login rechaza roles inválidos', async () => {
    await request(app.getHttpServer())
      .post('/auth/mock-login')
      .send({ role: 'hacker' })
      .expect(400);
  });

  it('GET /watchlist rechaza peticiones sin token', async () => {
    await request(app.getHttpServer()).get('/watchlist').expect(401);
  });

  it('GET /watchlist prohíbe el acceso al rol viewer', async () => {
    const token = await login(UserRole.VIEWER);

    await request(app.getHttpServer())
      .get('/watchlist')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });

  it('GET /audit/logs solo es accesible por admin', async () => {
    const traderToken = await login(UserRole.TRADER);
    const adminToken = await login(UserRole.ADMIN);

    await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${traderToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  it('audita automáticamente las mutaciones de un trader', async () => {
    const traderToken = await login(UserRole.TRADER);
    const adminToken = await login(UserRole.ADMIN);

    await request(app.getHttpServer())
      .post('/watchlist')
      .set('Authorization', `Bearer ${traderToken}`)
      .send({ coinId: 'bitcoin', symbol: 'btc', targetPrice: 150000 })
      .expect(201);

    const logs = await request(app.getHttpServer())
      .get('/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(logs.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'POST',
          resource: '/watchlist',
          role: UserRole.TRADER,
          outcome: 'success',
        }),
      ]),
    );
  });
});
