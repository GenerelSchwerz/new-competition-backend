import * as httpServer from "./httpServer"
import { LocalData } from "./types";
import * as ws from "./wsServer"
import http from "http";

const localData: LocalData = {};

let server = http.createServer();

const app = httpServer.createHttpServer(localData);
const wsServer = ws.createServer({
    server
}, localData);

server.on('request', app)

server.listen(3000, () => {
  console.log('Server started at http://localhost:3000');
});