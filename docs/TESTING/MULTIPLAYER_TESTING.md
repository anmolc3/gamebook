# 🎮 Multiplayer Concurrency Testing Guide

## Protocol
- Utilize headless automated socket test scripts simulating 2-4 concurrent players.
- Verify:
  - Strict turn alternation.
  - Zero state divergence between participating sockets.
  - Dice roll broadcasting to all room members simultaneously.
  - Post-match win detection and database record creation.
