const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors({ allowedHeaders: "*", origin: "*" }));
// app.use()

const PORT = 3000;
const { exec } = require("child_process");

let clients = [];
let facts = [];

const { spawn } = require("child_process");

app.get("/status", (request, response) =>
  response.json({ clients: clients.length })
);

function sendEventsToAll(newFact) {
  clients.forEach((client) =>
    client.res.write(`data: ${JSON.stringify(newFact)}\n\n`)
  );
}

app.get("/run", async (request, response) => {
  console.log(request.query);

  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };

  response.writeHead(200, headers);
  response.write("id: " + 1 + "\n");
  response.write(String("data: woooooooooooooooe\n\n"));
  // response.f();

  // await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(request.query.command.split(" ")[0]);
  console.log(request.query.command.split(" ").slice(1));

  const child = spawn(
    request.query.command.split(" ")[0],
    request.query.command.split(" ").slice(1)
  );
  // const child = spawn("tail", ["-f", "/var/log/syslog"]);
  child.stdout.setEncoding("utf8"); //if you want text chunks
  child.stdout.on("data", (chunk) => {
    console.log("::: " + String(chunk));
    // response.write("id: " + 1 + "\n");
    // response.write(String(chunk));
    response.write(`data: ${JSON.stringify({ out: String(chunk) })}\n\n`);

    // sendEventsToAll(String(chunk));
  });

  child.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
  });

  // child.

  child.once("exit", () => {
    console.log("command exited");
    response.emit("close");
    response.end();
  });

  request.on("close", () => {
    console.log(`${request.socket.remotePort} Connection closed`);
    child.kill();
    // clients = clients.filter((client) => client.id !== clientId);
  });

  // response.send("");
});

let i = 0;

const eventsHandler = (req, res, next) => {
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };

  res.writeHead(200, headers);

  //   const data = `data: ${JSON.stringify(facts)}\n\n`;

  const child = spawn("ls");
  // use child.stdout.setEncoding('utf8'); if you want text chunks
  child.stdout.on("data", (chunk) => {
    console.log({ out: String(chunk) });
    // res.write(chunk);
    res.write(JSON.stringify({ out: String(chunk) }));
    // data from the standard output is here as buffers
  });
  // since these are streams, you can pipe them elsewhere
  // child.stderr.pipe(dest);
  child.on("close", (code) => {
    console.log(`child process exited with code ${code}`);
  });
  const clientId = Date.now();

  const newClient = {
    id: clientId,
    res,
  };

  clients.push(newClient);

  req.on("close", () => {
    console.log(`${clientId} Connection closed`);
    clients = clients.filter((client) => client.id !== clientId);
  });
};

app.get("/events", eventsHandler);

app.listen(PORT, () => {
  console.log(`Events service listening at http://localhost:${PORT}`);
});
