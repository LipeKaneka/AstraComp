/**
 * Acesso à tabela de mensagens no Supabase (REST).
 *
 * Variáveis de ambiente (arquivo .env local ou painel da Vercel):
 *   SUPABASE_URL = https://xxxxxxxxxxxx.supabase.co
 *   SUPABASE_KEY = anon/public key do Supabase
 */

const TABLE = 'mensagens';

function config() {
  const { SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL e SUPABASE_KEY não configuradas.');
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}

async function inserirMensagem(dados) {
  const { url, key } = config();
  const res = await fetch(`${url}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(dados),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
}

module.exports = { inserirMensagem };
