// SPDX-FileCopyrightText: 2026 Mohammad Allatayfeh
// SPDX-License-Identifier: MPL-2.0

import childProcess from "node:child_process";
import dgram from "node:dgram";
import dns from "node:dns";
import http from "node:http";
import http2 from "node:http2";
import https from "node:https";
import net from "node:net";
import tls from "node:tls";

function blocked(name) {
  return () => {
    throw new Error(`ASSETTREE_NETWORK_EGRESS_BLOCKED:${name}`);
  };
}

for (const [target, names] of [
  [http, ["get", "request"]],
  [https, ["get", "request"]],
  [http2, ["connect"]],
  [net, ["connect", "createConnection"]],
  [tls, ["connect"]],
  [dns, ["lookup", "resolve", "resolve4", "resolve6", "resolveAny", "reverse"]],
  [dgram, ["createSocket"]],
  [childProcess, ["exec", "execFile", "fork", "spawn"]],
]) {
  for (const name of names) target[name] = blocked(name);
}

globalThis.fetch = blocked("fetch");
if ("WebSocket" in globalThis) globalThis.WebSocket = class BlockedWebSocket {
  constructor() {
    throw new Error("ASSETTREE_NETWORK_EGRESS_BLOCKED:WebSocket");
  }
};
