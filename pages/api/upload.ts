import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import cloudinary from '../../utils/cloudinary';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload to Cloudinary with watermark and text
    const result = await cloudinary.v2.uploader.upload(file.filepath, {
      folder: process.env.CLOUDINARY_FOLDER,
      transformation: [
        { width: 2000, crop: "limit" },
        {
          overlay: { resource_type: "image", public_id: "JRB-logo-white_voqtow" },
          gravity: "south_west",
          x: 50,
          y: 45,
          width: "0.03",
          opacity: 70,
          crop: "scale"
        },
        {
          overlay: { 
            font_family: "futura", 
            text: "JORDAN R BLUM",
            font_size: "140" 
          },
          gravity: "south",
          x: -130,
          y: 100,
          color: "white",
          opacity: 70
        }
      ]
    });

    // Clean up the temporary file
    fs.unlinkSync(file.filepath);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      message: 'Upload failed', 
      error: error.message,
      details: error.message || 'Unknown error'
    });
  }
} 