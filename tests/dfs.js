const WebSocket = require("ws");

// Utility function to simulate sleep
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Movement directions
const deltaMoves = ["up", "down", "left", "right"];

const { createMaze, printMaze } = require('./mazeGen');

// Create the maze
const maze = createMaze(33, 33);

// Function to check if a move is valid
function isMoveValid(robotPosition, move, maze, visited) {
  const newX = robotPosition.x + move.x * 2;
  const newY = robotPosition.y + move.y * 2;

  const wallX = robotPosition.x + move.x;
  const wallY = robotPosition.y + move.y;

  // Ensure the new position is within bounds, is not a wall, and hasn't been visited yet
  return (
    newX >= 0 &&
    newX < maze[0].length &&
    newY >= 0 &&
    newY < maze.length &&
    maze[wallY][wallX] === 0 &&  // 0 means open space, not a wall
    !visited.has(`${newX},${newY}`) // Check if we haven't visited this position
  );
}

// WebSocket handling
async function connectWebSocket(res) {
  return new WebSocket("ws://localhost:3000/session/" + res.sessionId, {
    headers: {
      "test-key": res.key, // Comment this out to be not allowed.
    },
  });
}

// Function to handle WebSocket close event
function handleWebSocketClose(event, maze, robotPositions) {
  const { code, reason } = event;
  let x, y;
  if (reason.includes("wall")) {
    const match = reason.match(/(\d+), (\d+)/);
    x = parseInt(match[1]);
    y = parseInt(match[2]);
  }
  console.log(`WebSocket closed with code ${code} and reason: ${reason}`);
  printMaze(maze, ...robotPositions);
  console.log('\n', ...robotPositions, { x, y });
  printMaze(maze, ...robotPositions, { x, y });
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
        console.log(`Move ${msg.data.id} update: ${JSON.stringify(msg.data.positions)}`);
        ws.onmessage = null;
        resolve(msg.data.positions);
      } else if (msg.data.id > moveId) {
        ws.close();
        reject(`Unexpected id: ${msg.data.id}. Expected ${moveId} or less.`);
      }
    };
  });
}

// Function to determine the move needed to backtrack
function getBacktrackMove(currentPosition, backtrackPosition) {
  const dx = backtrackPosition.x - currentPosition.x;
  const dy = backtrackPosition.y - currentPosition.y;

  if (dx === 2 && dy === 0) return 'right'; // Moving back to the right
  if (dx === -2 && dy === 0) return 'left'; // Moving back to the left
  if (dx === 0 && dy === 2) return 'down'; // Moving back down
  if (dx === 0 && dy === -2) return 'up'; // Moving back up

  return null; // Shouldn't happen, but just in case
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

  ws.onclose = (event) => handleWebSocketClose(event, maze, robotPositions);

  let { grid: recvGrid, robotPositions } = await receiveInitData(ws);
  printMaze(recvGrid);
  console.log(robotPositions);

  // Movement configuration
  const wallMoves = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    right: { x: 1, y: 0 },
    left: { x: -1, y: 0 },
  };

  const movementPriority = ['up', 'right', 'down', 'left'];

  // Create a visited set and pathStack for each robot
  const robots = robotPositions.map((position) => ({
    visited: new Set([`${position.x},${position.y}`]), // Mark initial position as visited
    pathStack: [{ x: position.x, y: position.y }], // Initial path stack
  }));

  let i = 0;

  // WebSocket loop to explore all open nodes with backtracking
  while (ws.readyState === WebSocket.OPEN) {
    const moves = {};

    // Calculate moves for each robot
    for (let j = 0; j < robotPositions.length; j++) {
      let selectedMove = null;
      const currentRobot = robots[j];

      // Select the first valid move based on movement priority
      for (let move of movementPriority) {
        const candidateMove = wallMoves[move];
        if (isMoveValid(robotPositions[j], candidateMove, maze, currentRobot.visited)) {
          selectedMove = move;
          break;
        }
      }

      // If no valid move is found, backtrack to the previous position
      if (!selectedMove) {
        console.log(`No valid move found for robot ${j}. Backtracking...`);
        if (currentRobot.pathStack.length > 0) {
          const backtrackPosition = currentRobot.pathStack.pop(); // Backtrack to the previous position
          selectedMove = getBacktrackMove(robotPositions[j], backtrackPosition);

          if (!selectedMove) {
            console.log("Error calculating backtrack move. Stopping.");
            ws.close(); // Close the WebSocket if something goes wrong with backtracking
            return;
          }
        } else {
          console.log('No more moves left. All nodes explored.');
          ws.close(); // Close when there's nowhere else to explore
          return;
        }
      } else {
        // verify not repeating the same position
        if (currentRobot.pathStack.length > 0) {
          const lastPosition = currentRobot.pathStack[currentRobot.pathStack.length - 1];
          if (lastPosition.x !== robotPositions[j].x || lastPosition.y !== robotPositions[j].y) {
              currentRobot.pathStack.push({ x: robotPositions[j].x, y: robotPositions[j].y });
          }
        } else {
          currentRobot.pathStack.push({ x: robotPositions[j].x, y: robotPositions[j].y });
        }
        
      }
      moves[j] = selectedMove;
    }

 

    for (const robot of robots) {
      printMaze(maze, ...[...robot.visited].map(pos => {
          const [x, y] = pos.split(',').map(Number);
          return { x, y };
        }))
    }

   

    // Send move to server and update positions
    robotPositions = await sendMove(ws, i, moves);
    for (const roboId in robotPositions) {
      const newRobo = robotPositions[roboId];
      robots[roboId].visited.add(`${newRobo.x},${newRobo.y}`);
    }

    i++;
    // await sleep(1000); // Optional sleep for debugging
  }

})();
