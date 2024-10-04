import WebSocket from "ws";
import { LocalData, SimWsMsg } from "./types";

/**
 * We want a server that listens to the wildcard endpoint: /session/:sessionId
 * Respond with an echo of the session id when the connection is established 
 * 
 * 
 * @param opts 
 * @returns 
 */

export function createServer(opts: WebSocket.ServerOptions, localData: LocalData): WebSocket.Server {
  const srv = new WebSocket.Server(opts);

  srv.on('connection', (ws, req) => {
    // idenify session id
    // session id is: /session/:sessionId

    const sessionId = req.url?.split('/').pop();

    // check for validity (it is is a unix timestamp)

    let valid = !!sessionId && !isNaN(parseInt(sessionId));

    if (!valid) {
      ws.close();
      return
    }
    const data = localData[sessionId!];
    if (!data) {
      ws.close(3003, `Invalid session id: ${sessionId}`)
    }

    ws.send(JSON.stringify({ sessionId: parseInt(sessionId!), grid: data.grid, robotPositions: data.robotPositions }));

    // handle messages

    const ownerKey = data.key
    const userKey = req.headers['test-key']

    let simIter = -1;
    ws.on('message', (message) => {
      const msg: SimWsMsg = JSON.parse(message.toString());

      switch (msg.type) {

        // verification will happen here/
        case 'move': {
          const {id, roboId, move}  = msg.data;

          if (ownerKey !== userKey) {
            ws.close(3003, `Invalid simulation key: ${userKey}`)
            return
          }

          if (roboId == 0) simIter++;
          console.log(`${id} ${roboId} ${JSON.stringify(move)} | ${id - roboId} | ${simIter}`)
          break
        }
      }
    });



  });


  return srv;
}