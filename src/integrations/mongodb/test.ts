// Test MongoDB connection
import { connectToDatabase } from './client';
import { AuthService } from './auth';

async function testConnection() {
  try {
    console.log('Testing MongoDB connection...');
    
    // Test database connection
    const db = await connectToDatabase();
    console.log('✅ Database connected successfully');
    
    // Test authentication service
    const testUser = {
      email: 'test@example.com',
      password: 'testpassword123',
      name: 'Test User',
      role: 'user' as const
    };
    
    console.log('Testing user signup...');
    const signupResult = await AuthService.signup(testUser);
    
    if (signupResult.success) {
      console.log('✅ User signup successful');
      
      // Test login
      console.log('Testing user login...');
      const loginResult = await AuthService.login({
        email: testUser.email,
        password: testUser.password
      });
      
      if (loginResult.success) {
        console.log('✅ User login successful');
        console.log('🎉 All tests passed! MongoDB setup is working correctly.');
      } else {
        console.log('❌ User login failed:', loginResult.message);
      }
    } else {
      console.log('❌ User signup failed:', signupResult.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testConnection();
}

export { testConnection };
