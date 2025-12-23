const mongoose = require('mongoose');


const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Balance cannot be negative'],
      get: (v) => Math.round(v * 100) / 100,
      set: (v) => Math.round(v * 100) / 100,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Index for faster queries
userSchema.index({ email: 1 });

userSchema.statics.updateBalance = async function (userId, delta, session) {
  const roundedDelta = Math.round(delta * 100) / 100;

  // Build atomic query
  const query = { _id: userId };

  // When debiting (negative delta), ensure sufficient balance atomically
  if (roundedDelta < 0) {
    query.balance = { $gte: Math.abs(roundedDelta) };
  }

  // Atomic update with conditional check
  const updatedUser = await this.findOneAndUpdate(
    query,
    { $inc: { balance: roundedDelta } },
    {
      new: true,
      session,
      runValidators: true
    }
  );

  if (!updatedUser) {
    throw new Error('Insufficient balance');
  }

  return updatedUser;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
