const { createCanvas } = require('canvas');

// Function to draw the maze and place the robot at a given coordinate
function drawMazeWithRobot(maze, robotX, robotY, cellSize = 20, wallThickness = 2) {
    const width = Math.floor(maze[0].length / 2);  // Visual width
    const height = Math.floor(maze.length / 2);    // Visual height
  
    const canvas = createCanvas(width * cellSize, height * cellSize);
    const ctx = canvas.getContext('2d');
  
    // Set the background to white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width * cellSize, height * cellSize);
  
    // Set up drawing style for walls
    ctx.strokeStyle = 'black';
    ctx.lineWidth = wallThickness;
  
    // Loop through each cell and draw the walls based on maze data
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cellX = 2 * x + 1;
        const cellY = 2 * y + 1;
  
        // Check top wall
        if (maze[cellY - 1] && maze[cellY - 1][cellX] === 1) {
          ctx.beginPath();
          ctx.moveTo(x * cellSize, y * cellSize);
          ctx.lineTo((x + 1) * cellSize, y * cellSize);
          ctx.stroke();
        }
  
        // Check bottom wall
        if (maze[cellY + 1] && maze[cellY + 1][cellX] === 1) {
          ctx.beginPath();
          ctx.moveTo(x * cellSize, (y + 1) * cellSize);
          ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
          ctx.stroke();
        }
  
        // Check left wall
        if (maze[cellY] && maze[cellY][cellX - 1] === 1) {
          ctx.beginPath();
          ctx.moveTo(x * cellSize, y * cellSize);
          ctx.lineTo(x * cellSize, (y + 1) * cellSize);
          ctx.stroke();
        }
  
        // Check right wall
        if (maze[cellY] && maze[cellY][cellX + 1] === 1) {
          ctx.beginPath();
          ctx.moveTo((x + 1) * cellSize, y * cellSize);
          ctx.lineTo((x + 1) * cellSize, (y + 1) * cellSize);
          ctx.stroke();
        }
      }
    }
  
    // Calculate robot's position in the simplified grid
    const robotVisualX = Math.floor(robotX / 2);
    const robotVisualY = Math.floor(robotY / 2);
  
    // Draw the robot if it's in an open spot
    // if (maze[robotY][robotX] === 0) {
    ctx.fillStyle = 'red';  // Set color for the robot (can be changed)
    ctx.beginPath();
    ctx.arc(
    robotVisualX * cellSize + cellSize / 2,  // Center X
    robotVisualY * cellSize + cellSize / 2,  // Center Y
    cellSize / 3,                            // Radius
    0, 2 * Math.PI
    );
    ctx.fill();
    // }
  
    return canvas;  // Return the canvas object instead of writing to a file
  }


  module.exports = {
    drawMazeWithRobot
  }