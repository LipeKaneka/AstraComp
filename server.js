/**
 * Astra Company — servidor para rodar localmente (npm start).
 *
 * Na Vercel este arquivo não é usado: ela serve a pasta public/ e executa
 * api/contato.js como função serverless. Aqui reproduzimos o mesmo comportamento.
 *
 * Variáveis de ambiente: veja .env.example
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

/* ── carrega .env se existir ── */
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach(line => {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    });
}

const contato = require('./api/contato');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const filePath = path.join(PUBLIC_DIR, urlPath === '/' ? 'index.html' : urlPath);

  // Impede acesso a arquivos fora de public/ (ex.: /../.env)
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Acesso negado.');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Não encontrado.');
    }
    const type = CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/contato')) return contato(req, res);
  if (req.method === 'GET') return serveStatic(req, res);

  res.writeHead(404);
  res.end('Não encontrado.');
});

server.listen(PORT, () => {
  console.log(`\n🚀 Astra Company rodando em http://localhost:${PORT}`);
  console.log('   Pressione Ctrl+C para encerrar.\n');
});
