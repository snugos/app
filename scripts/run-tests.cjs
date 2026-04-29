// scripts/run-tests.js - Headless browser test runner for SnugOS
// Usage: node scripts/run-tests.js

const puppeteer = require('puppeteer');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Simple static file server
function createServer(dir, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(dir, req.url === '/' ? 'index.html' : req.url);
      const ext = path.extname(filePath);
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg'
      };
      
      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
          res.end(content);
        }
      });
    });
    
    server.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

async function runTests() {
  const PORT = 3847;
  let server;
  
  // Start server
  try {
    server = await createServer(process.cwd(), PORT);
  } catch (e) {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  
  const consoleLogs = [];
  const errors = [];
  
  try {
    const page = await browser.newPage();
    
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (msg.type() === 'error') {
        errors.push(text);
      }
    });
    
    page.on('pageerror', err => {
      errors.push('PAGE ERROR: ' + err.message);
    });
    
    console.log('Loading page...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0', timeout: 60000 });
    
    // Wait for app to initialize
    await page.waitForTimeout(3000);
    
    console.log('Running tests...');
    const result = await page.evaluate(async () => {
      try {
        // Wait for appServices to be available
        let attempts = 0;
        while (!window.appServices && attempts < 50) {
          await new Promise(r => setTimeout(r, 100));
          attempts++;
        }
        
        const tests = await import(`./js/tests.js?v=${Date.now()}`);
        return await tests.runTests();
      } catch (e) {
        return { error: e.message, stack: e.stack };
      }
    });
    
    console.log('\n=== TEST RESULTS ===');
    if (result.error) {
      console.log('ERROR:', result.error);
      if (result.stack) console.log('Stack:', result.stack);
    } else if (result.summary) {
      console.log(`Total: ${result.summary.total}`);
      console.log(`Passed: ${result.summary.passed}`);
      console.log(`Failed: ${result.summary.failed}`);
      
      if (result.summary.failed > 0 && result.details) {
        console.log('\nFailed tests:');
        result.details.forEach(d => {
          if (d.status === 'fail') {
            console.log(`  - ${d.name}: ${d.error}`);
          }
        });
      }
      
      // Exit with error code if tests failed
      if (result.summary.failed > 0) {
        process.exitCode = 1;
      }
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
    
    // Log any console errors
    if (errors.length > 0) {
      console.log('\n=== CONSOLE ERRORS ===');
      errors.forEach(e => console.log(e));
    }
    
  } catch (e) {
    console.error('Test runner failed:', e.message);
    process.exitCode = 1;
  } finally {
    await browser.close();
    if (server) server.close();
  }
}

runTests();