import { put, list } from '@vercel/blob';

const BLOB_KEY = 'chefcontrol-purchases.json';

export default async function handler(req, res) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({
        error: 'Faltando BLOB_READ_WRITE_TOKEN. Configure no Vercel.'
      });
    }

    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: BLOB_KEY });

      if (!blobs || blobs.length === 0) {
        return res.status(200).json([]);
      }

      const blob = blobs[0];
      const response = await fetch(blob.url);
      const text = await response.text();

      try {
        return res.status(200).json(JSON.parse(text));
      } catch (error) {
        return res.status(200).json([]);
      }
    }

    if (req.method === 'POST') {
      const { purchases } = await req.json();
      const payload = Array.isArray(purchases) ? purchases : [];

      const blob = await put(BLOB_KEY, JSON.stringify(payload), {
        access: 'public',
        addRandomSuffix: false
      });

      return res.status(200).json({ ok: true, url: blob.url });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error) {
    console.error('Erro no endpoint /api/purchases:', error);
    return res.status(500).json({
      error: 'Erro ao acessar o armazenamento compartilhado.'
    });
  }
}
