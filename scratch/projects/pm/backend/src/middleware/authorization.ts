export function adminGuard(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access denied' });
  }
  next();
}
