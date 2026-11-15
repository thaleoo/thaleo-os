---
title: Cista
summary: Encrypted password manager for the terminal
status: active
stack: Rust, Ratatui
repo: https://github.com/thaleoo/cista
order: 1
---

One encrypted file. No server, no account.

- Argon2id key derivation, XChaCha20-Poly1305 encryption
- Secrets zeroised in memory, clipboard clears itself
- CLI, interactive session and TUI over one core crate

```
password → Argon2id → key → XChaCha20-Poly1305 → vault.cista
```
