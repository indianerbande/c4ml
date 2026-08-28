#!/usr/bin/env node

import { runCli } from "./cli.js";

const args = process.argv.slice(2);
process.exitCode = await runCli(args[0] === "--" ? args.slice(1) : args);
