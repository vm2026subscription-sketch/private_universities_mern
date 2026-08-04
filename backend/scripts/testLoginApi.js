const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');

dotenv.config({ path: path.join(__dirname, '../.env') });

process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'dev_jwt_access_secret_for_local_testing_only_32chars';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_for_local_testing_only_32chars';
process.env.JWT_MFA_SECRET = process.env.JWT_MFA_SECRET || 'dev_jwt_mfa_secret_for_local_testing_only_32chars';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_TLMeKLeYfGsDeh';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '*********';
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'VM_Subscription_2026@Webhook';

const connectDB = require('../src/config/db');
const app = require('../src/app');
const http = require('http');

const runTest = async () => {
  try {
    console.log('[Test Setup] Connecting to MongoDB...');
    await connectDB();
    console.log('[Test Setup] MongoDB connected.');
  } catch (err) {
    console.warn('[Test Setup] Database connection warning:', err.message);
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer(app);

    server.listen(0, '127.0.0.1', async () => {
      const port = server.address().port;
      console.log(`[Test Server] Listening on http://127.0.0.1:${port}`);

      try {
        // Test 1: Send valid JSON body with email & password
        const body1 = JSON.stringify({ email: 'nonexistent.user@example.com', password: 'TestPassword123!' });
        
        const req1 = http.request(
          `http://127.0.0.1:${port}/api/v1/auth/login`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body1),
            },
          },
          (res1) => {
            let data1 = '';
            res1.on('data', (chunk) => (data1 += chunk));
            res1.on('end', () => {
              console.log('\n--- Test 1 Result (Valid JSON Payload) ---');
              console.log('HTTP Status:', res1.statusCode);
              console.log('Response Body:', data1);

              // Test 2: Send URL-encoded body
              const body2 = 'email=nonexistent.user%40example.com&password=TestPassword123%21';
              const req2 = http.request(
                `http://127.0.0.1:${port}/api/v1/auth/login`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body2),
                  },
                },
                (res2) => {
                  let data2 = '';
                  res2.on('data', (chunk) => (data2 += chunk));
                  res2.on('end', () => {
                    console.log('\n--- Test 2 Result (URL-Encoded Payload) ---');
                    console.log('HTTP Status:', res2.statusCode);
                    console.log('Response Body:', data2);

                    // Test 3: Send empty body
                    const req3 = http.request(
                      `http://127.0.0.1:${port}/api/v1/auth/login`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Content-Length': 0,
                        },
                      },
                      (res3) => {
                        let data3 = '';
                        res3.on('data', (chunk) => (data3 += chunk));
                        res3.on('end', () => {
                          console.log('\n--- Test 3 Result (Empty Payload) ---');
                          console.log('HTTP Status:', res3.statusCode);
                          console.log('Response Body:', data3);

                          server.close(async () => {
                            await mongoose.disconnect();
                            resolve();
                          });
                        });
                      }
                    );
                    req3.end();
                  });
                }
              );
              req2.write(body2);
              req2.end();
            });
          }
        );

        req1.write(body1);
        req1.end();
      } catch (err) {
        server.close();
        reject(err);
      }
    });
  });
};

runTest()
  .then(() => console.log('\n[SUCCESS] All login API tests completed successfully.'))
  .catch((err) => console.error('[ERROR] Test failed:', err));
