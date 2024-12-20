/**
 * This file tests the endpoint /init of the server.
 */

const WebSocket = require("ws");
const { createMaze } = require("./mazeGen");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const grid = createMaze(33, 33);
const deltaMoves = ["up", "down", "left", "right"];

async function mainSetup() {
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
  return res;
}

async function mainPublisher(sessionId, key) {
  const ws = new WebSocket("ws://localhost:3000/session/" + sessionId, {
    headers: {
      "test-key": key, // comment this out to be not allowed.
    },
  });

  const recvData = await new Promise((resolve, reject) => {
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== "init") {
        ws.close();
        reject("Expected init message");
      }
      const data = msg.data;
      if (data.grid) {
        ws.onmessage = null;
        resolve({ grid: data.grid, robotPositions: data.robotPositions });
      } else {
        ws.close();
        reject(msg);
      }
    };
  });

  const recvGrid = recvData.grid;
  let robotPositions = recvData.robotPositions;

  // this is where we would allow our user code to run.

  let i = 0;
  console.log("hey");

  // we close the connection whenever the simulation returns faulty data, such as hitting a wall.
  // make sure to not let that happen, devs! (feature, on frontend can just display reason for failure.)
  while (ws.readyState === WebSocket.OPEN) {
    const moves = {};
    for (let j = 0; j < robotPositions.length; j++) {
      const randSelect = Math.floor(Math.random() * 4);
      moves[j] = deltaMoves[randSelect];
    }

    // console.log('sending shit')
    ws.send(JSON.stringify({ type: "move", data: { id: i, moves } }));

    robotPositions = await new Promise((resolve, reject) => {
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case "moveUpdate": {
            // console.log(`Move ${msg.data.id} was successful. ${JSON.stringify(msg.data.positions)}`);
            if (msg.data.id >= i) {
              ws.onmessage = null;
              resolve(msg.data.positions);
            } else if (msg.data.id > i) {
              ws.close();
              reject(`This shouldn't be possible. Received id ${msg.data.id} when we were expecting ${i} or less`);
            }
            // else: continue waiting to allow the server to catch up. Shouldn't happen in practice.
          }
        }
      };
    });
    i++;
    // await sleep(1000); // arbitrary limit for debugging. Can be removed, the above code handles syncing with remote.
  }
}

async function mainSpectator(sessionId) {
  const ws = new WebSocket("ws://localhost:3000/session/" + sessionId, {});

  ws.onopen = async () => {
    await sleep(1000);
    ws.send(JSON.stringify({ type: "pastMoves" }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    switch (msg.type) {
      case "init": {
        console.log(`Received init message: ${JSON.stringify(msg.data)}`);
        break;
      }

      case "pastMoves": {
        console.log(`Received past moves: ${JSON.stringify(msg.data)}`);
        break;
      }

      case "moveUpdate": {
        console.log(`[SPECTATOR] Move ${msg.data.id} updated. ${JSON.stringify(msg.data.positions)}`);
        break;
      }
    }

    ws.onclose = (event) => {
      console.log(`Spectator connection closed: ${event.code} ${event.reason}`);
    };
  };
}

(async () => {
  const res = await mainSetup();
  const pub = mainPublisher(res.sessionId, res.key);
  const spec = mainSpectator(res.sessionId);

  await pub;
  await spec;
})();
