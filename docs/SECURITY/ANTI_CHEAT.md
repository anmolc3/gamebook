# 🛡️ Anti-Cheat & Fair Play Architecture

## Threat Vectors & Countermeasures
1. **Manipulated Dice Rolls**:
   - *Attack*: Client injects desired roll number (e.g. 6).
   - *Defense*: Rolls generated purely server-side with Node `crypto.randomInt(1, 7)`.
2. **Move Hijacking**:
   - *Attack*: Client submits move out of turn or for opponent.
   - *Defense*: Server validates `action.playerId === state.activePlayerId`.
3. **Invalid Board Placement**:
   - *Attack*: Moving token 8 steps instead of 4.
   - *Defense*: Server tracks authoritative board indices and applies movement mathematics internally.
4. **Desync Exploits**:
   - *Attack*: Client fakes lag or drops socket right before loss.
   - *Defense*: Turn clock continues regardless of client connection; 30s timeout declares forfeit.
