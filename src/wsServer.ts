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

  srv.on("connection", (ws, req) => {
    // idenify session id
    // session id is: /session/:sessionId

    const sessionId = req.url?.split("/").pop();

    // check for validity (it is is a unix timestamp)

    let valid = !!sessionId && !isNaN(parseInt(sessionId));

    if (!valid) {
      ws.close();
      return;
    }
    const data = localData[sessionId!];
    if (!data) {
      ws.close(3003, `Invalid session id: ${sessionId}`);
    }

    ws.send(
      JSON.stringify({ type: "init", data: { sessionId: parseInt(sessionId!), grid: data.grid, robotPositions: data.robotPositions } })
    );

    data.wsList.push(ws);

    // handle messages
    const grid = data.grid;
    const ownerKey = data.key;
    const userKey = req.headers["test-key"];

    const broadcast = (msg: SimWsMsg) => {
      for (const ws of data.wsList) {
        ws.send(JSON.stringify(msg));
      }
    }

    const broadclose = (code: number, reason: string) => {
      for (const ws of data.wsList) {
        ws.close(code, reason);
      }
    }

    ws.on("message", (message) => {
      const msg: SimWsMsg = JSON.parse(message.toString());

      switch (msg.type) {
        // verification will happen here
        case "move": {
          const id = msg.data.id;
          const moves: Record<string, { x: number; y: number }> = msg.data.moves;

          if (ownerKey !== userKey) {
            ws.close(3003, `Invalid simulation key: ${userKey}`);
            return;
          }

          // validate moves
          for (const [robotId, move] of Object.entries(moves)) {
            const newPos = data.robotPositions[robotId as unknown as number];
            newPos.x += move.x;
            newPos.y += move.y;

            if (newPos.x < 0 || newPos.x >= grid[0].length || newPos.y < 0 || newPos.y >= grid.length) {
              broadclose(4001, JSON.stringify({ error: `Robot ${robotId} moved out of bounds at ${newPos.x}, ${newPos.y}` }));
              return;
            }

            // make sure grid pos is not a 1
            if (grid[newPos.y][newPos.x] === 1) {
              broadclose(4001, JSON.stringify({ error: `Robot ${robotId} moved to an a wall at ${newPos.x}, ${newPos.y}` }));
              return;
            }
          }

          // broadcast moves
          broadcast({ type: "moveSuccess", data: { id, positions: data.robotPositions } })
          break;
        }
      }
    });

    ws.on("close", () => {
      const index = data.wsList.indexOf(ws);
      data.wsList.splice(index, 1);
    });
  });

  return srv;
}
