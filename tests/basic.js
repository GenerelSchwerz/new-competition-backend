/**
 * This file tests the endpoint /init of the server.
 */

const WebSocket = require("ws");

// Utility function to simulate sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


const { createMaze, printMaze } = require('./mazeGen');

// Create the maze
const maze = createMaze(33, 33);

// WebSocket handling
async function connectWebSocket(res) {
  return new WebSocket("ws://localhost:3000/session/" + res.sessionId, {
    headers: {
      "test-key": res.key, // Comment this out to be not allowed.
    },
  });
}


// Function to handle receiving initial data from WebSocket
async function receiveInitData(ws) {
  return new Promise((resolve, reject) => {
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== 'init') {
        ws.close();
        reject('Expected init message');
      }
      const { grid, robotPositions } = msg.data;
      if (grid) {
        ws.onmessage = null;
        resolve({ grid, robotPositions });
      } else {
        ws.close();
        reject(msg);
      }
    };
  });
}

// Function to send robot moves and handle server response
async function sendMove(ws, moveId, moves) {
  ws.send(JSON.stringify({ type: "move", data: { id: moveId, moves } }));

  return new Promise((resolve, reject) => {
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "moveUpdate" && msg.data.id >= moveId) {
        console.log(`Move ${msg.data.id} updated: ${JSON.stringify(msg.data.positions)}`);
        ws.onmessage = null;
        resolve(msg.data.positions);
      } else if (msg.data.id > moveId) {
        ws.close();
        reject(`Unexpected id: ${msg.data.id}. Expected ${moveId} or less.`);
      }
    };
  });
}


// Function to handle WebSocket close event
function handleWebSocketClose(event, maze, ...infos) {
  const { code, reason } = event;
  let x, y;
  if (reason.includes("wall")) {
    const match = reason.match(/(\d+), (\d+)/);
    x = parseInt(match[1]);
    y = parseInt(match[2]);
  }
  console.log(`WebSocket closed with code ${code} and reason: ${reason}`);

  for (const info of infos) {
    printMaze(maze, ...info.pathStack);
  }
 
}

// Main execution function
(async () => {
  // Fetch initial data from server
  const req = await fetch("http://localhost:3000/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grid: maze, robotCount: 1 }),
  });

  const res = await req.json();
  const ws = await connectWebSocket(res);


  let { grid: recvGrid, robotPositions } = await receiveInitData(ws);

  const robots = robotPositions.map((position) => ({
    pathStack: [{ x: position.x, y: position.y }], // Initial path stack
  }));

  ws.onclose = (event) => handleWebSocketClose(event, maze, ...robots);


  printMaze(recvGrid);
  console.log(robotPositions);


  let movementPriority = ['up', 'right', 'down', 'left'];

  let i = 0;

  // tracks overall path.
 
  // WebSocket loop to send moves
  while (ws.readyState === WebSocket.OPEN) {
    const moves = {};

    // Create a visited set and pathStack for each robo
  
    // Calculate moves for each robot
    for (let j = 0; j < robotPositions.length; j++) {
      
      movementPriority.sort(() => Math.random() - 0.5); // Shuffle movement priority (randomize)
      
      // select a completely random movement. This will be invalid more often than not.
      // current setup just ignores this movement. this is intended behavior.
      const selectedMove = movementPriority[0];
  

      if (!selectedMove) {
        console.error(`No valid move found for robot ${j}, this shouldn't happen.`);
        ws.close(); // Optionally close or handle error
        return;
      }

      moves[j] = selectedMove;
    }

    if (i % 10000 === 0) {
      for (const robot of robots) {
        printMaze(maze, ...robot.pathStack)
      }
    }
    


    const oldPos = robotPositions;
  
    // Send move to server and update positions
    // saving to robotPositions updates our current info
    robotPositions = await sendMove(ws, i, moves);
    for (const roboId in robotPositions) {
      const newRobo = robotPositions[roboId];
      const oldRobo = oldPos[roboId];

      if (newRobo.x === oldRobo.x && newRobo.y === oldRobo.y) {
        console.log('invalid move registered.')
      }

      // pushing to here keeps track of our history.
      robots[roboId].pathStack.push({ x: newRobo.x, y: newRobo.y });
    }

    i++;
    // await sleep(1000); // Optional sleep for debugging
  }
})();
