import { Router } from 'express';
import { register, login, refreshToken, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Example protected route — shows how to use the access token
router.get('/me', authenticate, (req, res) => {
  res.status(200).json({
    message: 'Protected route accessed successfully',
    user: req.user,
  });
});

export default router;
