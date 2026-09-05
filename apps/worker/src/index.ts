import { createServer } from 'node:http';
import { parseServerEnv } from '@barberos/config';

const env = parseServerEnv(process.env);
const port = env.WORKER_PORT;

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 'ok', service: 'worker' }));
    return;
  }
  response.writeHead(404, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ error: 'not_found' }));
});

server.listen(port, () => {
  console.log(`BarberOS worker listening on http://localhost:${port}`);
});
