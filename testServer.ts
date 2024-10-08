import * as http from 'node:http';

const testServer = http
  .createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`Hello World\n${Date.now()}\n${req.url}`);
  })
  .listen(8080, () => {
    console.log('Server running at http://localhost:8080/');
  });
