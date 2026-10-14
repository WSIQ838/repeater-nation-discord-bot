// Keeps the Repeater Nation Discord bot showing as online, with a status like
// "Watching repeaternation.com".
//
// Discord only shows a bot online while a program holds a live connection to
// its Gateway, which the website's backend (short-lived functions) can't do.
// Run this file on anything that stays on: a PC, a Raspberry Pi, or a small
// cloud server. It only sets the bot's presence; the website keeps creating
// the Discord events on its own, with or without this running.
//
// No installs needed: Node.js 22+, Deno or Bun.
//   DISCORD_BOT_TOKEN=... node presence.mjs
// Optional:
//   BOT_STATUS     the status text (default "repeaternation.com")
//   BOT_ACTIVITY   watching | playing | listening | competing (default watching)
//   GATEWAY_URL    only for testing

const env = globalThis.process?.env ?? globalThis.Deno?.env.toObject() ?? {};
const TOKEN = String(env.DISCORD_BOT_TOKEN || '').trim();
const STATUS_TEXT = String(env.BOT_STATUS || 'repeaternation.com').slice(0, 128);
const ACTIVITY = { playing: 0, listening: 2, watching: 3, competing: 5 }[String(env.BOT_ACTIVITY || 'watching').toLowerCase()] ?? 3;
const GATEWAY = String(env.GATEWAY_URL || 'wss://gateway.discord.gg').replace(/\/+$/, '');

// Close codes after which reconnecting can't help.
const FATAL = {
  4004: 'The bot token was rejected. Copy it again from the Developer Portal (Bot > Reset Token).',
  4010: 'Invalid shard.', 4011: 'Sharding required.', 4012: 'Invalid API version.',
  4013: 'Invalid intents.', 4014: 'Disallowed intents.',
};
// Close codes after which the old session can't be resumed.
const FRESH = new Set([4007, 4009]);

const log = (...a) => console.log(new Date().toISOString(), ...a);
const quit = (code) => (globalThis.process ? globalThis.process.exit(code) : globalThis.Deno?.exit(code));

if (!TOKEN) {
  log('Set DISCORD_BOT_TOKEN to the bot token from the Discord Developer Portal.');
  quit(1);
}

let ws = null;
let seq = null;
let sessionId = null;
let resumeUrl = null;
let heartbeat = null;
let acked = true;
let backoff = 1000;

const send = (op, d) => { if (ws?.readyState === 1) ws.send(JSON.stringify({ op, d })); };
const stopHeartbeat = () => { clearTimeout(heartbeat?.first); clearInterval(heartbeat?.every); heartbeat = null; };

function beat() {
  // No answer to the last heartbeat: the connection is dead, so start over.
  if (!acked) { log('No heartbeat reply; reconnecting.'); ws?.close(4000); return; }
  acked = false;
  send(1, seq);
}

function identify() {
  send(2, {
    token: TOKEN,
    intents: 0, // presence only; the bot doesn't read anything
    properties: { os: 'linux', browser: 'repeater-nation', device: 'repeater-nation' },
    presence: { since: null, activities: [{ name: STATUS_TEXT, type: ACTIVITY }], status: 'online', afk: false },
  });
}

function connect(resume) {
  const base = resume && resumeUrl ? resumeUrl.replace(/\/+$/, '') : GATEWAY;
  const socket = new WebSocket(`${base}/?v=10&encoding=json`);
  ws = socket;

  socket.onmessage = (msg) => {
    let p;
    try { p = JSON.parse(typeof msg.data === 'string' ? msg.data : new TextDecoder().decode(msg.data)); } catch { return; }
    if (p.s !== null && p.s !== undefined) seq = p.s;
    switch (p.op) {
      case 10: { // Hello
        const every = Number(p.d?.heartbeat_interval) || 41250;
        stopHeartbeat();
        acked = true;
        heartbeat = { first: setTimeout(() => { beat(); heartbeat.every = setInterval(beat, every); }, Math.floor(every * Math.random())) };
        if (resume && sessionId) send(6, { token: TOKEN, session_id: sessionId, seq });
        else identify();
        break;
      }
      case 11: acked = true; break; // Heartbeat ACK
      case 1: send(1, seq); break; // Heartbeat requested
      case 7: log('Discord asked us to reconnect.'); socket.close(4000); break; // Reconnect
      case 9: // Invalid session
        if (!p.d) { sessionId = null; seq = null; }
        setTimeout(() => socket.close(p.d ? 4000 : 4900), 1000 + Math.random() * 4000);
        break;
      case 0: // Dispatch
        if (p.t === 'READY') {
          sessionId = p.d?.session_id || null;
          resumeUrl = p.d?.resume_gateway_url || null;
          backoff = 1000;
          log(`Online as ${p.d?.user?.username || 'the bot'} (${['Playing', '', 'Listening to', 'Watching', '', 'Competing in'][ACTIVITY]} ${STATUS_TEXT}).`);
        } else if (p.t === 'RESUMED') {
          backoff = 1000;
          log('Reconnected.');
        }
        break;
    }
  };

  socket.onerror = () => {}; // a close event always follows

  socket.onclose = (e) => {
    if (ws !== socket) return;
    stopHeartbeat();
    if (FATAL[e.code]) { log(`Discord closed the connection (${e.code}): ${FATAL[e.code]}`); quit(1); return; }
    if (FRESH.has(e.code) || e.code === 4900) { sessionId = null; seq = null; }
    const canResume = !!sessionId;
    log(`Connection closed (${e.code || 'no code'}); reconnecting in ${Math.round(backoff / 1000)}s.`);
    setTimeout(() => connect(canResume), backoff);
    backoff = Math.min(backoff * 2, 60_000);
  };
}

connect(false);
