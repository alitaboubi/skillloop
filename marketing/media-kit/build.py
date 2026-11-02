"""Build the Media Studio Kit outputs from kit.yaml.

  python3 marketing/media-kit/build.py

Writes KIT.md (readable index) and graphify-out/graph.json (graphify node-link format), then runs
`graphify cluster-only` so `graphify query --graph marketing/media-kit/graphify-out/graph.json "…"` works.
No LLM is involved: every node and edge comes from kit.yaml, so all edges are EXTRACTED.
"""
import json, re, subprocess, sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
SRC = "marketing/media-kit/kit.yaml"
kit = yaml.safe_load((HERE / "kit.yaml").read_text(encoding="utf-8"))

nodes, links = [], []
ids = set()


def norm(s): return re.sub(r"\s+", " ", re.sub(r"[^\w\s-]", " ", s.lower())).strip()


def node(kind, item, label, text):
    nid = f"kit_{kind}_{item['id']}"
    ids.add(nid)
    nodes.append({"id": nid, "label": label, "norm_label": norm(label), "kind": kind, "file_type": "concept" if kind != "lesson" else "rationale",
                  "description": text, "source_file": SRC, "source_location": item["id"], "_origin": "kit"})
    return nid


def link(a, b, rel):
    if a in ids and b in ids:
        links.append({"source": a, "target": b, "relation": rel, "confidence": "EXTRACTED", "confidence_score": 1.0,
                      "_origin": "kit", "source_file": SRC, "weight": 1.0})
    else:
        sys.exit(f"kit.yaml: unknown reference {b if a in ids else a} ({rel})")


for st in kit["stages"]:
    node("stage", st, f"Stage: {st['name']}", st["does"])
for t in kit["tools"]:
    extra = " ".join(f"{k}: {t[k]}" for k in ("usage", "limits", "license") if t.get(k))
    node("tool", t, t["name"], f"[{t['status']}] {t['does']} {extra}".strip())
for r in kit["recipes"]:
    node("recipe", r, f"Recipe: {r['title']}", f"Problem: {r['problem']} Steps: " + " | ".join(r["steps"]))
for l in kit["lessons"]:
    node("lesson", l, f"Lesson: {l['id'].replace('_', ' ')}", l["text"])
for e in kit["episodes"]:
    node("episode", e, f"Episode: {e['title']}", f"{e['path']} — {e['date']} — {e['result']}")

for t in kit["tools"]:
    for st in t.get("stages", []): link(f"kit_tool_{t['id']}", f"kit_stage_{st}", "used_in")
for r in kit["recipes"]:
    rid = f"kit_recipe_{r['id']}"
    link(rid, f"kit_stage_{r['stage']}", "step_of")
    for t in r.get("uses", []): link(rid, f"kit_tool_{t}", "uses")
    for l in r.get("learned_from", []): link(rid, f"kit_lesson_{l}", "learned_from")
for l in kit["lessons"]:
    for t in l.get("applies_to", []): link(f"kit_lesson_{l['id']}", f"kit_tool_{t}", "applies_to")
for e in kit["episodes"]:
    for r in e["recipes"]: link(f"kit_episode_{e['id']}", f"kit_recipe_{r}", "applied")

out = HERE / "graphify-out"
out.mkdir(exist_ok=True)
(out / "graph.json").write_text(json.dumps({"directed": False, "multigraph": False, "graph": {}, "nodes": nodes, "links": links, "hyperedges": []},
                                           ensure_ascii=False, indent=1), encoding="utf-8")

# ── KIT.md ──
md = ["# SkillLoop Media Studio Kit", "", "_Generated from `kit.yaml` by `build.py` — edit the YAML, not this file._", "",
      "Query it: `graphify query --graph marketing/media-kit/graphify-out/graph.json \"how do I fix a wrong word?\"`", "",
      "## Machine", ""] + [f"- **{k}**: {v}" for k, v in kit["machine"].items()] + ["", "## Workflow", ""]
for st in kit["stages"]:
    rs = [r for r in kit["recipes"] if r["stage"] == st["id"]]
    md.append(f"{len([x for x in md if x.startswith('### ')]) + 1 if False else ''}### {st['name']}")
    md.append(st["does"])
    for r in rs: md.append(f"- [{r['title']}](#{r['id']})")
    md.append("")
md += ["## Tools", "", "| Tool | Status | What for | Limits |", "|---|---|---|---|"]
for t in kit["tools"]:
    name = f"[{t['name']}]({t['url']})" if t.get("url") else t["name"]
    md.append(f"| {name} | {t['status']} | {t['does']} | {t.get('limits', '')} |")
md += ["", "## Recipes", ""]
for r in kit["recipes"]:
    md += [f'<a id="{r["id"]}"></a>', f"### {r['title']}", f"_Problem:_ {r['problem']}  ", f"_Tools:_ {', '.join(r['uses']) or '—'}", ""]
    md += [f"{i}. {s}" for i, s in enumerate(r["steps"], 1)]
    if r.get("learned_from"): md.append(f"\n_Lessons:_ {', '.join(r['learned_from'])}")
    md.append("")
md += ["## Lessons", ""] + [f"- **{l['id']}** — {l['text']}" for l in kit["lessons"]]
md += ["", "## Episodes", ""] + [f"- **{e['title']}** ({e['date']}, `{e['path']}`): {e['result']}" for e in kit["episodes"]]
(HERE / "KIT.md").write_text("\n".join(md) + "\n", encoding="utf-8")

print(f"{len(nodes)} nodes, {len(links)} edges → {out / 'graph.json'}; KIT.md written")
r = subprocess.run(["graphify", "cluster-only", str(HERE), "--graph", str(out / "graph.json"), "--no-label"], capture_output=True, text=True)
print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr.strip()[-400:])
