import { expect, test, beforeAll } from 'vitest';
const request = require('supertest');
const app = require('./app');
const { validarProduto } = require('./validacao');

test('CT-U01: Recusar nome vazio', () => {
  const res = validarProduto('', 10, 5);
  expect(res.valido).toBe(false);
});

test('CT-U02: Recusar preço negativo', () => {
  const res = validarProduto('Coxinha', -5, 5);
  expect(res.valido).toBe(false);
});

test('CT-U03: Aceitar produto válido', () => {
  const res = validarProduto('Coxinha', 6.5, 10);
  expect(res.valido).toBe(true);
});

let token = '';

beforeAll(async () => {
  const res = await request(app).post('/api/login').send({ usuario: 'admin', senha: 'admin123' });
  token = res.body.token;
});

test('CT-A01: Login válido', async () => {
  const res = await request(app).post('/api/login').send({ usuario: 'admin', senha: 'admin123' });
  expect(res.status).toBe(200);
});

test('CT-A02: Login inválido', async () => {
  const res = await request(app).post('/api/login').send({ usuario: 'admin', senha: 'senhaerrada' });
  expect(res.status).toBe(401);
});

test('CT-A03: Listar sem token é bloqueado', async () => {
  const res = await request(app).get('/api/produtos');
  expect(res.status).toBe(401);
});

test('CT-A04: Criar produto válido com token', async () => {
  const res = await request(app)
    .post('/api/produtos')
    .set('Authorization', 'Bearer ' + token)
    .send({ nome: 'Bolo de Chocolate', preco: 12, quantidade: 3 });
  expect(res.status).toBe(201);
});
