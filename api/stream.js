import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://amwmjjquculjfrhsqsjb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Daftar blog yang diizinkan memutar video
const ALLOWED_DOMAINS = ['zoeinime.blogspot.com', 'zoeihua.blogspot.com'];

export default async function handler(req, res) {
  const referer = req.headers['referer'] || '';
  
  // Validasi domain (izinkan juga localhost untuk uji coba)
  const isAllowed = ALLOWED_DOMAINS.some(domain => referer.includes(domain));
  const isLocal = referer.includes('localhost') || referer.includes('127.0.0.1');

  if (!isAllowed && !isLocal) {
    return res.status(403).json({ 
      error: 'Access Denied: Hotlinking is strictly prohibited!' 
    });
  }

  const { path } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Video path is required' });
  }

  try {
    // Buat Signed URL sementara yang aman (berlaku 60 detik) dari Private Bucket
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(path, 60);

    if (error) throw error;

    // Redirect browser ke link resmi Supabase (mendukung streaming & range request otomatis)
    return res.redirect(302, data.signedUrl);

  } catch (err) {
    return res.status(404).json({ error: 'Video not found or failed to load' });
  }
}
