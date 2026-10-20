# Deeper, not bigger

Source: Felix Rieseberg (eng lead on Claude), 13 Oct 2026, via @cgtwts. Shaan, 15 Oct: "distill this into a reusable prompt for me".
His four kinds of ambition: **Speed** (same work, faster), **Altitude** (aim at the outcome, not the task), **Depth** (work
the way a field-leading expert would, at the layer of raw data, tools and problems) and **Range** (bring in fields the task
doesn't obviously need). This prompt pushes the last three. Paste it after any task.

---

```
Make this deeper, not bigger. Before you start, answer in a few lines each:

1. Expert: what would the best person in this field do here that I haven't asked for?
2. Raw material: what is the rawest source they'd start from (the data, the code, the logs, the original words),
   instead of the summary I gave you?
3. Methods: which specific methods and tools would they use?
4. Range: which other field has a tool or idea that fits this better than the obvious one?
5. Outcome: one level up, what is this task really for, and is there a better way to get that?
6. Proof: what, other than you or me, would show the result is right (a test, a measurement, a real user,
   a number from the source)?

Then rewrite my request to ask for exactly that, show me the rewrite, and do it.
```
