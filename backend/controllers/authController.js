const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/signup
exports.signup = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array().map(e => e.msg).join('. '), data: null });
  }
  const { name, email, password, role, phone, designation } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already registered.', data: null });
  }

  const user = await User.create({ name, email, password, role: role || 'lawyer', phone, designation });
  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: 'User registered successfully.',
    data: { user: user.toJSON(), token }
  });
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array().map(e => e.msg).join('. '), data: null });
  }
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.', data: null });
  }

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: { user: user.toJSON(), token }
  });
});

// GET /api/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({
    success: true,
    message: 'Authenticated user.',
    data: { authenticated: true, user }
  });
});
