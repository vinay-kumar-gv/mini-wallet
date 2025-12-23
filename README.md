# Mini-Wallet Service

A simple internal wallet system where users can create accounts, check balances, and transfer money securely.

**Tech Stack:** Node.js (Express) + MongoDB

---

## Setup & Installation

### Prerequisites
- Node.js (v14+)
- MongoDB (local or MongoDB Atlas)

### Installation Steps

```bash
# 1. Install dependencies
npm install

# 2. Create .env file in root directory
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/mini_wallet
INITIAL_BALANCE=100

# 3. Start MongoDB (if running locally)
mongod

# 4. Start the server
npm start

# Development mode (with auto-reload)
npm run dev
```

Server will run at: `http://localhost:3000`

---

## Data Models & Relationships

### User Model
```javascript
{
  _id: ObjectId,              // Primary Key
  name: String,               // Required
  email: String,              // Required, Unique
  balance: Number,            // Default: 100, Min: 0
  createdAt: Date,
  updatedAt: Date
}
```

### Transaction Model
```javascript
{
  _id: ObjectId,              // Primary Key
  fromUserId: ObjectId,       // Foreign Key → User._id
  toUserId: ObjectId,         // Foreign Key → User._id
  amount: Number,             // Must be positive
  status: String,             // 'SUCCESS' | 'FAILED' | 'PENDING'
  description: String,        // Optional
  createdAt: Date
}
```

### Relationships
```
User (1) ←──── (Many) Transaction (fromUserId)
User (1) ←──── (Many) Transaction (toUserId)

One user can have many transactions (as sender or receiver)
```

---

## API Endpoints

**Base URL:** `http://localhost:3000/api`

### 1. Create Account
```http
POST /api/accounts
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com",
  "initialBalance": 100
}
```

### 2. Get Balance
```http
GET /api/balance/:userId
```

### 3. Transfer Money
```http
POST /api/transfer
Content-Type: application/json

{
  "from_user_id": "676a1234567890abcdef1234",
  "to_user_id": "676a1234567890abcdef5678",
  "amount": 50
}
```

### 4. Get Transaction History
```http
GET /api/transactions/:userId
```

### 5. Get All Users
```http
GET /api/users
```

---

## Testing

### Run Tests
```bash
npm test
```

### Integration Test Example
**Test Case:** Alice sends $50 to Bob, verify balances update correctly

```javascript
test('Transfer: Alice sends 50 to Bob', async () => {
  // Create Alice with $100
  const alice = await request(app)
    .post('/api/accounts')
    .send({ name: 'Alice', email: 'alice@test.com', initialBalance: 100 });

  // Create Bob with $100
  const bob = await request(app)
    .post('/api/accounts')
    .send({ name: 'Bob', email: 'bob@test.com', initialBalance: 100 });

  // Transfer $50 from Alice to Bob
  const transfer = await request(app)
    .post('/api/transfer')
    .send({
      from_user_id: alice.body.data.id,
      to_user_id: bob.body.data.id,
      amount: 50
    });

  // Verify transfer succeeded
  expect(transfer.status).toBe(200);
  expect(transfer.body.data.from.balance).toBe(50);   // Alice: 100 - 50
  expect(transfer.body.data.to.balance).toBe(150);    // Bob: 100 + 50
});
```

See `__tests__/wallet.test.js` for full test suite.

---

## Data Integrity

### How We Prevent Negative Balances

**1. Model Level Validation**
```javascript
balance: {
  type: Number,
  required: true,
  default: 100,
  min: 0  // Prevents negative values
}
```

**2. Service Level Check**
```javascript
if (fromUser.balance < transferAmount) {
  throw new Error('Insufficient balance');
}
```

**3. Atomic Operations**
```javascript
// Balance check + update happens atomically
await User.findOneAndUpdate(
  { _id: userId, balance: { $gte: amount } },  // Only update if balance sufficient
  { $inc: { balance: -amount } }
);
```

### Atomic Transfers (Debit + Credit Together)

**Problem:** Debit and Credit must happen together. If one fails, the other must not happen.

**Solution:** MongoDB Transactions

```javascript
const session = await mongoose.startSession();
await session.startTransaction();

try {
  // Debit from sender
  await User.updateBalance(fromUserId, -amount, session);
  
  // Credit to recipient
  await User.updateBalance(toUserId, amount, session);
  
  // Record transaction
  await transaction.save({ session });
  
  // Commit - all succeed together
  await session.commitTransaction();
} catch (error) {
  // Rollback - nothing happens if any step fails
  await session.abortTransaction();
  throw error;
}
```

**Fallback for Development:** Uses atomic `$inc` operations when MongoDB transactions are not available.

### Decimal Precision

All amounts are rounded to 2 decimal places to prevent floating-point errors:
```javascript
const transferAmount = Math.round(amount * 100) / 100;
```

---

## Project Structure

```
mini-wallet/
├── src/
│   ├── server.js              # Entry point
│   ├── app.js                 # Express config
│   ├── config/database.js     # MongoDB connection
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Transaction.js     # Transaction schema
│   ├── controllers/
│   │   └── walletController.js # Request handlers
│   ├── services/
│   │   └── walletService.js   # Business logic
│   └── routes/
│       └── walletRoutes.js    # API routes
├── __tests__/
│   └── wallet.test.js         # Integration tests
├── public/
│   └── index.html             # Frontend UI (optional)
├── .env                       # Environment variables
├── package.json
└── README.md
```

---

## Frontend (Optional)

Open `public/index.html` in your browser after starting the server.

**Features:**
- Create new accounts
- View balance
- Send money
- View transaction history

---

## Error Handling

All endpoints return clear HTTP status codes:

- **200 OK** - Success
- **201 Created** - Account created
- **400 Bad Request** - Invalid input or insufficient balance
- **404 Not Found** - User not found
- **409 Conflict** - Email already exists
- **500 Internal Server Error** - Server error

Example error response:
```json
{
  "success": false,
  "message": "Insufficient balance"
}
```

## Quick Start Commands

```bash
# Install
npm install

# Run
npm start

# Test
npm test

# Development mode
npm run dev
```

---

