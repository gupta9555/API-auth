import { Request, Response } from 'express';
import User from '../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';

// ─── POST /register ──────────────────────────────────────────────────────────
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: 'User with this email already exists' });
      return;
    }

    // Create & save user (password hashed via pre-save hook)
    const user = new User({ email, password });
    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// ─── POST /login ─────────────────────────────────────────────────────────────
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const payload = { userId: (user._id as unknown as string).toString(), email: user.email };

    // Generate tokens
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store hashed refresh token in DB for rotation / revocation
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      expiresIn: '1m',
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// ─── POST /refresh-token ─────────────────────────────────────────────────────
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    // Verify the token is cryptographically valid
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      res.status(401).json({ message: 'Invalid or expired refresh token' });
      return;
    }

    // Check token matches what we stored (detects reuse after rotation)
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== token) {
      // Possible token reuse — revoke all refresh tokens for this user
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
      res.status(401).json({ message: 'Refresh token reuse detected. Please log in again.' });
      return;
    }

    const payload = { userId: (user._id as unknown as string).toString(), email: user.email };

    // Rotate both tokens
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json({
      message: 'Tokens refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: '1m',
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};

// ─── POST /logout ─────────────────────────────────────────────────────────────
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      res.status(400).json({ message: 'Refresh token is required' });
      return;
    }

    const user = await User.findOne({ refreshToken: token });
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error });
  }
};
