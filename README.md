# pi-notifier

Lightweight macOS desktop notifications for [pi](https://github.com/badlogic/pi-mono).

When pi finishes processing and is ready for your next input, you'll get a native macOS notification. Perfect for when pi is running a long task and you're working in another window.

## Features

- **Native macOS notifications** via AppleScript (`osascript`)
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

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Master switch for all notifications |
| `desktop.enabled` | boolean | `true` | Enable/disable desktop notifications |
| `sound.enabled` | boolean | `true` | Enable/disable notification sound |
| `sound.name` | string | `"Glass"` | System sound name (Glass, Hero, Ping, Submarine, etc.) |
| `events.waitingForInput` | boolean | `true` | Notify when pi is ready for input |
| `events.waitingForDecision` | boolean | `true` | Notify when waiting for user decision (future use) |
| `dedupe.minIntervalMs` | number | `2000` | Minimum ms between notifications |
| `messages.waitingForInput.title` | string | `"Pi"` | Notification title |
| `messages.waitingForInput.body` | string | `"Ready for input"` | Notification body |

## Commands

### Test Notification

Send a test notification to verify your configuration:

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

### waitingForDecision

This release includes the configuration and message structure for decision notifications, but does not automatically intercept other extensions' dialogs. Future versions may provide a helper function that extensions can call when awaiting user decisions.

## Sound Notes

Sound playback is best-effort. macOS may ignore the requested sound based on:

- System notification permissions
- Notification Center settings for the app
- Whether the sound name is recognized

Common system sounds: `Glass`, `Hero`, `Ping`, `Submarine`, `Pop`, `Purr`, `Blow`, `Bottle`

## Limitations

- macOS only (uses AppleScript)
- No click-to-focus action (notification is informational only)
- Does not globally intercept all extension dialogs

## Requirements

- macOS
- [pi](https://github.com/badlogic/pi-mono) installed

## License

MIT

## Acknowledgments

Inspired by the `notify.ts` example from the [pi-mono](https://github.com/badlogic/pi-mono) project.
