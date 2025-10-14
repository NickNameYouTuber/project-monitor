const axios = require('axios');

const API_BASE_URL = 'https://your-nigit-instance.com/api';
const API_KEY = 'ipk_your_api_key_here';
const API_SECRET = 'ips_your_api_secret_here';

async function authenticateUser(email, password) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/identity-provider/authenticate`,
      {
        email: email,
        password: password
      },
      {
        headers: {
          'X-API-Key': API_KEY,
          'X-API-Secret': API_SECRET,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      console.log('Authentication successful');
      console.log('User info:', response.data.user);
      return response.data.user;
    } else {
      console.error('Authentication failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('Error during authentication:', error.message);
    return null;
  }
}

async function handleWebhook(req, res) {
  const payload = req.body;
  
  if (payload.event === 'password_changed') {
    console.log(`Password changed for user: ${payload.email}`);
    console.log(`Organization: ${payload.organization_id}`);
    console.log(`Timestamp: ${new Date(payload.timestamp).toISOString()}`);
    
    res.status(200).json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Unknown event' });
  }
}

module.exports = {
  authenticateUser,
  handleWebhook
};

