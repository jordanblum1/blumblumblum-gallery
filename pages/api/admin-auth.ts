import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  // Check against environment variable
  if (password === process.env.ADMIN_PASSWORD) {
    // Set a cookie for persistent auth
    res.setHeader(
      'Set-Cookie',
      `admin-auth=${process.env.ADMIN_PASSWORD}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
    );
    return res.status(200).json({ message: 'Authenticated' });
  }

  return res.status(401).json({ message: 'Invalid password' });
} 