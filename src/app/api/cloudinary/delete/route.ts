import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function POST(req: Request) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Daftar URL tidak valid atau kosong' }, { status: 400 });
    }

    // Konfigurasi dinamis di dalam fungsi (lebih aman saat runtime)
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;

    if (!api_key || !api_secret) {
      console.error("[CLOUD-DELETE-ERROR] API Key atau Secret Cloudinary TIDAK DITEMUKAN di Environment Server.");
      return NextResponse.json({ 
        error: 'Server tidak memiliki izin akses (Kredensial Cloudinary kosong). Silakan restart npm run dev BOS!' 
      }, { status: 401 });
    }

    cloudinary.config({ cloud_name, api_key, api_secret });

    const deletionResults = [];

    for (const url of urls) {
      try {
        if (!url) continue;

        // Logika ekstraksi publicId yang mendukung folder (studioaset/login-notifications/...)
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        let publicId = "";

        if (uploadIndex !== -1) {
          // Cari bagian setelah 'upload/' dan lewati versi (v123...)
          let sliceStart = uploadIndex + 1;
          const nextPart = parts[sliceStart];
          if (nextPart.startsWith('v') && /^\d+$/.test(nextPart.substring(1))) {
            sliceStart = uploadIndex + 2;
          }

          // Gabungkan sisa bagian menjadi publicId lengkap dengan folder
          const fullPath = parts.slice(sliceStart).join('/');
          // Buang ekstensi (.jpg, .png) paling akhir
          publicId = decodeURIComponent(fullPath.substring(0, fullPath.lastIndexOf('.')));
        }

        if (!publicId) {
            deletionResults.push({ url, error: 'Format URL tidak dikenali (Gagal ambil ID)' });
            continue;
        }

        console.log(`[CLOUD-DELETE] Menghapus ID: ${publicId} (URL: ${url})`);

        // Hapus paksa (invalidate) dari Cloudinary
        const result = await cloudinary.uploader.destroy(publicId, { 
            resource_type: 'image',
            invalidate: true 
        });

        console.log(`[CLOUD-DELETE] Hasil destroy untuk ${publicId}:`, result);
        deletionResults.push({ url, publicId, result });
        
      } catch (err: any) {
        console.error(`[CLOUD-DELETE] Kegagalan sistem saat menghapus ${url}:`, err);
        deletionResults.push({ url, error: err.message });
      }
    }

    // Cek apakah ada yang benar-benar berhasil terhapus (Cloudinary balas result: 'ok')
    const hasSuccess = deletionResults.some(r => r.result?.result === 'ok');

    return NextResponse.json({ 
        success: hasSuccess, 
        results: deletionResults,
        message: hasSuccess ? "Terhapus!" : "Cloudinary mengabarkan ID tidak ditemukan atau gagal."
    }, { status: 200 });

  } catch (error: any) {
    console.error('CRITICAL ERROR in Cloudinary Delete API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
