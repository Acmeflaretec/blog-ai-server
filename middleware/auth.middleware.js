const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.protect = async (req, res, next) => {
  try {
    const token = req.cookies['auth-token'];
    
    if (!token) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
}; 