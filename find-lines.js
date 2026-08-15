const fs = require('fs');
const content = fs.readFileSync('index.html', 'utf-8');
const lines = content.split('\n');
console.log('Total lines:', lines.length);

lines.forEach((line, idx) => {
  if (line.includes('id="studio"') || line.includes('id=\'studio\'')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
  if (line.includes('<canvas id="studio-viewport-canvas"')) {
    console.log(`Canvas at Line ${idx + 1}`);
  }
  if (line.includes('studio-generate-btn')) {
    console.log(`Generate button at Line ${idx + 1}`);
  }
});
