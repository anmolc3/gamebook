# 🃏 Category B: Card Games (Virtual & Play-Money Only)

## Strict Non-Gambling Policy
> [!IMPORTANT]
> **NO REAL-MONEY GAMBLING.**
> - Zero real-money deposits, withdrawals, or real-money wagering.
> - No gambling currency conversion or payout systems.
> - Card games utilize virtual non-monetary chips, score tallies, or purely recreational play.

---

## Game Manifest

| # | Game Title | ID | Min/Max Players | Turn Time | Rules Summary |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 15 | **Color Match Clash (UNO-style)** | `UNO_STYLE` | 2 / 4 | 15s | Match card color or number, play Wild and Skip action cards, call out on final card. |
| 16 | **Hearts** | `HEARTS` | 4 / 4 | 20s | 4-player trick-taking game avoiding penalty hearts and the 13-point Queen of Spades. |
| 17 | **Spades** | `SPADES` | 4 / 4 | 20s | 2v2 partnership trick-taking with contract bidding and Spades as permanent trumps. |
| 18 | **Indian Rummy** | `RUMMY` | 2 / 6 | 30s | 13-card meld game forming pure sequences, impure sequences, and sets. |
| 19 | **Gin Rummy** | `GIN_RUMMY` | 2 / 2 | 20s | Fast 2-player classic rummy minimizing deadwood points with knock and gin declarations. |
| 20 | **Crazy Eights** | `CRAZY_EIGHTS` | 2 / 4 | 15s | Shed cards onto the discard pile by suit or rank; 8s are wild suit-changers. |
| 21 | **Go Fish** | `GO_FISH` | 2 / 4 | 15s | Ask opponents for matching card ranks to complete books of four cards. |
| 22 | **War Card Duel** | `WAR` | 2 / 2 | 10s | Rapid high-card battle duel; ties trigger high-stakes 3-card war face-offs. |
| 23 | **Durak** | `DURAK` | 2 / 4 | 20s | Attackers and defenders match ranks with a designated trump suit to avoid being the fool. |
| 24 | **President / Scum** | `PRESIDENT` | 3 / 6 | 15s | Trick-climbing hierarchy game where first to empty hand becomes President. |
| 25 | **Blackjack** | `BLACKJACK` | 1 / 5 | 20s | Virtual play-money chip game hitting, standing, or doubling down against dealer to 21. |
| 26 | **Texas Hold’em Poker** | `POKER` | 2 / 6 | 30s | Virtual play-money social poker with community cards, blinds, and hand showdowns. |

---

## Reusable Card Engine Standard (`shared/card-engine/`)
All Category B games share the core card module:
- `Deck`: 52 standard playing cards + optional jokers.
- `Shuffle`: Cryptographically random Fisher-Yates array permutation.
- `Hand`: Private player hands obscured from socket broadcasts (players only receive their own card IDs).
- `DiscardPile & DrawPile`: Central table card stacks.
- `MeldValidator`: Sequence and set validation algorithms.
