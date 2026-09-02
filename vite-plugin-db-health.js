const HEALTH_URL = 'http://localhost:5000/api/health';
const RETRIES = 10;
const RETRY_MS = 400;

async function printDbStatus() {
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      const res = await fetch(HEALTH_URL);
      const data = await res.json();
      if (data.db === 'connected') {
        console.log('DB is successfully connected');
        return;
      }
      console.log('DB is not connected');
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    }
  }
  console.log('DB is not connected');
}

export function dbHealthCheckPlugin() {
  return {
    name: 'db-health-check',
    configureServer(server) {
      let ran = false;
      const run = () => {
        if (ran) return;
        ran = true;
        void printDbStatus();
      };

      const attach = () => {
        if (!server.httpServer) {
          setTimeout(attach, 50);
          return;
        }
        if (server.httpServer.listening) {
          run();
          return;
        }
        server.httpServer.once('listening', run);
      };

      attach();
    },
  };
}
