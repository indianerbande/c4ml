/**
 * The packaged smoke inserts this through Electron's typed-input path.
 * Monaco supplies indentation after each newline, so source-provided leading
 * whitespace would be added on top and produce a cumulative indentation stair.
 */
export const desktopSmokeSourceForTypedInput = [
  "c4ml draft-1",
  "",
  "model {",
  "system smoke-system {",
  'name = "Smoke System"',
  'responsibility = "Validates the packaged desktop compiler and preview."',
  "classification = internal",
  "}",
  "}",
  "",
  "view smoke-context {",
  "type = system-context",
  "scope = smoke-system",
  'title = "System Context — Smoke System"',
  'purpose = "Validates the packaged desktop compiler and preview."',
  "audience = default",
  "legend = generated",
  "}",
  "",
].join("\n");
