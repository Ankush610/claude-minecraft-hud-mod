# minecraft-hud

A Claude Code mod that shows your usage as a Minecraft HUD above the prompt.

![preview](assets/preview.png)

| HUD | Shows |
| --- | --- |
| ❤️ Health | 5-hour session limit remaining |
| 🍗 Food | Weekly limit remaining |
| 🟩 XP bar + level | Context window used (%) |

Drawn as real pixels on terminals with the kitty graphics protocol (Ghostty, kitty).
In the Claude desktop app (and VS Code, mobile) it switches to two plain progress
bars, 5-hour and weekly usage with time to reset, that stretch with the window;
context is left out there since the desktop sidebar already shows it.
Health, food and the usage bars need a Claude subscription.

## Install

In a Claude Code terminal session:

```
/plugin install minecraft-hud --marketplace Ankush610/claude-minecraft-hud-mod
```

Answer `y` to add the marketplace, then press Enter for the user scope.

## Use

- `/hud` hides or shows the HUD.
- The `[-]` beside the HUD collapses it with a click, but only in Claude Code's
  fullscreen layout (`/tui fullscreen`); the classic layout doesn't receive mouse
  clicks. `/tui default` switches back.
- HUD squashed, clipped, or with a gap under it? Adjust `CELL_ASPECT`
  (terminal cell height ÷ width) in `hooks/register.tsx`.

## Develop

```
claude --plugin-dir .          # run with the mod loaded
claude plugin validate .
claude plugin test .
```
