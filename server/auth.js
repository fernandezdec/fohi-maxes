const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fohi-maxes-secret';

const COACH_ROLES = ['coach', 'admin', 'head_coach', 'coordinator', 'position_coach'];

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireCoach(req, res, next) {
  if (!COACH_ROLES.includes(req.user.role)) {
    return res.status(403).json({ error: 'Coach access required' });
  }
  next();
}

module.exports = { authMiddleware, requireCoach, JWT_SECRET, COACH_ROLES };
