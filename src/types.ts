import WebSocket from "ws"

export type LocalData= Record<string, {
    wsList: WebSocket[],
    grid: number[][],
    robotPositions: Array<{ x: number, y: number }>,
    key: string
}>
export type SimWsMsg = {
    type: string,
    data: any
}