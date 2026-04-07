# pi-notifier

Lightweight macOS desktop notifications for [pi](https://github.com/badlogic/pi-mono).

When pi finishes processing and is ready for your next input, you'll get a native macOS notification. Perfect for when pi is running a long task and you're working in another window.

Current notification format for `waitingForInput`:
- **title**: `pi-notification-<session_info>`
- **content**: pi 最后一轮输出内容（会自动压缩空白并截断）

## Features

- **Native macOS notifications** via AppleScript (`osascript`)
- **Telegram bot notifications** via configurable bot token + chat ID
- **Configurable sound** - choose from system sounds like Glass, Hero, Ping, Submarine
- **Deduplication** - prevents notification spam with configurable minimum interval
- **Zero dependencies** - lightweight, no runtime dependencies required
- **Per-project config** - override global settings per project

## Installation

### Quick Test

Load temporarily without installing:

```bash
pi --extension /path/to/pi-notifier/extensions/notifier.ts
```

### Install as pi Package

Globally:

```bash
pi install /path/to/pi-notifier
```

Project-local (shareable with your team):

```bash
pi install -l /path/to/pi-notifier
```

## Configuration

Create a config file at `~/.pi/agent/pi-notifier.json` (global) or `.pi/pi-notifier.json` (project).

Project config overrides global config.

### Example Configuration

```json
{
  "enabled": true,
  "desktop": {
    "enabled": true
  },
  "telegram": {
    "enabled": false,
    "botToken": "123456:your-bot-token",
    "chatId": "123456789"
  },
  "sound": {
    "enabled": true,
    "name": "Glass"
  },
  "events": {
    "waitingForInput": true,
    "waitingForDecision": true
  },
  "dedupe": {
    "minIntervalMs": 2000
  },
  "messages": {
    "waitingForInput": {
      "title": "Pi",
      "body": "Ready for input"
    }
  }
}
```

> 注意：`waitingForInput` 的实际通知标题和正文现在会动态生成。配置里的 `messages.waitingForInput.title/body` 仅作为无法获取最后一轮输出时的兜底文案。

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Master switch for all notifications |
| `desktop.enabled` | boolean | `true` | Enable/disable desktop notifications |
| `telegram.enabled` | boolean | `false` | Enable/disable Telegram bot notifications |
| `telegram.botToken` | string | `undefined` | Telegram bot token from BotFather |
| `telegram.chatId` | string | `undefined` | Target chat ID / user ID / group ID |
| `telegram.apiBaseUrl` | string | `"https://api.telegram.org"` | Optional Telegram API base URL override |
| `sound.enabled` | boolean | `true` | Enable/disable notification sound |
| `sound.name` | string | `"Glass"` | System sound name (Glass, Hero, Ping, Submarine, etc.) |
| `events.waitingForInput` | boolean | `true` | Notify when pi is ready for input |
| `events.waitingForDecision` | boolean | `true` | Notify when waiting for user decision (future use) |
| `dedupe.minIntervalMs` | number | `2000` | Minimum ms between notifications |
| `messages.waitingForInput.title` | string | `"Pi"` | Fallback title only; normal waitingForInput notifications use `pi-notification-<session_info>` |
| `messages.waitingForInput.body` | string | `"Ready for input"` | Fallback body only; normal waitingForInput notifications use the last Pi output |

## Commands

### Test Notification

Send a test notification to verify your configuration (desktop and/or Telegram):

```text
/pi-notifier-test
/pi-notifier-test decision
```

### Show Status

Display current configuration and effective settings:

```text
/pi-notifier-status
```

## How It Works

### waitingForInput

Triggered when pi's agent finishes processing (via the `agent_end` event). This is the primary use case: you start a long-running task, switch to another app, and get notified when pi is ready for your next instruction.

For this event, the notifier now builds the message dynamically:
- title = `pi-notification-<session_info>`
- body = the last assistant output from Pi

If no assistant output can be extracted, it falls back to the configured `messages.waitingForInput.body` value.

### waitingForDecision

This release includes the configuration and message structure for decision notifications, but does not automatically intercept other extensions' dialogs. Future versions may provide a helper function that extensions can call when awaiting user decisions.

## Sound Notes

Sound playback is best-effort. macOS may ignore the requested sound based on:

- System notification permissions
- Notification Center settings for the app
- Whether the sound name is recognized

Common system sounds: `Glass`, `Hero`, `Ping`, `Submarine`, `Pop`, `Purr`, `Blow`, `Bottle`

## Telegram Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the bot token
2. Start a chat with the bot (or add it to a group)
3. Obtain the target `chatId`
   - personal chat usually is your numeric user ID
   - group chat usually is a negative number
4. Add the config:

```json
{
  "telegram": {
    "enabled": true,
    "botToken": "123456:your-bot-token",
    "chatId": "123456789"
  }
}
```

When enabled, notifier sends:

```text
pi-notification-<session_info>
<last assistant output>
```

## Limitations

- Desktop notifications are macOS only (uses AppleScript)
- Telegram notifications require outbound network access and valid bot permissions
- No click-to-focus action (notification is informational only)
- Does not globally intercept all extension dialogs

## Requirements

- macOS
- [pi](https://github.com/badlogic/pi-mono) installed

## License

MIT

## Acknowledgments

Inspired by the `notify.ts` example from the [pi-mono](https://github.com/badlogic/pi-mono) project.
