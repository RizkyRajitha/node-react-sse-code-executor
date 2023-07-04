const express = require("express");
const cors = require("cors");

// setup cors
const app = express();
app.use(cors());

// required to run commands on host
const { spawn } = require("child_process");

const PORT = 3000;

// run route handler
app.get("/run", async (request, response) => {
  console.log(`command : ${request.query.command}`);

  // set headers required for sse `"Content-Type": "text/event-stream",`is where the magic happens
  const headers = {
    "Content-Type": "text/event-stream",
    Connection: "keep-alive",
    "Cache-Control": "no-cache",
  };

  // send 200 response to client
  response.writeHead(200, headers);

  // break down command to command and arguments as requried by spaw methode
  const runCommand = spawn(
    request.query.command.split(" ")[0],
    request.query.command.split(" ").slice(1)
  );

  console.log(`pid : ${runCommand.pid}`);

  // send stdout encoding to uft8 since sse only support text
  runCommand.stdout.setEncoding("utf8");

  // add event listener to list to data on stdout
  runCommand.stdout.on("data", (chunk) => {
    console.log("stdout : " + String(chunk));

    // create it for event
    let id = new Date().getTime();
    // write id to response
    response.write(`id: ${id}\n`);
    // set event
    response.write(`event: stdout\n`);
    // write data to response
    response.write(
      `data: ${JSON.stringify({ type: "stdout", out: String(chunk) })}\n\n`
    );
  });

  // add event listener to list to data on stderr
  runCommand.stderr.on("data", (data) => {
    console.error(`stderr : ${String(data)}`);

    let id = new Date().getTime();
    // write id to response
    response.write(`id: ${id}\n`);
    // set event
    response.write(`event: stderr\n`);
    // write data to response
    response.write(
      `data: ${JSON.stringify({ type: "strerr", out: String(data) })}\n\n`
    );
  });

  // add event listener to list to errors
  runCommand.once("error", (err) => {
    console.log(`Error executing command exited : ${err}`);
    // set event
    response.write(`event: err\n`);
    // write data to response
    response.write(
      `data: ${JSON.stringify({ type: "error", out: String(err) })}\n\n`
    );
    response.emit("close");
    response.end();
  });

  // when command is exit close connection by sending
  runCommand.once("exit", (code) => {
    console.log(`command exited code : ${code}`);
    // set event
    response.write(`event: exit\n`);
    response.write(`data: exited\n\n`);
    // set event
    response.end();
  });
  // kill long running command id client connection is close
  request.on("close", () => {
    console.log(`${request.socket.remotePort} Connection closed`);
    runCommand.kill();
  });
});

// http server listen on given port
app.listen(PORT, () => {
  console.log(`App is listening on http://localhost:${PORT}`);
});
