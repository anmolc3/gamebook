# 🚀 Category G: Future Advanced / Research Games

## Overview & Architectural Feasibility Notice
> [!NOTE]
> The titles in Category G represent **Advanced Long-Term Research & Engineering Targets**.
> These titles require fundamentally different networking and rendering paradigms (e.g., authoritative client prediction, server snapshot interpolation at 30-60Hz, lag compensation, 3D physics engines, and UDP/WebRTC transport) compared to turn-based and lightweight WebSocket architectures.
> 
> **They are documented here for platform roadmap completeness and will NOT be implemented in initial platform milestones.**

---

## Game Manifest (Titles 72 – 84)

| # | Game Title | Target Genre | Multiplayer Model | Architectural Complexity |
| :--- | :--- | :--- | :--- | :--- |
| 72 | **Top-Down Racing** | Arcade Racer | 4 - 8 Players | Continuous 2D rigid-body vehicle physics, checkpoint delta sync. |
| 73 | **Kart Racing 3D** | Kart Battle | 4 - 8 Players | Drift mechanics, projectile tracking, track spline interpolation. |
| 74 | **Battle Arena (MOBA-lite)** | Action Arena | 3v3 / 5v5 | Ability cooldowns, area-of-effect hitboxes, lane minions. |
| 75 | **Real-Time Strategy (RTS)** | Strategy | 1v1 / 2v2 | Lockstep determinism, unit pathfinding, fog-of-war calculations. |
| 76 | **Co-op Tower Defense** | Strategy Defense | 2 - 4 Players | Wave scheduling, pathing grids, shared resource economy. |
| 77 | **Platform Battle (Brawler)** | 2D Fighter | 2 - 4 Players | Sub-frame rollback networking, platform ledge grabs, knockback physics. |
| 78 | **Multiplayer Survival** | Survival Sandbox | 2 - 6 Players | Persistent world tiles, hunger/crafting loops, entity synchronization. |
| 79 | **2D Multiplayer Shooter** | Top-down Shooter | 4 - 8 Players | Authoritative raycast hit-scan detection, weapon recoil spread. |
| 80 | **Mini Battle Royale** | Top-down BR | 12 - 20 Players | Shrinking zone circle mechanics, loot spawners, spectator switching. |
| 81 | **Arcade Football / Soccer** | Sports | 2v2 / 3v3 | Ball bounce physics, pass vectors, goal net collision meshes. |
| 82 | **Cricket Multiplayer** | Sports | 1v1 / 2v2 | Bowling pitch timing, batsman shot angle, outfield fielding physics. |
| 83 | **Basketball Street 2v2** | Sports | 2v2 | Hoop physics, shot arc calculations, stamina/steal defense. |
| 84 | **2D Fighting Game** | Martial Arts Duel | 1v1 | Frame-data rollback netcode, input buffering, combo cancel chains. |

---

## Prerequisites for Future Category G Implementation
1. **WebRTC / UDP Transport**: Transitioning from TCP WebSocket to low-latency datagram channels for positional updates.
2. **Client-Side Prediction & Reconciliation**: Simulating local inputs immediately while reconciling authoritative server positions.
3. **Advanced Rendering Layer**: Integration with Three.js / React Native Skia / PixiJS for high-performance 60 FPS graphics.
