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
    const grid = data.grid;
    const ownerKey = data.key
    const userKey = req.headers['test-key']

    ws.on('message', (message) => {
      const msg: SimWsMsg = JSON.parse(message.toString());

      switch (msg.type) {

        // verification will happen here
        case 'move': {
          const id = msg.data.id;
          const moves: Record<string, {x: number, y: number}> = msg.data.moves;

          if (ownerKey !== userKey) {
            ws.close(3003, `Invalid simulation key: ${userKey}`)
            return
          }

          // validate moves
          for (const [robotId, move] of Object.entries(moves)) {
            const newPos = data.robotPositions[robotId];
            newPos.x += move.x;
            newPos.y += move.y;
            console.log(id, robotId, newPos)

            if (newPos.x < 0 || newPos.x >= grid[0].length || newPos.y < 0 || newPos.y >= grid.length) {
              ws.close(4000, JSON.stringify({ error: `Robot ${robotId} moved out of bounds to position ${newPos.x}, ${newPos.y}` }))
              return
            }

            // make sure grid pos is not a 1
            if (grid[newPos.y][newPos.x] === 1) {
              ws.close(4000, JSON.stringify({ error: `Robot ${robotId} moved into a wall at position ${newPos.x}, ${newPos.y}` }))
              return
            }
          }

          ws.send(JSON.stringify({ type: 'moveSuccess', data: { id, positions: data.robotPositions} }))
          break
        }
      }
    });



  });


  return srv;
}