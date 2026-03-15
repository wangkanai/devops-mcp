const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async function () {
  // Build once before all test suites to avoid race conditions
  // when parallel workers each try to build (prebuild does rm -rf dist)
  execSync('npm run build', { stdio: 'inherit' });

  // Ensure the built file has execute permissions
  const distPath = path.join(__dirname, 'dist', 'index.js');
  if (fs.existsSync(distPath)) {
    execSync(`chmod +x "${distPath}"`, { stdio: 'inherit' });
  }
};
