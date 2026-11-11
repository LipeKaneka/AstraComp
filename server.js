/**
 * Astra Company — servidor com Supabase
 *
 * Variáveis de ambiente necessárias (.env local / Render dashboard):
 *   SUPABASE_URL  = https://xxxxxxxxxxxx.supabase.co
 *   SUPABASE_KEY  = sua anon/public key do Supabase
 *   PORT          = 3000 (opcional, Render injeta automaticamente)
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

/* ── carrega .env se existir (ambiente local) ── */
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach(line => {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
    });
}

const PORT          = process.env.PORT || 3000;
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('\n❌ SUPABASE_URL e SUPABASE_KEY são obrigatórios.');
  console.error('   Crie um arquivo .env com essas variáveis (veja .env.example)\n');
  process.exit(1);
}

const SUPABASE_TABLE = 'mensagens';

/* ── helpers Supabase ── */
async function inserirMensagem(dados) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`, {
    method  : 'POST',
    headers : {
      'Content-Type'  : 'application/json',
      'apikey'        : SUPABASE_KEY,
      'Authorization' : `Bearer ${SUPABASE_KEY}`,
      'Prefer'        : 'return=minimal'
    },
    body: JSON.stringify(dados)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase: ${err}`);
  }
}

async function listarMensagens() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}?order=id.asc`,
    {
      headers: {
        'apikey'        : SUPABASE_KEY,
        'Authorization' : `Bearer ${SUPABASE_KEY}`
      }
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase retornou ${res.status}: ${err}`);
  }
  return res.json();
}

/* ── arquivos estáticos ── */
const HTML_FILE = path.join(__dirname, 'index.html');
const CSS_FILE  = path.join(__dirname, 'style.css');
const JS_FILE   = path.join(__dirname, 'script.js');

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Arquivo não encontrado.'); return; }
    res.writeHead(200, { 'Content-Type': `${contentType}; charset=utf-8` });
    res.end(data);
  });
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

/* ── servidor HTTP ── */
const server = http.createServer((req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  /* arquivos estáticos */
  if (req.method === 'GET') {
    if (req.url === '/' || req.url === '/index.html')
      return serveFile(res, HTML_FILE, 'text/html');
    if (req.url === '/style.css')
      return serveFile(res, CSS_FILE, 'text/css');
    if (req.url === '/script.js')
      return serveFile(res, JS_FILE, 'application/javascript');

    /* lista mensagens salvas */
    if (req.url === '/mensagens') {
      listarMensagens()
        .then(lista => json(res, 200, lista))
        .catch(err  => json(res, 500, { erro: err.message }));
      return;
    }
  }

  /* recebe nova mensagem do formulário */
  if (req.method === 'POST' && req.url === '/contato') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { nome, email, assunto, mensagem } = JSON.parse(body);

        if (!nome || !email || !mensagem) {
          return json(res, 400, { ok: false, erro: 'Campos obrigatórios ausentes.' });
        }

        const entrada = {
          data    : new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          nome, email,
          assunto : assunto || '',
          mensagem
        };

        inserirMensagem(entrada)
          .then(() => {
            console.log(`✉  Nova mensagem de ${nome} <${email}>`);
            json(res, 200, { ok: true });
          })
          .catch(err => {
            console.error('Erro ao salvar:', err.message);
            json(res, 500, { ok: false, erro: 'Erro ao salvar mensagem.' });
          });

      } catch {
        json(res, 400, { ok: false, erro: 'JSON inválido.' });
      }
    });
    return;
  }

  res.writeHead(404); res.end('Não encontrado.');
});

server.listen(PORT, () => {
  const isCloud = !!process.env.RENDER;
  if (isCloud) {
    console.log(`\n🚀 Astra Company no ar — porta ${PORT}`);
  } else {
    console.log(`\n🚀 Astra Company rodando em http://localhost:${PORT}`);
    console.log(`   Pressione Ctrl+C para encerrar.\n`);
  }
});