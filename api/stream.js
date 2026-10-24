import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase dengan URL Anda dan Service Role Key dari Environment Variables Vercel
const supabase = createClient(
  'https://amwmjjquculjfrhsqsjb.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Daftar blog yang diizinkan memutar video
const ALLOWED_DOMAINS = ['https://zoeinime.blogspot.com', 'https://zoeihua.blogspot.com'];

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

  const { path } = req.query; // Contoh parameter: /api/stream?path=nama_video.mp4
  if (!path) {
    return res.status(400).json({ error: 'Video path is required' });
  }

  try {
    // Ambil file video dari Private Bucket Supabase
    const { data, error } = await supabase.storage.from('videos').download(path);
    
    if (error) throw error;

    // Atur header agar browser mengenalinya sebagai video streaming
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    
    const buffer = Buffer.from(await data.arrayBuffer());
    return res.status(200).send(buffer);

  } catch (err) {
    return res.status(404).json({ error: 'Video not found or failed to load' });
  }
}
