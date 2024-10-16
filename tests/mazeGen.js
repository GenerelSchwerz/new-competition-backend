// client sided maze generation
function createMaze(x, y) {
    // Initialize the grid with walls (1s)
    const maze = Array.from({ length: y }, () => Array.from({ length: x }, () => 1));
  
    // Generate random odd starting point within the grid (must be odd to avoid boundary issues)
    let startX = Math.floor(Math.random() * Math.floor(x / 2)) * 2 + 1;
    let startY = Math.floor(Math.random() * Math.floor(y / 2)) * 2 + 1;

    console.log(maze.length, maze[0].length, startX, startY)
    maze[startY][startX] = 0; // Start point as open
  
    // Possible movements (up, down, left, right)
    const directions = [
      [-2, 0], [2, 0], [0, -2], [0, 2]
    ];
  
    function inBounds(nx, ny) {
      return nx > 0 && nx < x - 1 && ny > 0 && ny < y - 1;
    }
  
    function carvePath(px, py) {
      // Shuffle directions to randomize path carving
      directions.sort(() => Math.random() - 0.5);
  
      for (const [dx, dy] of directions) {
        let nx = px + dx;
        let ny = py + dy;
  
        if (inBounds(nx, ny) && maze[ny][nx] === 1) {
          // Carve through walls to create a path
          maze[ny][nx] = 0;
          maze[py + dy / 2][px + dx / 2] = 0; // Carve the connecting wall
          carvePath(nx, ny); // Recur on new cell
        }
      }
    }
  
    // Start carving paths from the random start point
    carvePath(startX, startY);
  
    return maze;
  }
  
  // for walls, print '█ and for empty print ' '
  // for highlighted coordinates, print 'X
  function printMaze(maze, ...highlightPositions) {
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

  module.exports = {
    createMaze,
    printMaze
  }