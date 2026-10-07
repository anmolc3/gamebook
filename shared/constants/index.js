"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SYSTEM_CONSTANTS = void 0;
exports.SYSTEM_CONSTANTS = {
    ROOM_CODE_LENGTH: 6,
    DISCONNECT_GRACE_PERIOD_MS: 30000, // 30 seconds
    TICTACTOE_TURN_TIMEOUT_MS: 15000, // 15 seconds
    LUDO_TURN_TIMEOUT_MS: 20000, // 20 seconds
    STORY_EXPIRATION_HOURS: 24,
    MAX_CHAT_MESSAGE_LENGTH: 1000,
    PASSWORD_MIN_LENGTH: 8,
    USERNAME_REGEX: /^[a-zA-Z0-9_]{3,20}$/,
};
