// Test script for updateMe API
const axios = require('axios');

const testData = {
    full_name: "Test User",
    phone: "+8801700000000",
    short_bio: "Professional DJ and Music Producer",
    socialProfiles: [
        {
            orderId: 1,
            platformName: "Instagram",
            platformLink: "https://instagram.com/testuser"
        },
        {
            orderId: 2,
            platformName: "Facebook",
            platformLink: "https://facebook.com/testuser"
        }
    ]
};

async function testUpdateMe() {
    try {
        const response = await axios.patch('http://localhost:3000/users/me/json', testData, {
            headers: {
                'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Success:', response.data);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// testUpdateMe();