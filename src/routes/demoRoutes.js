/**
 * DEMO WEBSITE ROUTES
 * Serves AI-generated demo websites to prospects
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

/**
 * Serve demo website
 * GET /demo/:slug
 */
router.get('/demo/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const demoPath = path.join(process.cwd(), 'data', 'demos', slug, 'index.html');

    // Check if demo exists
    try {
      await fs.access(demoPath);
    } catch (error) {
      return res.status(404).send(`
        <html>
          <head>
            <title>Demo Not Found</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
              }
              .container {
                text-align: center;
                padding: 40px;
              }
              h1 { font-size: 48px; margin: 0 0 20px 0; }
              p { font-size: 18px; opacity: 0.9; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>🔍 Demo Not Found</h1>
              <p>This demo website is being generated...</p>
            </div>
          </body>
        </html>
      `);
    }

    // Serve the demo HTML
    const html = await fs.readFile(demoPath, 'utf-8');
    res.send(html);

  } catch (error) {
    console.error('Error serving demo:', error);
    res.status(500).send('Error loading demo');
  }
});

/**
 * Serve production customer website
 * GET /site/:customerId
 */
router.get('/site/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const websitePath = path.join(process.cwd(), 'data', 'websites', customerId, 'index.html');

    try {
      await fs.access(websitePath);
    } catch (error) {
      return res.status(404).send('Website not found');
    }

    const html = await fs.readFile(websitePath, 'utf-8');
    res.send(html);

  } catch (error) {
    console.error('Error serving website:', error);
    res.status(500).send('Error loading website');
  }
});

module.exports = router;