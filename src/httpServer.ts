/**
 * We want a server that listens to the endpoint: /init
 * From init, we will retuyrn to the user a session id (which is the unix timestamp)
 *
 *
 */

import express from "express";
import bodyParser from "body-parser";
import { LocalData } from "./types";

export function createHttpServer(tempLocalData: LocalData): express.Application {
  const app = express();
  app.use(bodyParser.json());

  // this should receive a map of 8x8 grid data
  app.post("/init", (req, res) => {
    const grid = req.body.grid;
    const robotCount = req.body.robotCount;

    // validate grid
    // grid can be of arbitrary (odd) dimensions, but must be an array of arrays and only contain 0s and 1s

    if (!Array.isArray(grid)) {
      res.status(400).json({ error: "Grid must be an array of arrays" });
      return;
    }

    const rows = grid.length;
    if (rows % 2 === 0) {
      console.log(grid);
      res.status(400).json({ error: "Grid must have an odd number of rows" });
      return;
    }

    const cols = grid[0].length;
    if (cols % 2 === 0) {
      res.status(400).json({ error: "Grid must have an odd number of columns" });
      return;
    }

    const valid = grid.every((row) => {
      return Array.isArray(row) && row.every((cell) => cell === 0 || cell === 1);
    });

    if (!valid) {
      res.status(400).json({ error: "Grid must only contain 0s and 1s" });
      return;
    }


    // same logic as above, except all must be odd (Both x and y)
    const positions = []
    for (let i = 0; i < robotCount; i++) {
      let y = Math.floor(Math.random() * rows);
      let x = Math.floor(Math.random() * cols);

      // continue trying until the selected row/column is a 0 (open space)
      while (grid[y][x] === 1 || x % 2 === 0 || y % 2 === 0) {
        y = Math.floor(Math.random() * rows);
        x = Math.floor(Math.random() * cols);
      }

      positions.push({ x, y });
    }

    // now generate a random key to be given to the user who made this request.
    // only the initializer of this simulation should have access to this key.
    // the sessionId can be shared for spectators to use.

    // AI generated code for now
    const key = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const sessionId = Date.now();
    tempLocalData[sessionId] = { grid, robotPositions: positions, key, wsList: [] };

    res.json({ sessionId, key });
  });

  app.post("/stop", (req, res) => {
    const sessionId = req.body.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId is required" });
      return;
    }
    delete tempLocalData[sessionId];
    res.json({ sessionId });
  });

  return app;
}
