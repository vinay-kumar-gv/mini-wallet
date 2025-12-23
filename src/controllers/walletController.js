const walletService = require('../services/walletService');


/**
 * Create a new user account
 * POST /api/accounts
 */
exports.createAccount = async (req, res) => {
  try {
    const { name, email, initialBalance } = req.body;


    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required',
      });
    }

    const account = await walletService.createAccount(name, email, initialBalance);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account,
    });
  } catch (error) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create account',
      error: error.message,
    });
  }
};

/**
 * Get user balance
 * GET /api/balance/{userId}
 */
exports.getBalance = async (req, res) => {
  try {
    const { userId } = req.params;

    const balance = await walletService.getBalance(userId);

    res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve balance',
      error: error.message,
    });
  }
};

/**
 * Transfer money between users
 * POST /api/transfer
 */
exports.transferMoney = async (req, res) => {
  try {
    const { from_user_id, to_user_id, amount, description } = req.body;


    if (!from_user_id || !to_user_id || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'from_user_id, to_user_id, and amount are required',
      });
    }


    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number',
      });
    }

    const result = await walletService.transferMoney(
      from_user_id,
      to_user_id,
      transferAmount,
      description
    );

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: result,
    });
  } catch (error) {

    if (error.message.includes('Insufficient balance')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.includes('Cannot transfer money to yourself')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Transfer failed',
      error: error.message,
    });
  }
};

/**
 * Get transaction history for a user
 * GET /api/transactions/:userId
 */
exports.getTransactionHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const transactions = await walletService.getTransactionHistory(userId, limit);

    res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    if (error.message.includes('Invalid')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction history',
      error: error.message,
    });
  }
};

/**
 * Get all users
 * GET /api/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await walletService.getAllUsers();

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message,
    });
  }
};

