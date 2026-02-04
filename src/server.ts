import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { exec } from 'child_process'
import util from 'util'

const execPromise = util.promisify(exec);

const app = new Hono()

app.get('/', (c) => c.text('Hello from container!'))

app.get('/health', (c) => c.text('ok'))

app.get('/tests/main', async (c) => {
  try {
    // Get secrets from headers and set them as environment variables
    process.env.BROWSERBASE_API_KEY = c.req.header('X-Browserbase-Api-Key');
    process.env.BROWSERBASE_PROJECT_ID = c.req.header('X-Browserbase-Project-Id');

    // Execute the playwright test file. Using the list reporter for a concise output.
   const { stdout, stderr } = await execPromise('npx playwright test tests/main.spec.js');

    // const { stdout, stderr } = await execPromise('ls -');

    
    if (stderr && !stderr.includes('View replay at https://browserbase.com/sessions/')) {
      // The Browserbase fixture logs the session URL to stderr, so we don't treat that as an error.
      console.error(`Test execution stderr: ${stderr}`);
    }

    const output = `Test Execution Output:\n\nStdout:\n${stdout}\n\nStderr:\n${stderr}`;
    
    return c.text(output);

  } catch (error) {
    console.error(`Error executing test: ${error}`);
    return c.json({
      message: 'Failed to execute Playwright test.',
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    }, 500);
  }
})

const port = 8080
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})