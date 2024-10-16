const { drawMazeWithRobot } = require('./visual');
const fs = require('fs');
const { createMaze } = require('./mazeGen');


const maze = createMaze(33, 33);

// find open spot on maze
let robot = {x: 1, y: 1};
do  {
  robot.x = Math.floor(Math.random() * maze[0].length);
  robot.y = Math.floor(Math.random() * maze.length);
} while (maze[robot.y][robot.x] === 1)
 
console.log(robot);

const canvas = drawMazeWithRobot(maze, robot.x, robot.y, 30, 5);


// Write the canvas to a file
const out = fs.createWriteStream(__dirname + '/maze.png');
const stream = canvas.createPNGStream();
stream.pipe(out);


for (let i = 1; i < 4; i++) {
// find a random translational offset of 1 that is not a wall
// +1x, -1x, +1y, -1y
const change = {x: 0, y: 0};
do {
    const changeX = Math.floor(Math.random() * 2)
    if (changeX === 1) {
        change.x = [-1, 1][Math.floor(Math.random() * 2)];
        change.y = 0
        // robot.x += change.x
    } else {
        change.y = [-1, 1][Math.floor(Math.random() * 2)];
        change.x = 0
        // robot.y += change.y
    }
} while (maze[robot.y + change.y][robot.x + change.x] === 1)

robot.x += change.x * 2;    
robot.y += change.y * 2;
console.log(robot)

const canvas1 = drawMazeWithRobot(maze, robot.x, robot.y, 30, 5);

// Write the canvas to a file
const out1 = fs.createWriteStream(__dirname + `/maze${i}.png`);
const stream1 = canvas1.createPNGStream();
stream1.pipe(out1);


}
