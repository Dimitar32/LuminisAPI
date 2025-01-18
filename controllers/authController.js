import pool from '../utils/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET;

// Login Controller
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = jwt.sign({ id: user.rows[0].id, username: user.rows[0].username }, SECRET_KEY, {
      expiresIn: '2h',
    });

    res.json({ success: true, token, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
