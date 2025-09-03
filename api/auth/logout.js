const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get session from cookie
    const cookies = req.headers.cookie || '';
    const sessionMatch = cookies.match(/session=([^;]+)/);
    
    if (sessionMatch && sessionMatch[1]) {
      const sessionId = sessionMatch[1];
      
      // Revoke session in database
      await pool.query(
        'DELETE FROM sessions WHERE id = $1',
        [sessionId]
      );
    }
    
    // Clear cookie
    res.setHeader('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0');
    
    return res.status(200).json({
      message: 'Logout successful.'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};