import { Container, getRandom } from "@cloudflare/containers";
import { verifyAuthToken } from "./utils";

export class MyContainer extends Container {
  defaultPort = 8080;
  sleepAfter = "5m";

  override onStart() {
    console.log('Container successfully started index');
  }

  override onStop(stopParams: any) {
    if (stopParams.exitCode === 0) {
      console.log('Container stopped gracefully');
    } else {
      console.log('Container stopped with exit code:', stopParams.exitCode);
    }
    console.log('Container stop reason:', stopParams.reason);
  }

  override onError(error: string) {
    console.log('Container error:', error);
  }
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    try {
      // Route: /tests/* - forward to container (e.g. /tests/all, /tests/home, /tests/projects)
      if (url.pathname.startsWith("/tests/")) {

        const containerInstance = await getRandom(env.MY_CONTAINER, 10);
        console.log("Inside API:", containerInstance);
        const newRequest = new Request(request);
        newRequest.headers.set('X-Browserbase-Api-Key', env.BROWSERBASE_API_KEY);
        newRequest.headers.set('X-Browserbase-Project-Id', env.BROWSERBASE_PROJECT_ID);
        const authToken: any = newRequest.headers.get('X-Auth-Token');
  
        if (!authToken || !verifyAuthToken(authToken, env)) {
          console.error('Unauthorized request');
          return new Response('Unauthorized', {
            status: 401,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
        return containerInstance.fetch(newRequest);
      }

      // Route: /error - trigger error handling
      if (url.pathname === '/error') {
        throw new Error('This is a panic');
      }

      // Route: / or /container - return container info
      if (url.pathname === '/' || url.pathname === '/container') {
        const message = env.MESSAGE || 'No message set';
        const instanceId = env.CLOUDFLARE_DURABLE_OBJECT_ID || 'No instance ID';

        return new Response(
          `Hi, I'm a container and this is my messageeeee: "${message}", my instance ID is: ${instanceId}`,
          {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          }
        );
      }

      // Default route - 404 Not Found
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });

    } catch (error) {
      console.error('Error processing request:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(`Error: ${errorMessage}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  },
};