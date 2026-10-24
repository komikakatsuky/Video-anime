import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://amwmjjquculjfrhsqsjb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Daftar domain blog Anda
const ALLOWED_DOMAINS = ['zoeinime.blogspot.com', 'zoeihua.blogspot.com'];

export default async function handler(req, res) {
  // Tangkap Referer atau Origin dari request browser
  const referer = req.headers['referer'] || req.headers['origin'] || '';
  
  // Izinkan jika dari domain blog, atau jika dibuka di iframe / direct media request
  const isAllowed = ALLOWED_DOMAINS.some(domain => referer.includes(domain));
  const isLocal = referer.includes('localhost') || referer.includes('127.0.0.1');

  // Jika Referer kosong (sering terjadi pada tag <video>), izinkan sementara untuk pengujian streaming
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
    // Buat Signed URL aman (berlaku 2 jam / 7200 detik agar streaming durasi panjang tidak terputus)
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(path, 7200);

    if (error || !data) {
      return res.status(404).json({ error: 'File video tidak ditemukan di Supabase', details: error });
    }

    // Redirect browser langsung ke link streaming Supabase
    return res.redirect(302, data.signedUrl);

  } catch (err) {
    return res.status(500).json({ error: 'Server Error', details: err.message });
  }
}
