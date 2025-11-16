
const jwt = require('jsonwebtoken')

console.log('start Admin Token:');
const JWT_SECRET = 'RRyyePWVgWAt9SDHu3J0hqwNPVA0dCfTc1f+PnHhaLg=';

const adminUser = {
  id: 3  // Admin user ID - role 會從資料庫查詢
};

// 產生一個 10 年有效期的 token（或設定為不過期）
const token = jwt.sign(adminUser, JWT_SECRET, { expiresIn: '10y' });

console.log('Admin Token:');
console.log(token);