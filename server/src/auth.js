// Middleware de autenticación compartido (sesión por Bearer token).
import { getUserByToken } from './db.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  const user = getUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Sesión inválida' });
  req.user = user;
  req.token = token;
  next();
}
