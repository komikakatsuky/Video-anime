import { createClient } from '@supabase/supabase-js';
import { Readable } from 'stream';

const supabase = createClient(
  'https://amwmjjquculjfrhsqsjb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Daftar domain blog yang diizinkan
const ALLOWED_DOMAINS = ['zoeinime.blogspot.com', 'zoeihua.blogspot.com', 'fluidplayerstream.blogspot.com', 'localhost'];

export default async function handler(req, res) {
  const referer = req.headers['referer'] || req.headers['origin'] || '';
  
  const isAllowed = ALLOWED_DOMAINS.some(domain => referer.includes(domain));
  const isLocal = referer.includes('localhost') || referer.includes('127.0.0.1');
  const isNoReferer = !referer;

  if (!isAllowed && !isLocal && !isNoReferer) {
    return res.status(403).json({ 
      error: 'Access Denied: Hotlinking is strictly prohibited!' 
    });
  }

  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Video path is required' });
  }

  try {
    // Buat Signed URL sementara dari Supabase
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(path, 7200);

    if (error || !data) {
      return res.status(404).json({ error: 'File video tidak ditemukan di Supabase' });
    }

    // PERBAIKAN: Hanya masukkan header range jika klien benar-benar mengirimkannya
    const fetchHeaders = {};
    if (req.headers.range) {
      fetchHeaders.range = req.headers.range;
    }

    // Ambil video dari Supabase secara server-side
    const upstreamResponse = await fetch(data.signedUrl, {
      headers: fetchHeaders
    });

    res.status(upstreamResponse.status);
    upstreamResponse.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Izinkan akses lintas domain
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    // Streaming menggunakan Node.js Readable Stream
    if (upstreamResponse.body) {
      const nodeStream = Readable.fromWeb(upstreamResponse.body);
      return nodeStream.pipe(res);
    } else {
      return res.status(500).json({ error: 'Upstream response body is null' });
    }

  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Server Error', details: err.message });
    }
  }
}
