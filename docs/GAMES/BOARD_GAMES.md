# 🎲 Category A: Core Board Games

## Overview
Category A contains 14 traditional and competitive board games. All titles feature server-authoritative turn validation, move clocks, anti-cheat coordinate checks, and match history tracking.

---

## Game Manifest

| # | Game Title | ID | Min/Max Players | Turn Time | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | **Tic-Tac-Toe** | `TICTACTOE` | 2 / 2 | 15s | Classic 3x3 turn-based grid duel with instant win/draw line detection. |
| 2 | **Ludo World Arena** | `LUDO` | 2 / 4 | 20s | 2-4 player board game with server dice rolls, safe zones, and home run tokens. |
| 3 | **Chess Grandmaster** | `CHESS` | 2 / 2 | 60s | Standard FIDE chess rules with move timers, checkmate detection, and draw offers. |
| 4 | **Checkers / Draughts** | `CHECKERS` | 2 / 2 | 30s | Diagonal jumping, mandatory captures, and kinging board mechanics. |
| 5 | **Connect Four** | `CONNECT_FOUR` | 2 / 2 | 20s | Vertical disc-dropping gravity grid with 4-in-a-row detection across all angles. |
| 6 | **Carrom Board** | `CARROM` | 2 / 4 | 25s | Pocket carrom men and the queen using server-simulated flick angle and velocity. |
| 7 | **Snakes & Ladders** | `SNAKES_AND_LADDERS` | 2 / 4 | 15s | Board race with server-side dice rolls, ladder climbs, and slide penalties. |
| 8 | **Backgammon** | `BACKGAMMON` | 2 / 2 | 30s | Ancient tactical checker race using dual dice rolls and bear-off mechanics. |
| 9 | **Reversi / Othello** | `REVERSI` | 2 / 2 | 25s | Trap opponent discs between your pieces to flip colors across an 8x8 grid. |
| 10 | **Gomoku** | `GOMOKU` | 2 / 2 | 20s | Five-in-a-row placement duel on a 15x15 Go board without captures. |
| 11 | **Battleship Fleet Command** | `BATTLESHIP` | 2 / 2 | 25s | Secret ship placement on 10x10 grids with hidden coordinate bombardment. |
| 12 | **Dominoes Duel** | `DOMINOES` | 2 / 4 | 20s | Tile-laying strategy matching identical end pip counts with block/draw rules. |
| 13 | **Mancala** | `MANCALA` | 2 / 2 | 20s | Ancient count-and-capture pebble game across 12 pits and 2 home stores. |
| 14 | **Chinese Checkers** | `CHINESE_CHECKERS` | 2 / 6 | 25s | Hexagram star board race hopping marbles into the opposing corner destination. |

---

## Shared Technical Standard
- **State Representation**: Pure array or coordinate matrix serialized into PostgreSQL `GameResult.finalState`.
- **Clock Engine**: Strict turn timer with forfeit on consecutive timeouts.
- **Spectator Support**: All Category A games support real-time spectator view over `room:${code}` with disabled action inputs.
