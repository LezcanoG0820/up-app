// apps/api/middlewares/auth.js
module.exports.requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ ok: false, error: 'No autenticado' });
  }
  next();
};

module.exports.requireRole = (...roles) => {
  return (req, res, next) => {
    const user = req.sessionUser;
    if (!user || !roles.includes(user.rol)) {
      return res.status(403).json({ ok: false, error: 'Sin permisos' });
    }
    next();
  };
};
