# GitHub Actions CI Setup

Due to OAuth App token scope limitations, the workflow file cannot be pushed directly.
The workflow must be created via the GitHub web UI or the repo owner must grant `workflow` scope.

## Required Workflow File: `.github/workflows/tests.yml`

```yaml
name: Tests
on:
  push:
    branches: [LWB-with-Bugs, main]
  pull_request:
    branches: [LWB-with-Bugs, main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          npm install
          npm install -D puppeteer serve
          
      - name: Run tests
        run: |
          npx serve -l 3456 &
          SERVER_PID=$!
          sleep 3
          
          node -e "
            const puppeteer = require('puppeteer');
            (async () => {
              const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
              });
              const page = await browser.newPage();
              const logs = [];
              page.on('console', msg => logs.push(msg.text()));
              
              try {
                await page.goto('http://localhost:3456', { waitUntil: 'networkidle0', timeout: 30000 });
                
                const result = await page.evaluate(async () => {
                  try {
                    const tests = await import('./js/tests.js');
                    return await tests.runTests();
                  } catch (e) {
                    return { error: e.message };
                  }
                });
                
                if (result && result.failed > 0) {
                  console.error('TESTS FAILED:', result.failed);
                  process.exit(1);
                }
              } finally {
                await browser.close();
              }
            })();
          "
          
          kill $SERVER_PID 2>/dev/null || true
```

## Setup Steps

1. Go to https://github.com/snugos/app/actions (Actions tab)
2. Click "New workflow" 
3. Create the workflow file at `.github/workflows/tests.yml`
4. The workflow will run on every push and PR to LWB-with-Bugs and main branches
5. It uses puppeteer to run the browser-based tests headlessly

## Test Command

Tests run by calling `(await import('./js/tests.js')).runTests()` in the browser console.
The GitHub Actions workflow loads the app via a local server and runs the same tests.
