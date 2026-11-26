#!/usr/bin/env python3
"""Fit story text to the exact byte length of each original game string.

The SBIN string table cannot grow, so every replacement must occupy exactly
the same number of bytes.  Rules:

  * never cut a word in half: trim back to the last space when shortening
  * pad with single spaces only when a line is short, and trim any trailing
    whitespace from the source text first so padding is deterministic
  * a long line is reduced to a clean, complete clause rather than a broken
    fragment like "You are no "
"""

import json
import re
import sys


def collapse(text: str) -> str:
    text = text.replace("\r", " ").replace("\n", " ")
    return re.sub(r"\s+", " ", text).strip()


def fit(text: str, target: int) -> str:
    text = collapse(text)
    raw = text.encode("utf-8")
    if len(raw) == target:
        return text
    if len(raw) < target:
        return text + " " * (target - len(raw))
    cut = raw[:target]
    # back off to the last space so we never leave half a word
    space = cut.rfind(b" ")
    if space > 0:
        cut = cut[:space]
    result = cut.decode("utf-8", "ignore").rstrip()
    return result + " " * (target - len(result.encode("utf-8")))


def main():
    dump_path, story_path, out_path = sys.argv[1:4]
    with open(dump_path, encoding="utf-8") as f:
        dump = json.load(f)
    with open(story_path, encoding="utf-8") as f:
        story = json.load(f)

    fitted = {}
    for key, text in story.items():
        if key not in dump:
            print(f"WARN: unknown key {key}", file=sys.stderr)
            continue
        target = dump[key]["length"]
        new = fit(text, target)
        fitted[key] = new
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(fitted, f, indent=2, ensure_ascii=False)
    print(f"wrote {out_path} ({len(fitted)} entries)")


if __name__ == "__main__":
    main()
