const { spawn } = require('child_process');

console.log('Starting ts-node...');

const child = spawn('powershell', ['-Command', 'npx ts-node src/app.ts'], {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe']
});

child.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

child.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

child.on('close', (code) => {
  console.log(`Child process exited with code ${code}`);
});

child.on('error', (error) => {
  console.log('ERROR:', error);
});