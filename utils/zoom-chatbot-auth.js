import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Get chatbot access token using Server-to-Server OAuth
 * @returns {Promise<string>} Access token
 */
export async function getChatbotToken() {
  try {
    if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
      throw new Error('Missing required environment variables: ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET');
    }

    const credentials = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64');

    const response = await axios.post(
      'https://zoom.us/oauth/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    console.log('Successfully received chatbot_token from Zoom.');
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting chatbot_token from Zoom:', error.response?.data || error.message);
    throw new Error(`Failed to get Zoom chatbot token: ${error.response?.data?.error || error.message}`);
  }
}