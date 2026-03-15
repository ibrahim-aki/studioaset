import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Invalid or missing "urls" array' }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn("Cloudinary API Key or Secret is missing. Skipping image deletion.");
      return NextResponse.json({ message: 'Skipped. Missing Credentials.' }, { status: 200 });
    }

    const deletionResults = [];

    for (const url of urls) {
      try {
        // Extract public_id from Cloudinary URL reliably
        // Example URL: https://res.cloudinary.com/dxyz123/image/upload/v1234567/preset_name/filename.jpg
        // Matches everything after /upload/ (ignoring optional /v<numbers>/) up to the file extension
        const matches = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
        if (!matches || !matches[1]) {
          console.warn(`Could not extract public_id from ${url}`);
          deletionResults.push({ url, error: 'Invalid URL format' });
          continue;
        }

        const publicId = decodeURIComponent(matches[1]);

        // Delete from Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`Cloudinary deletion for ${publicId}:`, result);
        deletionResults.push({ url, publicId, result });
        
      } catch (err: any) {
        console.error(`Failed to delete Cloudinary image: ${url}`, err);
        deletionResults.push({ url, error: err.message });
      }
    }

    return NextResponse.json({ success: true, results: deletionResults }, { status: 200 });
  } catch (error: any) {
    console.error('Error in Cloudinary Delete API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
