const User = require('../models/User');
const Case = require('../models/Case');
const { asyncHandler } = require('../middleware/errorHandler');

// GET /api/users
exports.getUsers = asyncHandler(async (req, res) => {
  const { search, role, sort, page = 1, limit = 50 } = req.query;
  let filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } }
    ];
  }
  if (role) filter.role = role;

  let sortObj = { name: 1 };
  if (sort) {
    const [field, order] = sort.split(':');
    sortObj = { [field]: order === 'asc' ? 1 : -1 };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter).sort(sortObj).skip(skip).limit(Number(limit)),
    User.countDocuments(filter)
  ]);

  // Enrich each user with assigned case count
  const enriched = await Promise.all(users.map(async (user) => {
    const caseCount = await Case.countDocuments({ advocate: user._id });
    const activeCaseCount = await Case.countDocuments({ advocate: user._id, status: 'Active' });
    return {
      ...user.toObject(),
      totalCases: caseCount,
      activeCases: activeCaseCount
    };
  }));

  res.json({
    success: true,
    message: 'Users retrieved.',
    data: enriched,
    pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
  });
});

// GET /api/users/:id
exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  const caseCount = await Case.countDocuments({ advocate: user._id });
  const activeCaseCount = await Case.countDocuments({ advocate: user._id, status: 'Active' });

  res.json({
    success: true,
    message: 'User retrieved.',
    data: { ...user.toObject(), totalCases: caseCount, activeCases: activeCaseCount }
  });
});

// PUT /api/users/:id (admin only)
exports.updateUser = asyncHandler(async (req, res) => {
  // Don't allow password updates through this route
  delete req.body.password;
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
  res.json({ success: true, message: 'User updated.', data: user });
});
