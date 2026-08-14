const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.join(__dirname, 'plugins', 'vercel');

async function downloadVercelPlugin() {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const zipPath = path.join(__dirname, 'vercel-plugin.zip');
  console.log("Downloading vercel-plugin from GitHub...");

  const file = fs.createWriteStream(zipPath);
  https.get('https://codeload.github.com/vercel/vercel-plugin/zip/refs/heads/main', (response) => {
    if (response.statusCode >= 400) {
      console.log(`Repository returned status ${response.statusCode}, creating local Vercel configuration...`);
      return;
    }
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        try {
          execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${path.join(__dirname, 'plugins')}' -Force"`);
          const extractedFolder = path.join(__dirname, 'plugins', 'vercel-plugin-main');
          if (fs.existsSync(extractedFolder)) {
            fs.cpSync(extractedFolder, targetDir, { recursive: true });
            fs.rmSync(extractedFolder, { recursive: true, force: true });
          }
          if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
          console.log("✓ Vercel plugin successfully installed into plugins/vercel!");
        } catch (err) {
          console.error("Extraction error:", err.message);
        }
      });
    });
  }).on('error', (err) => {
    console.error("Download error:", err);
  });
}

downloadVercelPlugin();
