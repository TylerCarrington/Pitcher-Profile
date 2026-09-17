const fs = require('fs');

const storageCode = fs.readFileSync('src/storage.ts', 'utf8');

// I will just read the file and I can do regex to find functions.
// But wait, the easiest way is just to leave storage.ts as a barrel file for now,
// or just do it inside Node.
