/**
 * Regenerates the inlined <style> and <script> blocks in index.html from the
 * styles/ and js/ sources.
 *
 * index.html ships as a single self-contained file, so every stylesheet and
 * module is concatenated inline. Hand-syncing the two copies is how the studio
 * bootstrap broke before, so this is the only supported way to update them.
 *
 *   node build-inline.js          rebuild index.html from styles/ and js/
 *   node build-inline.js --check  verify they match, non-zero exit if not
 */

const fs = require('fs');
const path = require('path');

// Load order matters: engines and stores must exist before the UI binds to them.
const MODULES = [
  'js/supabase.js',
  'js/ai-synth.js',
  'js/film-os.js',
  'js/audio-engine.js',
  'js/neural-engine.js',
  'js/showcase.js',
  'js/studio.js',
  'js/film-ui.js',
  'js/presets.js',
  'js/projects.js',
  'js/pricing.js',
  'js/app.js'
];

// Load order matters here too: main.css defines the custom properties the
// rest of the sheets consume.
const STYLESHEETS = [
  'styles/main.css',
  'styles/navbar.css',
  'styles/hero.css',
  'styles/film-os.css',
  'styles/studio.css',
  'styles/storyboard.css',
  'styles/compositor.css',
  'styles/director.css',
  'styles/presets.css',
  'styles/community.css',
  'styles/pricing.css'
];

const INDEX = path.join(__dirname, 'index.html');

// The capture is tolerant of whatever blank lines and indentation the file
// already has, but the replacement always normalizes them. Reusing the
// captured whitespace would make the output depend on the input's formatting,
// so rebuilding a file twice could produce two different results and --check
// would flap.
const BLOCKS = [
  { name: 'script', tag: 'script', sources: MODULES, re: /<script>\n+([\s\S]*?)\n+[ \t]*<\/script>/ },
  { name: 'style', tag: 'style', sources: STYLESHEETS, re: /<style>\n+([\s\S]*?)\n+[ \t]*<\/style>/ }
];

function concat(sources) {
  return sources
    .map(rel => {
      const body = fs.readFileSync(path.join(__dirname, rel), 'utf8').trim();
      return `/* --- ${rel} --- */\n${body}`;
    })
    .join('\n\n');
}

function main() {
  const check = process.argv.includes('--check');
  let html = fs.readFileSync(INDEX, 'utf8');
  let changed = 0;

  for (const block of BLOCKS) {
    const match = html.match(block.re);
    if (!match) {
      console.error(`build-inline: could not find the inline <${block.name}> block in index.html`);
      process.exit(1);
    }

    // Compare the whole block including its delimiters, so the surrounding
    // whitespace is normalized too. Comparing only the inner content would
    // leave delimiter drift in place and make a fresh rebuild differ from the
    // committed file.
    const desired = `<${block.tag}>\n${concat(block.sources)}\n</${block.tag}>`;
    if (match[0] === desired) continue;

    if (check) {
      console.error(`build-inline: index.html <${block.name}> is out of sync — run \`node build-inline.js\``);
      process.exit(1);
    }

    // Replacement passed as a function: `$&`, `$1` and friends inside CSS or JS
    // would otherwise be interpreted as substitution patterns and corrupt it.
    html = html.replace(block.re, () => desired);
    changed++;
  }

  if (!changed) {
    console.log(`build-inline: index.html already matches ${MODULES.length} modules and ${STYLESHEETS.length} stylesheets`);
    return;
  }

  fs.writeFileSync(INDEX, html, 'utf8');
  console.log(`build-inline: rebuilt ${changed} block(s) from ${MODULES.length} modules and ${STYLESHEETS.length} stylesheets`);
}

main();
