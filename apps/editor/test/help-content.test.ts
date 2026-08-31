import { describe, expect, it } from "vitest";

import {
  helpCategories,
  helpTopic,
} from "../src/app/help-content.js";

describe("local handbook content", () => {
  it("exposes every executable help topic in English and German", () => {
    const english = helpCategories("en").flatMap(({ topics }) => topics);
    const german = helpCategories("de").flatMap(({ topics }) => topics);

    expect(english.map(({ id }) => id)).toEqual(german.map(({ id }) => id));
    expect(english).toHaveLength(12);
    expect(english.every(({ status }) => status === "available")).toBe(true);
    expect(helpTopic("de", "routes").title).toBe(
      "Ports, Korridore und Routen",
    );
  });

  it("searches localized titles, summaries, and keywords deterministically", () => {
    expect(
      helpCategories("de", "datenbank").flatMap(({ topics }) =>
        topics.map(({ id }) => id),
      ),
    ).toEqual(["containers"]);
    expect(
      helpCategories("en", "cursor syntax").flatMap(({ topics }) =>
        topics.map(({ id }) => id),
      ),
    ).toEqual([]);
    expect(
      helpCategories("en", "corridor").flatMap(({ topics }) =>
        topics.map(({ id }) => id),
      ),
    ).toEqual(["routes"]);
  });

  it("keeps examples local and free of external asset references", () => {
    const examples = helpCategories("en")
      .flatMap(({ topics }) => topics)
      .flatMap(({ example }) => (example === undefined ? [] : [example]));

    expect(examples.length).toBeGreaterThan(0);
    expect(examples.every((example) => !/https?:\/\//u.test(example))).toBe(
      true,
    );
  });

  it("localizes descriptive example fields without translating syntax or identifiers", () => {
    const englishById = new Map(
      helpCategories("en")
        .flatMap(({ topics }) => topics)
        .map((topic) => [topic.id, topic.example] as const),
    );
    const germanTopics = helpCategories("de").flatMap(({ topics }) => topics);
    const descriptiveValue =
      /^\s*(?:name|responsibility|intent|title|purpose)\s*=\s*"([^"]+)"/gmu;

    for (const germanTopic of germanTopics) {
      const englishExample = englishById.get(germanTopic.id);
      if (englishExample === undefined || germanTopic.example === undefined) {
        continue;
      }
      const englishValues = [...englishExample.matchAll(descriptiveValue)].map(
        ([, value]) => value,
      );
      if (englishValues.length === 0) {
        continue;
      }

      expect(germanTopic.example).not.toBe(englishExample);
      for (const englishValue of englishValues) {
        expect(germanTopic.example).not.toContain(`"${englishValue}"`);
      }
    }

    expect(helpTopic("de", "getting-started").example).toContain(
      'responsibility = "Plant und prüft die Gartenarbeit."',
    );
    expect(helpTopic("de", "getting-started").example).toContain(
      "relation gardener-reviews-plan",
    );
  });
});
