const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

// Generate self-signed certificate
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, {
  days: 365,
  keySize: 2048,
  algorithm: 'sha256'
});

// Create ssl directory if it doesn't exist
const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir);
}

// Write certificate and key to files
fs.writeFileSync(path.join(sslDir, 'server.cert'), pems.cert);
fs.writeFileSync(path.join(sslDir, 'server.key'), pems.private);

console.log('✅ SSL certificates generated successfully!');
console.log('📁 Location: ./ssl/');
console.log('   - server.cert');
console.log('   - server.key');