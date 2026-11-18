# chrono-forge
## Aether Dial — Stake Engine notes

- **Outcomes come only from the RGS.** `frontend/game.js` plays back `round.state`
  (book events) returned by `/wallet/play`; balance comes from the `play` and
  `end-round` responses. `end-round` is called only when the round pays.
- **Local demo** (no `sessionID`/`rgs_url` in the URL) uses the same RGS contract
  with books sampled from the published math files:

  ```bash
  pip install zstandard
  python math/tools/build_demo_books.py <folder with index.json> --samples 2000
  ```

  This writes `frontend/demo/manifest.json` and `frontend/demo/books_<mode>.json`.
- **Replay:** `?replay=true&rgs_url=…&game=…&version=…&mode=…&event=…&amount=…`
  → `GET https://{rgs_url}/bet/replay/{game}/{version}/{mode}/{event}`.
- `math/generate_lookup.py` is an **old** math version and is not what is published on Stake.
