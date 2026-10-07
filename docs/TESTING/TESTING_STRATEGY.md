# 🧪 Testing Strategy & Philosophy

## Test Pyramid
1. **Unit Tests**: Pure game engines (Tic-Tac-Toe win evaluator, Ludo track move calculator, dice generator).
2. **Integration Tests**: API controllers, authentication flows, Prisma query logic.
3. **Multiplayer Concurrency Tests**: Mock Socket.IO clients acting as 2-4 simultaneous players verifying turn sequence, dice rolls, and disconnect reconciliation.
4. **End-to-End & Device Tests**: UI smoke testing across varying Android viewport resolutions.
