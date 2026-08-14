const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.join(__dirname, 'skills', 'supabase');

async function downloadSkills() {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const zipPath = path.join(__dirname, 'skills.zip');
  console.log("Downloading supabase/agent-skills repository zip...");

  const file = fs.createWriteStream(zipPath);
  https.get('https://codeload.github.com/supabase/agent-skills/zip/refs/heads/main', (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close(() => {
        console.log("Extracting skills zip...");
        try {
          execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${path.join(__dirname, 'skills')}' -Force"`);
          
          const extractedFolder = path.join(__dirname, 'skills', 'agent-skills-main');
          if (fs.existsSync(extractedFolder)) {
            // copy files to targetDir
            fs.cpSync(extractedFolder, targetDir, { recursive: true });
            fs.rmSync(extractedFolder, { recursive: true, force: true });
          }
          if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
          console.log("✓ Supabase agent skills successfully installed into skills/supabase!");
        } catch (err) {
          console.error("Extraction error:", err.message);
        }
      });
    });
  }).on('error', (err) => {
    console.error("Download error:", err);
  });
}

downloadSkills();
