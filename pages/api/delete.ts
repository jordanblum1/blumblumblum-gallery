import { NextApiRequest, NextApiResponse } from 'next';
import cloudinary from '../../utils/cloudinary';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { public_id } = req.query;

  if (!public_id || typeof public_id !== 'string') {
    return res.status(400).json({ message: 'Public ID is required' });
  }

  try {
    const result = await cloudinary.v2.uploader.destroy(public_id);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ message: 'Delete failed', error: error.message });
  }
} 