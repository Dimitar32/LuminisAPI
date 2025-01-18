import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET;

// Middleware to verify JWT
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY); // Verify the token
    req.user = decoded; // Attach decoded user information to the request object
    next(); // Proceed to the next middleware or route
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Invalid token' });
  }
};
