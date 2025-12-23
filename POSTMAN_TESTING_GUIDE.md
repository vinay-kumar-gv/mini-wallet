# Mini-Wallet API - Postman Testing Guide

Complete step-by-step guide to test all API endpoints using Postman.

---

## 📥 Step 1: Setup

### 1.1 Install Postman
- Download from: https://www.postman.com/downloads/
- Or use Postman Web: https://web.postman.com/

### 1.2 Start the Server
```bash
cd C:\Users\vinu6\IdeaProjects\mini-wallet
npm start
```

**Expected Output:**
```
╔═══════════════════════════════════════════╗
║     Mini-Wallet API Server Started       ║
╠═══════════════════════════════════════════╣
║  Port: 3000                              ║
║  Environment: development                ║
║  MongoDB: Connected                       ║
╚═══════════════════════════════════════════╝
```

**Server URL:** `http://localhost:3000`

---

## 🧪 Step 2: Test Each Endpoint

### Test 1: Health Check ✅

**Purpose:** Verify server is running

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:3000/`
- **Headers:** None needed

**Steps in Postman:**
1. Click **"New"** → **"HTTP Request"**
2. Set method to **GET**
3. Enter URL: `http://localhost:3000/`
4. Click **"Send"**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Mini-Wallet API is running",
  "version": "1.0.0",
  "endpoints": {
    "createAccount": "POST /api/accounts",
    "getBalance": "GET /api/balance/:userId",
    "transfer": "POST /api/transfer",
    "transactions": "GET /api/transactions/:userId",
    "users": "GET /api/users"
  }
}
```

✅ **Success Criteria:** Status 200, "success": true

---

### Test 2: Create Account (Alice) 💰

**Purpose:** Create first user account with initial balance

**Request:**
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/accounts`
- **Headers:** 
  - `Content-Type: application/json`
- **Body (raw JSON):**

```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "initialBalance": 100
}
```

**Steps in Postman:**
1. Click **"New"** → **"HTTP Request"**
2. Set method to **POST**
3. Enter URL: `http://localhost:3000/api/accounts`
4. Click **"Headers"** tab
   - Add: Key = `Content-Type`, Value = `application/json`
5. Click **"Body"** tab
   - Select **"raw"**
   - Select **"JSON"** from dropdown
   - Paste the JSON above
6. Click **"Send"**

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "676823abc123def456789012",
    "name": "Alice",
    "email": "alice@example.com",
    "balance": 100,
    "createdAt": "2025-12-22T10:30:00.000Z"
  }
}
```

✅ **Success Criteria:** Status 201, balance = 100

⚠️ **IMPORTANT:** Copy and save Alice's `id` for later tests!

**Save Alice's ID:**
```
ALICE_ID = 676823abc123def456789012
```

---

### Test 3: Create Account (Bob) 💰

**Purpose:** Create second user account

**Request:**
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/accounts`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "name": "Bob",
  "email": "bob@example.com",
  "initialBalance": 50
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "676823def456ghi789012345",
    "name": "Bob",
    "email": "bob@example.com",
    "balance": 50,
    "createdAt": "2025-12-22T10:31:00.000Z"
  }
}
```

✅ **Success Criteria:** Status 201, balance = 50

⚠️ **IMPORTANT:** Copy and save Bob's `id` for later tests!

**Save Bob's ID:**
```
BOB_ID = 676823def456ghi789012345
```

---

### Test 4: Get Alice's Balance 💵

**Purpose:** Retrieve current balance for Alice

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:3000/api/balance/{{ALICE_ID}}`
  - Replace `{{ALICE_ID}}` with Alice's actual ID from Test 2
  - Example: `http://localhost:3000/api/balance/676823abc123def456789012`

**Steps:**
1. New GET request
2. URL: `http://localhost:3000/api/balance/676823abc123def456789012`
3. Click **"Send"**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "676823abc123def456789012",
    "name": "Alice",
    "email": "alice@example.com",
    "balance": 100
  }
}
```

✅ **Success Criteria:** Status 200, balance = 100

---

### Test 5: Get Bob's Balance 💵

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:3000/api/balance/{{BOB_ID}}`
  - Example: `http://localhost:3000/api/balance/676823def456ghi789012345`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "676823def456ghi789012345",
    "name": "Bob",
    "email": "bob@example.com",
    "balance": 50
  }
}
```

✅ **Success Criteria:** Status 200, balance = 50

---

### Test 6: Transfer Money (Alice → Bob) 💸 [CRITICAL TEST]

**Purpose:** Transfer $30 from Alice to Bob and verify atomicity

**Request:**
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/transfer`
- **Headers:** `Content-Type: application/json`
- **Body:**

```json
{
  "from_user_id": "676823abc123def456789012",
  "to_user_id": "676823def456ghi789012345",
  "amount": 30,
  "description": "Payment for lunch"
}
```

⚠️ **Replace with your actual IDs from Tests 2 and 3!**

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": {
    "transactionId": "676824xyz987abc654321000",
    "from": {
      "id": "676823abc123def456789012",
      "name": "Alice",
      "balance": 70
    },
    "to": {
      "id": "676823def456ghi789012345",
      "name": "Bob",
      "balance": 80
    },
    "amount": 30,
    "timestamp": "2025-12-22T10:35:00.000Z"
  }
}
```

✅ **Success Criteria:** 
- Status 200
- Alice's balance: 100 - 30 = **70** ✅
- Bob's balance: 50 + 30 = **80** ✅
- Transaction recorded

---

### Test 7: Verify Alice's Updated Balance ✔️

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:3000/api/balance/{{ALICE_ID}}`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "676823abc123def456789012",
    "name": "Alice",
    "email": "alice@example.com",
    "balance": 70
  }
}
```

✅ **Success Criteria:** Balance = 70 (was 100, sent 30)

---

### Test 8: Verify Bob's Updated Balance ✔️

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:3000/api/balance/{{BOB_ID}}`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "676823def456ghi789012345",
    "name": "Bob",
    "email": "bob@example.com",
    "balance": 80
  }
}
```

✅ **Success Criteria:** Balance = 80 (was 50, received 30)

---

### Test 9: Get Transaction History 📜

**Purpose:** View all transactions for a user

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:3000/api/transactions/{{ALICE_ID}}`
  - Optional query parameter: `?limit=10`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "676824xyz987abc654321000",
      "from": {
        "id": "676823abc123def456789012",
        "name": "Alice",
        "email": "alice@example.com"
      },
      "to": {
        "id": "676823def456ghi789012345",
        "name": "Bob",
        "email": "bob@example.com"
      },
      "amount": 30,
      "status": "SUCCESS",
      "description": "Payment for lunch",
      "timestamp": "2025-12-22T10:35:00.000Z"
    }
  ]
}
```

✅ **Success Criteria:** At least 1 transaction shown

---

### Test 10: Get All Users 👥

**Purpose:** List all registered users

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:3000/api/users`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "676823abc123def456789012",
      "name": "Alice",
      "email": "alice@example.com",
      "balance": 70,
      "createdAt": "2025-12-22T10:30:00.000Z"
    },
    {
      "id": "676823def456ghi789012345",
      "name": "Bob",
      "email": "bob@example.com",
      "balance": 80,
      "createdAt": "2025-12-22T10:31:00.000Z"
    }
  ]
}
```

✅ **Success Criteria:** Both Alice and Bob listed with updated balances

---

## 🚨 Error Scenario Tests

### Test 11: Insufficient Balance ❌

**Purpose:** Try to transfer more money than available

**Request:**
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/transfer`
- **Body:**

```json
{
  "from_user_id": "{{ALICE_ID}}",
  "to_user_id": "{{BOB_ID}}",
  "amount": 1000,
  "description": "This should fail"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Insufficient balance"
}
```

✅ **Success Criteria:** Status 400, error message shown

---

### Test 12: Self-Transfer ❌

**Purpose:** Try to transfer money to yourself (should be blocked)

**Request:**
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/transfer`
- **Body:**

```json
{
  "from_user_id": "{{ALICE_ID}}",
  "to_user_id": "{{ALICE_ID}}",
  "amount": 10
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Cannot transfer money to yourself"
}
```

✅ **Success Criteria:** Status 400, self-transfer blocked

---

### Test 13: Invalid User ID ❌

**Purpose:** Try to get balance for non-existent user

**Request:**
- **Method:** `GET`
- **URL:** `http://localhost:3000/api/balance/000000000000000000000000`

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found"
}
```

✅ **Success Criteria:** Status 404

---

### Test 14: Duplicate Email ❌

**Purpose:** Try to create account with existing email

**Request:**
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/accounts`
- **Body:**

```json
{
  "name": "Alice Clone",
  "email": "alice@example.com",
  "initialBalance": 50
}
```

**Expected Response (409 Conflict):**
```json
{
  "success": false,
  "message": "User with this email already exists"
}
```

✅ **Success Criteria:** Status 409, duplicate prevented

---

### Test 15: Invalid Amount ❌

**Purpose:** Try to transfer negative or zero amount

**Request:**
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/transfer`
- **Body:**

```json
{
  "from_user_id": "{{ALICE_ID}}",
  "to_user_id": "{{BOB_ID}}",
  "amount": -10
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Amount must be a positive number"
}
```

✅ **Success Criteria:** Status 400

---

### Test 16: Missing Required Fields ❌

**Purpose:** Try to create account without email

**Request:**
- **Method:** `POST`
- **URL:** `http://localhost:3000/api/accounts`
- **Body:**

```json
{
  "name": "Charlie"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Name and email are required"
}
```

