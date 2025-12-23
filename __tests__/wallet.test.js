const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Transaction = require('../src/models/Transaction');

let mongoServer;


jest.setTimeout(30000);


beforeAll(async () => {
  try {

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();


    await mongoose.connect(mongoUri);
    console.log('Test database connected');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
});


afterEach(async () => {
  await User.deleteMany({});
  await Transaction.deleteMany({});
});


afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Mini-Wallet API Tests', () => {
  describe('POST /api/accounts - Create Account', () => {
    test('should create a new account with initial balance', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Alice',
          email: 'alice@example.com',
          initialBalance: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Alice');
      expect(response.body.data.email).toBe('alice@example.com');
      expect(response.body.data.balance).toBe(100);
    });

    test('should fail to create account without required fields', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Bob',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should fail to create duplicate account', async () => {
      await request(app).post('/api/accounts').send({
        name: 'Charlie',
        email: 'charlie@example.com',
        initialBalance: 100,
      });

      const response = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Charlie Duplicate',
          email: 'charlie@example.com',
          initialBalance: 50,
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/balance/:userId - Get Balance', () => {
    test('should retrieve user balance', async () => {
      const createResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'David',
          email: 'david@example.com',
          initialBalance: 150,
        });

      const userId = createResponse.body.data.id;

      const response = await request(app).get(`/api/balance/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBe(150);
    });

    test('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/balance/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/transfer - Transfer Money (CRITICAL TEST)', () => {
    test('should successfully transfer money between users and verify atomicity', async () => {
      // Create Alice with 100
      const aliceResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Alice',
          email: 'alice@test.com',
          initialBalance: 100,
        });
      const aliceId = aliceResponse.body.data.id;

      // Create Bob with 50
      const bobResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Bob',
          email: 'bob@test.com',
          initialBalance: 50,
        });
      const bobId = bobResponse.body.data.id;

      // Transfer 50 from Alice to Bob
      const transferResponse = await request(app)
        .post('/api/transfer')
        .send({
          from_user_id: aliceId,
          to_user_id: bobId,
          amount: 50,
          description: 'Test transfer',
        });

      expect(transferResponse.status).toBe(200);
      expect(transferResponse.body.success).toBe(true);
      expect(transferResponse.body.data.amount).toBe(50);

      // Verify Alice's balance is now 50
      const aliceBalanceResponse = await request(app).get(`/api/balance/${aliceId}`);
      expect(aliceBalanceResponse.body.data.balance).toBe(50);

      // Verify Bob's balance is now 100
      const bobBalanceResponse = await request(app).get(`/api/balance/${bobId}`);
      expect(bobBalanceResponse.body.data.balance).toBe(100);

      // Verify transaction was recorded
      const transactionsResponse = await request(app).get(`/api/transactions/${aliceId}`);
      expect(transactionsResponse.body.data.length).toBe(1);
      expect(transactionsResponse.body.data[0].amount).toBe(50);
    });

    test('should fail transfer with insufficient balance', async () => {
      const aliceResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Alice Poor',
          email: 'alice.poor@test.com',
          initialBalance: 30,
        });
      const aliceId = aliceResponse.body.data.id;

      const bobResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Bob Rich',
          email: 'bob.rich@test.com',
          initialBalance: 100,
        });
      const bobId = bobResponse.body.data.id;


      const transferResponse = await request(app)
        .post('/api/transfer')
        .send({
          from_user_id: aliceId,
          to_user_id: bobId,
          amount: 50,
        });

      expect(transferResponse.status).toBe(400);
      expect(transferResponse.body.success).toBe(false);
      expect(transferResponse.body.message).toContain('Insufficient balance');

      const aliceBalanceResponse = await request(app).get(`/api/balance/${aliceId}`);
      expect(aliceBalanceResponse.body.data.balance).toBe(30);

      const bobBalanceResponse = await request(app).get(`/api/balance/${bobId}`);
      expect(bobBalanceResponse.body.data.balance).toBe(100);
    });

    test('should prevent negative balance', async () => {
      const aliceResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Alice',
          email: 'alice.negative@test.com',
          initialBalance: 10,
        });
      const aliceId = aliceResponse.body.data.id;

      const bobResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Bob',
          email: 'bob.negative@test.com',
          initialBalance: 10,
        });
      const bobId = bobResponse.body.data.id;

      const transferResponse = await request(app)
        .post('/api/transfer')
        .send({
          from_user_id: aliceId,
          to_user_id: bobId,
          amount: 20,
        });

      expect(transferResponse.status).toBe(400);
      expect(transferResponse.body.success).toBe(false);
    });

    test('should handle decimal amounts correctly', async () => {
      const aliceResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Alice Decimal',
          email: 'alice.decimal@test.com',
          initialBalance: 100.55,
        });
      const aliceId = aliceResponse.body.data.id;

      const bobResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Bob Decimal',
          email: 'bob.decimal@test.com',
          initialBalance: 50.25,
        });
      const bobId = bobResponse.body.data.id;

      const transferResponse = await request(app)
        .post('/api/transfer')
        .send({
          from_user_id: aliceId,
          to_user_id: bobId,
          amount: 25.33,
        });

      expect(transferResponse.status).toBe(200);

      const aliceBalance = await request(app).get(`/api/balance/${aliceId}`);
      const bobBalance = await request(app).get(`/api/balance/${bobId}`);

      expect(aliceBalance.body.data.balance).toBe(75.22);
      expect(bobBalance.body.data.balance).toBe(75.58);
    });

    test('should fail when transferring to self', async () => {
      const aliceResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Alice Self',
          email: 'alice.self@test.com',
          initialBalance: 100,
        });
      const aliceId = aliceResponse.body.data.id;

      const transferResponse = await request(app)
        .post('/api/transfer')
        .send({
          from_user_id: aliceId,
          to_user_id: aliceId,
          amount: 10,
        });

      expect(transferResponse.status).toBe(400);
      expect(transferResponse.body.message).toContain('Cannot transfer money to yourself');
    });
  });

  describe('GET /api/transactions/:userId - Transaction History', () => {
    test('should retrieve transaction history', async () => {
      const aliceResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Alice',
          email: 'alice.history@test.com',
          initialBalance: 200,
        });
      const aliceId = aliceResponse.body.data.id;

      const bobResponse = await request(app)
        .post('/api/accounts')
        .send({
          name: 'Bob',
          email: 'bob.history@test.com',
          initialBalance: 100,
        });
      const bobId = bobResponse.body.data.id;

      // Make multiple transfers
      await request(app).post('/api/transfer').send({
        from_user_id: aliceId,
        to_user_id: bobId,
        amount: 30,
      });

      await request(app).post('/api/transfer').send({
        from_user_id: bobId,
        to_user_id: aliceId,
        amount: 20,
      });

      const historyResponse = await request(app).get(`/api/transactions/${aliceId}`);

      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data.length).toBe(2);
    });
  });

  describe('GET /api/users - Get All Users', () => {
    test('should retrieve all users', async () => {
      await request(app).post('/api/accounts').send({
        name: 'User1',
        email: 'user1@test.com',
        initialBalance: 100,
      });

      await request(app).post('/api/accounts').send({
        name: 'User2',
        email: 'user2@test.com',
        initialBalance: 150,
      });

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });
  });
});
