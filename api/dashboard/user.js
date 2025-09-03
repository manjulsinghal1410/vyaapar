const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get session from cookie
    const cookies = req.headers.cookie || '';
    const sessionMatch = cookies.match(/session=([^;]+)/);
    
    if (!sessionMatch || !sessionMatch[1]) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const sessionId = sessionMatch[1];
    
    // Get session and user
    const result = await pool.query(
      `SELECT u.id, u.phone_e164, u.created_at, u.last_login 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = $1 AND s.expires_at > NOW()`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }
    
    const user = result.rows[0];
    
    return res.status(200).json({
      id: user.id,
      phone: user.phone_e164,
      createdAt: user.created_at,
      lastLogin: user.last_login
    });
    
  } catch (error) {
    console.error('User fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};