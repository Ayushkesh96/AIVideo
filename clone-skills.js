const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'skills', 'supabase');

async function cloneSkills() {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    console.log("Cloning https://github.com/supabase/agent-skills.git via isomorphic-git...");
    await git.clone({
      fs,
      http,
      dir,
      url: 'https://github.com/supabase/agent-skills.git',
      singleBranch: true,
      depth: 1
    });
    console.log("✓ Successfully cloned Supabase agent skills into skills/supabase!");
  } catch (e) {
    console.error("Clone error:", e);
  }
}

cloneSkills();
