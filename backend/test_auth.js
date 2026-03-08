import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/auth';

async function testAuth() {
    console.log('--- Starting Auth Verification ---');

    const testUser = {
        fullName: 'Test User',
        username: 'testuser_' + Date.now(),
        email: `test_${Date.now()}@example.com`,
        password: 'Password123'
    };

    try {
        // 1. Test Signup
        console.log(`\n1. Testing Signup for: ${testUser.email}`);
        const signupRes = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });

        const signupData = await signupRes.json();
        if (signupRes.ok) {
            console.log('✅ Signup Successful');
        } else {
            console.log('❌ Signup Failed:', signupData.error || signupData.message);
            return;
        }

        // 2. Test Login
        console.log(`\n2. Testing Login with: ${testUser.email.toUpperCase()} (Testing Normalization)`);
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testUser.email.toUpperCase(), // Test case insensitivity
                password: testUser.password
            })
        });

        const loginData = await loginRes.json();
        if (loginRes.ok) {
            console.log('✅ Login Successful (Normalization confirmed)');
        } else {
            console.log('❌ Login Failed:', loginData.error || loginData.message);
        }

        // 3. Test Validation (Weak Password)
        console.log('\n3. Testing Weak Password Validation');
        const weakRes = await fetch(`${API_URL}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...testUser, email: 'weak@test.com', password: '123' })
        });
        const weakData = await weakRes.json();
        console.log(weakRes.status === 400 ? '✅ Correctly rejected weak password' : '❌ Failed to reject weak password');

    } catch (error) {
        console.error('❌ Test script error:', error.message);
    }
}

testAuth();
