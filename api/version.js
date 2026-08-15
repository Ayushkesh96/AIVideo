/**
 * GET /api/version
 *
 * Answers "is the deployed site actually running the latest code?" without
 * anyone having to guess from the UI.
 *
 * Vercel injects the git metadata of the build, so this reports the commit the
 * running deployment was built from. Compare it against the newest commit on
 * the branch: if they differ, the code is fine and the deployment pipeline is
 * the problem — a disconnected repo, a non-production branch, or a failed
 * build.
 */

const { applyCors } = require('./_video');

module.exports = async (req, res) => {
  applyCors(res);
  // Must never be cached: a cached answer would report a stale deployment as
  // current, which is the exact failure this endpoint exists to detect.
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const sha = process.env.VERCEL_GIT_COMMIT_SHA || '';

  res.status(200).json({
    success: true,
    commit: sha ? sha.slice(0, 7) : 'unknown (not built by Vercel)',
    commitFull: sha || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    repo: process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
      ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
      : null,
    message: process.env.VERCEL_GIT_COMMIT_MESSAGE
      ? String(process.env.VERCEL_GIT_COMMIT_MESSAGE).split('\n')[0].slice(0, 120)
      : null,
    environment: process.env.VERCEL_ENV || 'local',
    // Stamped into index.html at build time; lets a browser confirm the HTML
    // it loaded matches this deployment rather than a cached copy.
    expectedBuildId: require('./_buildid'),
    servedAt: new Date().toISOString()
  });
};
