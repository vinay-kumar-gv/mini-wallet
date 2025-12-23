const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');


// Create a new account
router.post('/accounts', walletController.createAccount);

// Get balance for a specific user
router.get('/balance/:userId', walletController.getBalance);

// Transfer money between users
router.post('/transfer', walletController.transferMoney);

// Get transaction history for a user
router.get('/transactions/:userId', walletController.getTransactionHistory);

// Get all users (for testing/admin)
router.get('/users', walletController.getAllUsers);

module.exports = router;

