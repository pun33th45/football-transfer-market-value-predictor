const http = require("http");
const fs = require("fs");
const path = require("path");

const port = Number(process.env.PORT || 4173);
const root = path.join(__dirname, "preview");

const server = http.createServer((request, response) => {
  const urlPath = request.url === "/" ? "/index.html" : request.url;
  const filePath = path.join(root, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(content);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Preview running at http://127.0.0.1:${port}`);
});
