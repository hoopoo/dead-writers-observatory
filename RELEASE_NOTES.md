# Dead Writers Observatory v0.1.1 Public Beta

## v0.1.1

- improved public query resolution
- similar wording now maps to approved observation families
- fixed comparison summary for insufficient results

Public Query Resolution is routing, not interpretation.
It may decide that a question belongs to an approved family.
It may not invent what a writer believes.

---

# Dead Writers Observatory v0.1 Public Beta

死者は答えない。言葉が残っている。

Public Beta は「全部完成したから公開」ではなく、次の境界を保った状態で公開します。

```
Archive is limited.
Interpretation is bounded.
Provenance is visible.
Silence is allowed.
```

## What ships

- 3 writers: 夏目漱石 / 芥川龍之介 / 太宰治
- 同じ問いを 3 archives に通す（作家選択は先にしない）
- Evidence-backed perspectives（human-curated claims）
- Provenance（なぜこの視点？ / source / voice / distance）
- Bounded prose（Independent Blind Gate 通過時のみ public default）
- Insufficient と Safety は文学的解釈で埋めない
- Archive は検証済み資料の一部。全集ではない

## What this is not

作家本人を再現するものではありません。
AI が作家になりきって答えるサービスではありません。

portrait / share / login / history / 新 writer / Retrieval Router / Experiment C / Archive 大規模拡張は v0.1 の blocker ではありません。

## Public mode

`PUBLIC_PERSPECTIVE_MODE=skeleton|prose`

v0.1 Independent Blind Check: 18/18 reviewed. Material meaning 0. Attribution unsafe 0.
Readability better+same did not reach 90%, so Public default is **skeleton**.
Prose remains staging-only. Fallback is always skeleton.

## Freeze

Public production は Curator の runtime SQLite に依存しません。
承認済み skeleton / prose / provenance は `src/data/release/approved-public-beta-v0.1.json` に freeze します。
