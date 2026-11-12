const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validarProduto } = require('./validacao');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET = 'senha_super_secreta_faculdade';

// Configuração do Banco SQLite (em memória se for teste, ou arquivo físico se for execução real)
const db = new Database(process.env.NODE_ENV === 'test' ? ':memory:' : 'estoque.db');

// Criação das Tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE,
    senha TEXT
  );
  CREATE TABLE IF NOT EXISTS produtos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE,
    preco REAL,
    quantidade INTEGER
  );
`);

// Cria o usuário admin se não existir
const adminExiste = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get('admin');
if (!adminExiste) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO usuarios (usuario, senha) VALUES (?, ?)').run('admin', hash);
}

// Middleware para barrar quem não tem token
function verificarToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ erro: 'Acesso negado. Token não fornecido.' });
  
  try {
    const decodificado = jwt.verify(token.split(' ')[1], SECRET);
    req.usuario = decodificado;
    next();
  } catch (err) {
    res.status(401).json({ erro: 'Token inválido' });
  }
}

// Rota de Login (Gera o Token JWT)
app.post('/api/login', (req, res) => {
  const { usuario, senha } = req.body;
  const user = db.prepare('SELECT * FROM usuarios WHERE usuario = ?').get(usuario);
  
  if (!user || !bcrypt.compareSync(senha, user.senha)) {
    return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
  }
  
  const token = jwt.sign({ id: user.id, usuario: user.usuario }, SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// CRUD de Produtos (Todas exigem o token)
app.post('/api/produtos', verificarToken, (req, res) => {
  const { nome, preco, quantidade } = req.body;
  const validacao = validarProduto(nome, preco, quantidade);
  
  if (!validacao.valido) return res.status(400).json({ erro: validacao.erro });
  
  try {
    const info = db.prepare('INSERT INTO produtos (nome, preco, quantidade) VALUES (?, ?, ?)').run(nome, preco, quantidade);
    res.status(201).json({ id: info.lastInsertRowid, nome, preco, quantidade });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ erro: 'Produto já existe com este nome' });
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/produtos', verificarToken, (req, res) => {
  const { nome } = req.query;
  let produtos;
  if (nome) {
    produtos = db.prepare('SELECT * FROM produtos WHERE nome LIKE ?').all(`%${nome}%`);
  } else {
    produtos = db.prepare('SELECT * FROM produtos').all();
  }
  res.json(produtos);
});

app.put('/api/produtos/:id', verificarToken, (req, res) => {
  const { nome, preco, quantidade } = req.body;
  const validacao = validarProduto(nome, preco, quantidade);
  
  if (!validacao.valido) return res.status(400).json({ erro: validacao.erro });
  
  const info = db.prepare('UPDATE produtos SET nome = ?, preco = ?, quantidade = ? WHERE id = ?').run(nome, preco, quantidade, req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
  
  res.json({ id: Number(req.params.id), nome, preco, quantidade });
});

app.delete('/api/produtos/:id', verificarToken, (req, res) => {
  const info = db.prepare('DELETE FROM produtos WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erro: 'Produto não encontrado' });
  res.status(200).json({ mensagem: 'Produto excluído' });
});

module.exports = app;