# Repeater Nation Discord bot

Keeps the Repeater Nation Discord bot showing as **online**.

Discord shows a bot as **online** only while a program stays connected to it.
The website's backend runs in short bursts and can't stay connected, so the
bot shows offline. That's only cosmetic: the website creates, updates and
removes the Discord events by itself either way.

`presence.mjs` is that always-connected program. It signs the bot in with the
status **Watching repeaternation.com**, keeps the connection alive, and
reconnects on its own after network drops or Discord restarts. It reads
nothing from your server (no intents) and needs no installs beyond Node.js.

You need the same bot token you saved in Base44 as `DISCORD_BOT_TOKEN`
(Discord Developer Portal → your app → **Bot** → **Reset Token** if you no
longer have it; then update the Base44 secret too). Keep it private.

Run it on **one** thing that stays on. Pick one:

## A. A Windows PC that stays on

1. Install **Node.js 22 LTS** or newer from <https://nodejs.org>.
2. Download this repository (green **Code** button → **Download ZIP**) and
   unzip it somewhere permanent, e.g. `Documents\repeater-nation-discord-bot`.
3. Create `token.txt` in the folder containing only the bot token.
4. Double-click `start-windows.bat`. The window should say
   `Online as <bot name>`, and the bot turns green in Discord.
5. To start it automatically: press **Win + R**, type `shell:startup`, and put
   a shortcut to `start-windows.bat` in the folder that opens.

The bot stays online while that window is open and the PC is awake (set the
PC not to sleep).

## B. Raspberry Pi or any Linux machine

```sh
# Node.js 22+ (Raspberry Pi OS / Debian / Ubuntu)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

git clone https://github.com/WSIQ838/repeater-nation-discord-bot.git
sudo mkdir -p /opt/discord-bot && sudo cp repeater-nation-discord-bot/presence.mjs /opt/discord-bot/
echo 'DISCORD_BOT_TOKEN=paste-the-token-here' | sudo tee /etc/discord-bot.env
sudo chmod 600 /etc/discord-bot.env

sudo tee /etc/systemd/system/discord-bot.service >/dev/null <<'UNIT'
[Unit]
Description=Repeater Nation Discord bot presence
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/etc/discord-bot.env
ExecStart=/usr/bin/node /opt/discord-bot/presence.mjs
Restart=on-failure
RestartSec=10
# Exit code 1 = token rejected; restarting won't help.
RestartPreventExitStatus=1
DynamicUser=yes

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl enable --now discord-bot
journalctl -u discord-bot -f   # should show "Online as ..."
```

## C. A cloud host (no computer of your own)

Any host that runs a Docker container 24/7 works (Railway, Fly.io, Render
background worker, a small VPS, …).

1. Point the host at this repository. It has a `Dockerfile` (and a
   `package.json` whose `npm start` runs the bot, for hosts that use that).
2. Add an environment variable `DISCORD_BOT_TOKEN` with the token.
3. Deploy it as a **worker / background service** (it doesn't serve a web
   page, so don't set up a port or health check URL).

## Options

| Variable | Default | |
|---|---|---|
| `DISCORD_BOT_TOKEN` | — | Required. |
| `BOT_STATUS` | `repeaternation.com` | The status text. |
| `BOT_ACTIVITY` | `watching` | `watching`, `playing`, `listening` or `competing`. |

Run only one copy at a time.

## Updating

Download or `git pull` the latest version and restart it (close and reopen
the window on Windows; `sudo systemctl restart discord-bot` on Linux).

## Checking it

`npm run check` checks the file for mistakes without connecting to Discord.
