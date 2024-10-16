import WebSocket from "ws";
import { LocalData, C2SWsMsg, WsMoveType, S2CWsMsg } from "./types";

/**
 * We want a server that listens to the wildcard endpoint: /session/:sessionId
 * Respond with an echo of the session id when the connection is established
 *
 *
 * @param opts
 * @returns
 */

// for walls, print '█ and for empty print ' '
  // for highlighted coordinates, print 'X
function printMaze(maze: number[][], ...highlightPositions: {x: number, y: number}[]) {
  const mazeStr = maze.map((row, y) => {
    return row.map((cell, x) => {
      if (highlightPositions.some(pos => pos.x === x && pos.y === y)) {
        return 'X';
      } else {
        return cell ? '█' : ' ';
      }
    }).join('');
  }).join('\n');

  console.log(mazeStr);
}

const CHECK_MOVE_MAPPING: Record<WsMoveType, {x: number, y: number}> = {
  "up": {x: 0, y: -1},
  "down": {x: 0, y: 1},
  "left": {x: -1, y: 0},
  "right": {x: 1, y: 0}
}

const TRANS_MOVE_MAPPING: Record<WsMoveType, {x: number, y: number}> = {
  "up": {x: 0, y: -2},
  "down": {x: 0, y: 2},
  "left": {x: -2, y: 0},
  "right": {x: 2, y: 0}
}

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

    // we need to keep track of which cells the robot has visited
    // as we terminate the session when all open cells have been visited by ANY robot we track.

    // all cells we care about.
    const visitableOpenCells = new Set();
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === 0 && x % 2 === 1 && y % 2 === 1)
          visitableOpenCells.add(`${x},${y}`);
      });
    })

    const visitedOpenCells = new Set();


    const broadcast = (msg: S2CWsMsg) => {
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
      const msg: C2SWsMsg = JSON.parse(message.toString());


      switch (msg.type) {
        // verification will happen here
        case "move": {
          const id = msg.data.id;

          // this actually works regardless of being a map by id, or using an array. I left it as is, as perhaps the end user fucks up the ordering.
          const moves: Record<string, WsMoveType> = msg.data.moves;

          if (ownerKey !== userKey) {
            ws.close(3003, `Invalid simulation key: ${userKey}`);
            return;
          }

          // validate moves
          for (const [robotId, moveName] of Object.entries(moves)) {
            const wMove = CHECK_MOVE_MAPPING[moveName];
            const tMove = TRANS_MOVE_MAPPING[moveName];
            const newPos = data.robotPositions[robotId as unknown as number];
            const transX = newPos.x + tMove.x;
            const transY = newPos.y + tMove.y;

            const wallX = newPos.x + wMove.x;
            const wallY = newPos.y + wMove.y;

            if (transX < 0 || transX >= grid[0].length || transY < 0 || transY >= grid.length) {
              // broadclose(4001, JSON.stringify({ error: `Robot ${robotId} moved out of bounds at ${transX}, ${transY}` }));
              // return;

              // silently ignore error if invalid.
              // console.log(`Robot ${robotId} moved out of bounds`)
              continue
            }

            // make sure grid pos is not a 1
            if (grid[wallY][wallX] === 1) {
              // broadclose(4001, JSON.stringify({ error: `Robot ${robotId} moved to an a wall at ${wallX}, ${wallY}` }));
              // return;

              // silently ignore movement if invalid.
              // console.log(`Robot ${robotId} moved to a wall`)
              continue
            }
            // apply translation.
            newPos.x = transX;
            newPos.y = transY;
          
            // check if we have visited this cell before.
            visitedOpenCells.add(`${transX},${transY}`);
          }

          // broadcast moves
          broadcast({ type: "moveUpdate", data: { id, positions: data.robotPositions } })

          if (visitedOpenCells.size === visitableOpenCells.size) {
            // we have visited all open cells.
            broadclose(4000, "All open cells have been visited.");
            return;
          }

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
