/**
 * This file tests the endpoint /init of the server.
 */

const WebSocket = require("ws");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const deltaMoves = [
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
];

const validPatternOrder = [0, 1, 2, 3];
const invalidPatternOrder = [0, 0, 0, 0];

// make a grid that is 9x9, where walls are represented by 1s and open by 0s.
const grid = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => 0));

// add some walls
grid[0][0] = 1;
grid[0][1] = 1;
grid[0][2] = 1;
grid[0][3] = 1;
grid[0][4] = 1;
grid[0][5] = 1;

console.log(grid);

(async () => {
  const req = await fetch("http://localhost:3000/init", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grid,
      robotCount: 2,
    }),
  });

  const res = await req.json();

  const ws = new WebSocket("ws://localhost:3000/session/" + res.sessionId, {
    headers: {
      "test-key": res.key, // comment this out to be not allowed.
    },
  });

  ws.onclose = (event) => {
    console.log(`ws closed with code ${event.code} and reason ${event.reason}`);
  }

  const { grid: recvGrid, robotPositions } = await new Promise((resolve, reject) => {
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.grid) {
        ws.onmessage = null;
        resolve({ grid: data.grid, robotPositions: data.robotPositions });
      } else {
        ws.close();
        reject(data);
      }
    };
  });

  console.log(recvGrid);
  console.log(robotPositions);

  let i = 0;
  while (i < 5) {
    for (let j = 0; j < robotPositions.length; j++) {
      const k = j + i * robotPositions.length;

      ws.send(JSON.stringify({ type: "move", data: { id: k, roboId: j, move: robotPositions[j] } }));
    }

    i++;
    await sleep(1000);
  }
})();
