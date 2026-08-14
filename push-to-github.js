/**
 * HIGGSFIELD AI — GITHUB HELPER
 * Utility script for syncing project changes to GitHub
 */

const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const url = 'https://github.com/LordGrimsun/AIVideo.git';

async function syncRepo(token) {
  if (!token) {
    console.log("Usage: node push-to-github.js <GITHUB_TOKEN>");
    return;
  }

  try {
    console.log("Pushing updates to GitHub...");
    await git.push({
      fs,
      http,
      dir,
      remote: 'origin',
      ref: 'main',
      force: true,
      onAuth: () => ({ username: token, password: '' })
    });
    console.log("✓ Successfully synchronized with GitHub!");
  } catch (err) {
    console.error("Push Error:", err);
  }
}

if (process.argv[2]) {
  syncRepo(process.argv[2]);
}
