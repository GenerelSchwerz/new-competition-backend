import WebSocket from "ws"

export type LocalData= Record<string, {
    wsList: WebSocket[],
    grid: number[][],
    robotPositions: Array<{ x: number, y: number }>,
    key: string
}>

export type C2SWsMsgTypes = "move" | "stop"
export type S2CWsMsgTypes = "moveUpdate"

export type WsMoveType = "up" | "down" | "left" | "right"

export type C2SWsMapping = {
    "move": {id: number, moves: Record<string, WsMoveType>}
}

export type S2CWsMapping = {
    "moveUpdate": {id: number, positions: Array<{x: number, y: number}>}
    "moveFailure": {id: number, positions: Array<{x: number, y: number}>, reasons: Array<string>}
}

export type C2SWsMsg<T extends keyof C2SWsMapping = keyof C2SWsMapping> = {
    type: T,
    data: C2SWsMapping[T]
}

export type S2CWsMsg<T extends keyof S2CWsMapping = keyof S2CWsMapping> = {
    type: T,
    data: S2CWsMapping[T]
}

