/**
 * POST /api/contato — recebe a mensagem do formulário e salva no Supabase.
 * Roda como função serverless na Vercel e também pelo server.js local.
 */

const { inserirMensagem } = require('../lib/supabase');

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

// A Vercel já entrega req.body como objeto; no server.js local o corpo vem em stream.
async function readBody(req) {
  if (req.body !== undefined) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || '{}');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, erro: 'Método não permitido.' });
  }

  let campos;
  try {
    campos = await readBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, erro: 'JSON inválido.' });
  }

  const { nome, email, assunto, mensagem } = campos;
  if (!nome || !email || !mensagem) {
    return sendJson(res, 400, { ok: false, erro: 'Campos obrigatórios ausentes.' });
  }

  try {
    await inserirMensagem({
      data: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      nome,
      email,
      assunto: assunto || '',
      mensagem,
    });
    return sendJson(res, 200, { ok: true });
  } catch (err) {
    console.error('Erro ao salvar mensagem:', err.message);
    return sendJson(res, 500, { ok: false, erro: 'Erro ao salvar mensagem.' });
  }
};
