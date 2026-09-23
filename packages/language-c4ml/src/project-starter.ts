/** Fixed source fragments for a new explicit project; no architecture is invented. */
export const c4mlProjectStarter = {
  directories: ["model", "relations", "views", "docs"],
  documents: [
    { uri: "model/architecture.c4ml", text: "c4ml draft-1\n\nmodel {\n}\n" },
    { uri: "relations/relationships.c4ml", text: "c4ml draft-1\n\nrelations {\n}\n" },
    { uri: "views/views.c4ml", text: "c4ml draft-1\n" },
  ],
} as const;
