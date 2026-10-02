// Example of the config.js that the Netlify build writes from the PROJECTS
// environment variable. For local testing, copy this to config.js and edit.
// config.js is gitignored: script URLs are kept out of the repo.
window.PORTAL_CONFIG = {
  projects: {
    'lets-pray': 'https://script.google.com/macros/s/PASTE-DEPLOYMENT-ID/exec'
  }
};
