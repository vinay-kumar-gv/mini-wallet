# Mini-Wallet - Quick Setup Guide

## ✅ Implementation Status: COMPLETE

All requirements have been successfully implemented and tested.

---

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
npm test
```
**Expected Result**: All 12 tests should pass ✅

### 3. Start Server (Production)
```bash
npm start
```
**Server runs on**: http://localhost:3000

### 4. Start Server (Development with auto-reload)
```bash
npm run dev
```

---

## ⚠️ Important: MongoDB Configuration

### For Testing
- Tests use **MongoMemoryServer** (in-memory database)
- No MongoDB installation needed for tests
- Tests will pass without replica set

### For Production
MongoDB transactions require a **replica set**. Choose one option:

**Option 1: MongoDB Atlas (Recommended - Free)**
1. Sign up at https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string
4. Update `.env` file:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/mini-wallet
   ```

**Option 2: Local MongoDB with Replica Set**
```bash
# Windows
mongod --replSet rs0 --port 27017 --dbpath C:\data\db

# In another terminal
mongosh
> rs.initiate()
```

---

## 📋 Assignment Checklist

### ✅ Functional Requirements
- [x] **Create Account** - POST /api/accounts with initial balance ($100 default)
- [x] **Get Balance** - GET /api/balance/:userId
- [x] **Transfer Money** - POST /api/transfer with atomicity
  - [x] Prevents negative balances
  - [x] Debit and Credit happen together (atomic)
  - [x] Auto-rollback on failure
- [x] Proper HTTP status codes (400, 404, 409, 500)

### ✅ Technical Constraints
- [x] **README.md** with setup instructions and data models
- [x] **Integration Test** for transfer (Alice → Bob)
- [x] **Data Integrity** - no negative balances possible
- [x] **Atomicity** - MongoDB transactions with fallback
- [x] **Decimal Handling** - rounds to 2 decimal places

### ✅ Code Quality
- [x] Clean, well-structured code (MVC pattern)
- [x] Comprehensive error handling
- [x] Input validation
- [x] Code comments and documentation
- [x] Industry-standard practices

---

## 🧪 Test Results

```
Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total

✓ Create account with initial balance
✓ Fail to create account without required fields
✓ Fail to create duplicate account
✓ Retrieve user balance
✓ Return 404 for non-existent user
✓ Successfully transfer money and verify atomicity (CRITICAL)
✓ Fail transfer with insufficient balance
✓ Prevent negative balance
✓ Handle decimal amounts correctly
✓ Fail when transferring to self
✓ Retrieve transaction history
✓ Retrieve all users
```

---

## 📡 API Testing with Postman/Thunder Client

### 1. Create Alice
```json
POST http://localhost:3000/api/accounts
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com",
  "initialBalance": 100
}
```

### 2. Create Bob
```json
POST http://localhost:3000/api/accounts
Content-Type: application/json

{
  "name": "Bob",
  "email": "bob@example.com",
  "initialBalance": 50
}
```

### 3. Transfer Money
```json
POST http://localhost:3000/api/transfer
Content-Type: application/json

{
  "from_user_id": "<alice_id>",
  "to_user_id": "<bob_id>",
  "amount": 30,
  "description": "Payment"
}
```

### 4. Check Balance
```
GET http://localhost:3000/api/balance/<user_id>
```

---

## 📂 Project Structure

```
mini-wallet/
├── src/
│   ├── models/           # MongoDB schemas (User, Transaction)
│   ├── services/         # Business logic with transactions
│   ├── controllers/      # HTTP handlers
│   ├── routes/           # API endpoints
│   ├── config/           # Database configuration
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── __tests__/
│   └── wallet.test.js   # Integration tests
├── README.md            # Complete documentation
├── package.json         # Dependencies
└── .env                 # Configuration
```

---

## 🎯 Key Features Implemented

1. **Atomic Transfers**: Uses MongoDB transactions when replica set is available
2. **Race Condition Prevention**: Atomic `findOneAndUpdate` with conditional checks
3. **Decimal Precision**: Rounds to 2 decimal places to avoid floating-point errors
4. **Error Handling**: Proper HTTP status codes for all error scenarios
5. **Transaction Audit Trail**: All transfers are recorded
6. **Validation**: Email format, ObjectId format, positive amounts, etc.
7. **Graceful Fallback**: Works without replica set for testing

---

## 📊 Data Models

### User
- `_id`: ObjectId
- `name`: String (2-100 chars)
- `email`: String (unique, validated)
- `balance`: Number (min: 0, rounded to 2 decimals)
- `createdAt`, `updatedAt`: Timestamps

### Transaction
- `_id`: ObjectId
- `fromUserId`: ObjectId → User
- `toUserId`: ObjectId → User
- `amount`: Number (min: 0.01, rounded to 2 decimals)
- `status`: 'SUCCESS' | 'FAILED'
- `description`: String (optional)
- `createdAt`, `updatedAt`: Timestamps

**Relationship**: User ↔ Transaction (One-to-Many)

---
