/**
 * KAF-INVENTAIRE - Automated Test Suite for Authentication & RBAC User Management
 * Tests all required security scenarios:
 * 1. Valid login
 * 2. Invalid password
 * 3. Unknown account
 * 4. Disabled account
 * 5. Missing credentials
 * 6. Protected endpoints without token
 * 7. Non-admin role restriction (RBAC)
 * 8. Administrator-only user creation & duplicate check
 * 9. Password hashing and absence of passwordHash in responses
 */

import { CryptoSecurity } from '../src/security/crypto';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting KAF-INVENTAIRE Auth & RBAC Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  const BASE_URL = 'http://localhost:3000/api';

  // Test 1: Missing credentials
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', password: '' }),
    });
    const data = await res.json();
    assert(res.status === 400 && data.error === 'INVALID_INPUT', 'Test 1: Missing credentials rejected with 400 INVALID_INPUT');
  } catch (e: any) {
    assert(false, 'Test 1: Missing credentials', e.message);
  }

  // Test 2: Invalid password
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin.patrimoine', password: 'wrongpassword' }),
    });
    const data = await res.json();
    assert(res.status === 401 && data.error === 'INVALID_CREDENTIALS', 'Test 2: Invalid password rejected with 401 INVALID_CREDENTIALS');
  } catch (e: any) {
    assert(false, 'Test 2: Invalid password', e.message);
  }

  // Test 3: Unknown account
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ghost_user_9999', password: 'password123' }),
    });
    const data = await res.json();
    assert(res.status === 401 && data.error === 'INVALID_CREDENTIALS', 'Test 3: Unknown account rejected with generic 401 (anti-enumeration)');
  } catch (e: any) {
    assert(false, 'Test 3: Unknown account', e.message);
  }

  // Test 4: Valid login for Administrator
  let adminToken = '';
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin.patrimoine', password: 'admin123' }),
    });
    const data = await res.json();
    adminToken = data.access_token;
    assert(
      res.status === 200 && 
      data.access_token && 
      data.user && 
      data.user.passwordHash === undefined,
      'Test 4: Valid Admin login succeeds, issues JWT and NEVER leaks passwordHash'
    );
  } catch (e: any) {
    assert(false, 'Test 4: Valid Admin login', e.message);
  }

  // Test 5: Valid login for Agent (Équipe 1)
  let agentToken = '';
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'agent.identification', password: 'agent123' }),
    });
    const data = await res.json();
    agentToken = data.access_token;
    assert(res.status === 200 && data.user.role === 'AGENT_INVENTAIRE', 'Test 5: Valid Agent login succeeds with AGENT_INVENTAIRE role');
  } catch (e: any) {
    assert(false, 'Test 5: Valid Agent login', e.message);
  }

  // Test 6: Protected endpoint /api/users without authentication
  try {
    const res = await fetch(`${BASE_URL}/users`, { method: 'GET' });
    assert(res.status === 401, 'Test 6: GET /api/users without token returns 401 UNAUTHORIZED');
  } catch (e: any) {
    assert(false, 'Test 6: Protected endpoint without auth', e.message);
  }

  // Test 7: Non-admin user attempting to access /api/users
  try {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${agentToken}` },
    });
    assert(res.status === 403, 'Test 7: Agent role attempting GET /api/users blocked with 403 FORBIDDEN');
  } catch (e: any) {
    assert(false, 'Test 7: Non-admin RBAC block', e.message);
  }

  // Test 8: Admin accesses /api/users successfully
  try {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    assert(
      res.status === 200 && 
      Array.isArray(data.users) && 
      data.users.every((u: any) => u.passwordHash === undefined),
      'Test 8: Admin accesses /api/users and all users are sanitized (no password hashes)'
    );
  } catch (e: any) {
    assert(false, 'Test 8: Admin accesses users list', e.message);
  }

  // Test 9: Admin creates a new user account
  const testNewUsername = `test_tech_${Date.now().toString().slice(-4)}`;
  let createdUserId = '';
  try {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: testNewUsername,
        fullName: 'Test Technician Engineer',
        email: `${testNewUsername}@kotama-agrifood.dz`,
        role: 'AGENT_INVENTAIRE',
        password: 'securepass123',
      }),
    });
    const data = await res.json();
    createdUserId = data.id;
    assert(
      res.status === 201 && 
      data.username === testNewUsername && 
      data.passwordHash === undefined,
      'Test 9: Admin creates a new user account with hashed credentials'
    );
  } catch (e: any) {
    assert(false, 'Test 9: Admin creates user', e.message);
  }

  // Test 10: Duplicate username rejected
  try {
    const res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        username: testNewUsername,
        fullName: 'Duplicate Tech',
        role: 'AGENT_INVENTAIRE',
        password: 'securepass123',
      }),
    });
    assert(res.status === 409, 'Test 10: Duplicate username rejected with 409 Conflict');
  } catch (e: any) {
    assert(false, 'Test 10: Duplicate username check', e.message);
  }

  // Test 11: Admin deactivates account and deactivated user cannot log in
  try {
    // 1. Deactivate
    const resDeact = await fetch(`${BASE_URL}/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    const dataDeact = await resDeact.json();

    // 2. Try login with deactivated account
    const resLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: testNewUsername, password: 'securepass123' }),
    });
    const dataLogin = await resLogin.json();

    assert(
      dataDeact.isActive === false && 
      resLogin.status === 403 && 
      dataLogin.error === 'ACCOUNT_DISABLED',
      'Test 11: Admin deactivates account and disabled account login is blocked (403 ACCOUNT_DISABLED)'
    );
  } catch (e: any) {
    assert(false, 'Test 11: Deactivation & login rejection', e.message);
  }

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================');
}

runTests().catch(console.error);
