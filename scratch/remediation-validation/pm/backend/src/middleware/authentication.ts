export function authMiddleware(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized credentials required' });
  }
  next();
}
