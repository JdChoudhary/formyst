import { describe, expect, it } from "vitest";

import type { FormField } from "@repo/shared";

import {
  answerToLabels,
  formatAnswer,
  hasAnswerValue,
  resolveChoiceLabel,
} from "./answers";

const choice = (ref: string, label: string) => ({ ref, label });

const radioField: FormField = {
  ref: "preference",
  title: "Which option do you prefer?",
  type: "multiple_choice",
  properties: {
    choices: [choice("option_1", "Red"), choice("option_2", "Blue")],
  },
};

const pictureField: FormField = {
  ref: "picture",
  title: "Which picture do you prefer?",
  type: "picture_choice",
  properties: {
    choices: [choice("option_1", "Cat"), choice("option_2", "Dog")],
  },
};

const contactField: FormField = {
  ref: "contact",
  title: "How can we reach you?",
  type: "contact_info",
};

describe("hasAnswerValue", () => {
  it("treats empty containers as unanswered", () => {
    expect(hasAnswerValue({})).toBe(false);
    expect(hasAnswerValue([])).toBe(false);
    expect(hasAnswerValue({ email: "", phone: "" })).toBe(false);
    expect(hasAnswerValue(null)).toBe(false);
    expect(hasAnswerValue(undefined)).toBe(false);
    expect(hasAnswerValue("")).toBe(false);
  });

  it("treats filled containers as answered", () => {
    expect(hasAnswerValue({ email: "a@b.com" })).toBe(true);
    expect(hasAnswerValue(["option_1"])).toBe(true);
    expect(hasAnswerValue(0)).toBe(true);
    expect(hasAnswerValue(false)).toBe(true);
  });
});

describe("resolveChoiceLabel", () => {
  it("maps a stored option ref to the declared label", () => {
    expect(resolveChoiceLabel(radioField, "option_1")).toBe("Red");
    expect(resolveChoiceLabel(pictureField, "option_2")).toBe("Dog");
  });

  it("leaves unknown values untouched", () => {
    expect(resolveChoiceLabel(radioField, "option_9")).toBe("option_9");
    expect(resolveChoiceLabel(contactField, "anything")).toBe("anything");
  });
});

describe("formatAnswer", () => {
  it("renders the choice label instead of the raw option ref", () => {
    expect(formatAnswer("option_1", radioField)).toBe("Red");
    expect(formatAnswer("option_2", pictureField)).toBe("Dog");
  });

  it("renders a contact object as readable key/value text", () => {
    expect(formatAnswer({ firstName: "Ada", email: "ada@example.com" }, contactField)).toBe(
      "First name: Ada · Email: ada@example.com",
    );
  });

  it("renders an unfilled contact object as the empty placeholder", () => {
    expect(formatAnswer({}, contactField)).toBe("—");
  });

  it("joins multi-select answers", () => {
    expect(formatAnswer(["option_1", "option_2"], radioField)).toBe("Red, Blue");
  });

  it("renders booleans and numbers", () => {
    expect(formatAnswer(true)).toBe("Yes");
    expect(formatAnswer(false)).toBe("No");
    expect(formatAnswer(42)).toBe("42");
  });
});

describe("answerToLabels", () => {
  it("groups choice answers by label", () => {
    expect(answerToLabels("option_1", radioField)).toEqual(["Red"]);
    expect(answerToLabels(["option_1", "option_2"], radioField)).toEqual(["Red", "Blue"]);
  });

  it("returns nothing for an empty answer", () => {
    expect(answerToLabels({}, contactField)).toEqual([]);
    expect(answerToLabels("", contactField)).toEqual([]);
  });

  it("returns a readable string for fill-in answers", () => {
    expect(answerToLabels("Ada", contactField)).toEqual(["Ada"]);
  });
});
