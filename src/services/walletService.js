const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

/**
 * Wallet Service
 * Handles all wallet-related business logic with transaction safety
 */
class WalletService {
  /**
   * Create a new user account with initial balance
   */
  async createAccount(name, email, initialBalance = null) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      const balance = initialBalance !== null ? initialBalance : parseFloat(process.env.INITIAL_BALANCE || 100);

      const user = new User({
        name,
        email,
        balance,
      });

      await user.save();

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        createdAt: user.createdAt,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user balance by user ID
   */
  async getBalance(userId) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Transfer money from one user to another
   * Uses MongoDB transactions to ensure atomicity (when available)
   */
  async transferMoney(fromUserId, toUserId, amount, description = '') {
    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(fromUserId)) {
      throw new Error('Invalid sender user ID format');
    }
    if (!mongoose.Types.ObjectId.isValid(toUserId)) {
      throw new Error('Invalid recipient user ID format');
    }

    // Proper self-transfer check (handles both string and ObjectId)
    if (fromUserId.toString() === toUserId.toString()) {
      throw new Error('Cannot transfer money to yourself');
    }

    if (amount <= 0) {
      throw new Error('Transfer amount must be greater than 0');
    }

    // Round to 2 decimal places to avoid floating point issues
    const transferAmount = Math.round(amount * 100) / 100;

    // Check if transactions are supported (requires replica set)
    const client = mongoose.connection.getClient();
    const supportsTransactions = client.topology && client.topology.description.type !== 'Single';

    if (supportsTransactions) {
      // Use transaction for production (replica set available)
      return await this._transferWithTransaction(fromUserId, toUserId, transferAmount, description);
    } else {
      // Fallback for testing/development without replica set
      console.warn('⚠️  MongoDB transactions not supported. Using atomic operations instead.');
      return await this._transferWithAtomicOps(fromUserId, toUserId, transferAmount, description);
    }
  }

  /**
   * Transfer with full MongoDB transaction (production mode)
   * @private
   */
  async _transferWithTransaction(fromUserId, toUserId, transferAmount, description) {
    const session = await mongoose.startSession();

    try {
      await session.startTransaction();

      // Verify both users exist
      const fromUser = await User.findById(fromUserId).session(session);
      const toUser = await User.findById(toUserId).session(session);

      if (!fromUser) {
        throw new Error('Sender user not found');
      }
      if (!toUser) {
        throw new Error('Recipient user not found');
      }

      // Check sufficient balance
      if (fromUser.balance < transferAmount) {
        throw new Error('Insufficient balance');
      }

      // Debit from sender (atomic)
      await User.updateBalance(fromUserId, -transferAmount, session);

      // Credit to recipient (atomic)
      await User.updateBalance(toUserId, transferAmount, session);

      // Record transaction
      const transaction = new Transaction({
        fromUserId,
        toUserId,
        amount: transferAmount,
        status: 'SUCCESS',
        description,
      });
      await transaction.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Get updated users
      const updatedFromUser = await User.findById(fromUserId);
      const updatedToUser = await User.findById(toUserId);

      return {
        transactionId: transaction._id,
        from: {
          id: updatedFromUser._id,
          name: updatedFromUser.name,
          balance: updatedFromUser.balance,
        },
        to: {
          id: updatedToUser._id,
          name: updatedToUser.name,
          balance: updatedToUser.balance,
        },
        amount: transferAmount,
        timestamp: transaction.createdAt,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Transfer using atomic operations (fallback for testing without replica set)
   * @private
   */
  async _transferWithAtomicOps(fromUserId, toUserId, transferAmount, description) {
    try {
      // Verify both users exist
      const fromUser = await User.findById(fromUserId);
      const toUser = await User.findById(toUserId);

      if (!fromUser) {
        throw new Error('Sender user not found');
      }
      if (!toUser) {
        throw new Error('Recipient user not found');
      }

      // Check sufficient balance
      if (fromUser.balance < transferAmount) {
        throw new Error('Insufficient balance');
      }

      // Debit from sender (atomic with balance check)
      await User.updateBalance(fromUserId, -transferAmount, null);

      // Credit to recipient (atomic)
      await User.updateBalance(toUserId, transferAmount, null);

      // Record transaction
      const transaction = new Transaction({
        fromUserId,
        toUserId,
        amount: transferAmount,
        status: 'SUCCESS',
        description,
      });
      await transaction.save();

      // Get updated users
      const updatedFromUser = await User.findById(fromUserId);
      const updatedToUser = await User.findById(toUserId);

      return {
        transactionId: transaction._id,
        from: {
          id: updatedFromUser._id,
          name: updatedFromUser.name,
          balance: updatedFromUser.balance,
        },
        to: {
          id: updatedToUser._id,
          name: updatedToUser.name,
          balance: updatedToUser.balance,
        },
        amount: transferAmount,
        timestamp: transaction.createdAt,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId, limit = 10) {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid user ID format');
      }

      const transactions = await Transaction.find({
        $or: [{ fromUserId: userId }, { toUserId: userId }],
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('fromUserId', 'name email')
        .populate('toUserId', 'name email');

      return transactions.map((t) => ({
        id: t._id,
        from: {
          id: t.fromUserId._id,
          name: t.fromUserId.name,
          email: t.fromUserId.email,
        },
        to: {
          id: t.toUserId._id,
          name: t.toUserId.name,
          email: t.toUserId.email,
        },
        amount: t.amount,
        status: t.status,
        description: t.description,
        timestamp: t.createdAt,
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all users (for testing/admin purposes)
   */
  async getAllUsers() {
    try {
      const users = await User.find().select('-__v');
      return users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        createdAt: user.createdAt,
      }));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new WalletService();
