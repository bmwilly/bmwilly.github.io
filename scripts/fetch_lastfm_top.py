#!/usr/bin/env python3
"""Fetch Last.fm top artists, albums, and tracks for the homepage widget."""

import json
import os
import sys
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "_config.yml"
OUT_PATH = ROOT / "_data" / "lastfm_top.json"
API_URL = "https://ws.audioscrobbler.com/2.0/"
PERIOD = "3month"
LIMIT = 5
FETCH_LIMIT = 20
# Last.fm uses "ID" when a DJ set does not disclose the artist.
EXCLUDED_ARTISTS = frozenset({"id"})
USER_AGENT = "bmwilly.github.io-lastfm-snapshot/1.0"


def main() -> None:
    api_key = os.environ.get("LASTFM_API_KEY", "").strip()
    if not api_key:
        raise SystemExit("LASTFM_API_KEY is not set")

    username = read_config_value(CONFIG_PATH, "lastfm_username")
    artists = fetch_top(
        api_key,
        username,
        method="user.getTopArtists",
        wrapper_key="topartists",
        item_key="artist",
        normalize=normalize_artist,
        artist_field="name",
    )
    albums = fetch_top(
        api_key,
        username,
        method="user.getTopAlbums",
        wrapper_key="topalbums",
        item_key="album",
        normalize=normalize_album,
        artist_field="artist",
    )
    tracks = fetch_top(
        api_key,
        username,
        method="user.getTopTracks",
        wrapper_key="toptracks",
        item_key="track",
        normalize=normalize_track,
        artist_field="artist",
    )

    snapshot = {
        "fetched_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "period": PERIOD,
        "user": username,
        "artists": artists,
        "albums": albums,
        "tracks": tracks,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_PATH.relative_to(ROOT)}", file=sys.stderr)


def read_config_value(path: Path, key: str) -> str:
    if not path.is_file():
        raise SystemExit(f"{path} is missing")
    prefix = f"{key}:"
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if line.startswith(prefix):
            value = line.split(":", 1)[1].strip().strip("\"'")
            if value:
                return value
            break
    raise SystemExit(f"{key} missing from {path.name}")


def fetch_chart(
    api_key: str,
    username: str,
    method: str,
    wrapper_key: str,
    item_key: str,
) -> list[dict]:
    params = {
        "method": method,
        "user": username,
        "period": PERIOD,
        "limit": str(FETCH_LIMIT),
        "api_key": api_key,
        "format": "json",
    }
    request = Request(
        f"{API_URL}?{urlencode(params)}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:500]
        raise SystemExit(f"Last.fm HTTP {exc.code} for {method}: {body}") from exc
    except URLError as exc:
        raise SystemExit(f"Last.fm request failed for {method}: {exc}") from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Last.fm returned invalid JSON for {method}: {exc}") from exc

    if not isinstance(payload, dict):
        raise SystemExit(f"{method} payload must be an object, got {type(payload).__name__}")
    if "error" in payload:
        raise SystemExit(
            f"Last.fm error {payload.get('error')} for {method}: {payload.get('message')}"
        )

    wrapper = payload.get(wrapper_key)
    if not isinstance(wrapper, dict):
        raise SystemExit(f"{method} missing {wrapper_key} object")
    return as_item_list(wrapper.get(item_key), method, item_key)


def fetch_top(
    api_key: str,
    username: str,
    method: str,
    wrapper_key: str,
    item_key: str,
    normalize: Callable[[dict, int], dict],
    artist_field: str,
) -> list[dict]:
    kept: list[dict] = []
    for index, raw in enumerate(fetch_chart(api_key, username, method, wrapper_key, item_key)):
        item = normalize(raw, index)
        if is_excluded_artist(item[artist_field]):
            continue
        kept.append(item)
    return take_top(kept)


def as_item_list(value: object, method: str, item_key: str) -> list[dict]:
    if value in (None, ""):
        return []
    if isinstance(value, dict):
        items = [value]
    elif isinstance(value, list):
        items = value
    else:
        raise SystemExit(f"{method} {item_key} must be a list or object, got {type(value).__name__}")

    normalized: list[dict] = []
    for index, item in enumerate(items):
        if not isinstance(item, dict):
            raise SystemExit(f"{method} {item_key}[{index}] is not an object")
        normalized.append(item)
    return normalized[:FETCH_LIMIT]


def is_excluded_artist(name: str) -> bool:
    return name.casefold() in EXCLUDED_ARTISTS


def take_top(items: list[dict]) -> list[dict]:
    ranked: list[dict] = []
    for index, item in enumerate(items[:LIMIT]):
        ranked.append({**item, "rank": index + 1})
    return ranked


def normalize_artist(item: dict, index: int) -> dict:
    return {
        "rank": read_rank(item, index),
        "name": read_required_str(item, "name"),
        "playcount": read_playcount(item),
        "url": read_required_str(item, "url"),
    }


def normalize_album(item: dict, index: int) -> dict:
    return {
        "rank": read_rank(item, index),
        "name": read_required_str(item, "name"),
        "artist": read_artist_name(item),
        "playcount": read_playcount(item),
        "url": read_required_str(item, "url"),
    }


def normalize_track(item: dict, index: int) -> dict:
    return {
        "rank": read_rank(item, index),
        "name": read_required_str(item, "name"),
        "artist": read_artist_name(item),
        "playcount": read_playcount(item),
        "url": read_required_str(item, "url"),
    }


def read_rank(item: dict, index: int) -> int:
    attr = item.get("@attr")
    if isinstance(attr, dict) and "rank" in attr:
        try:
            rank = int(attr["rank"])
        except (TypeError, ValueError) as exc:
            raise SystemExit(f"invalid Last.fm rank {attr['rank']!r}") from exc
        if rank < 1:
            raise SystemExit(f"Last.fm rank must be >= 1, got {rank}")
        return rank
    return index + 1


def read_playcount(item: dict) -> int:
    raw = item.get("playcount")
    try:
        playcount = int(raw)
    except (TypeError, ValueError) as exc:
        raise SystemExit(f"invalid Last.fm playcount {raw!r}") from exc
    if playcount < 0:
        raise SystemExit(f"Last.fm playcount must be >= 0, got {playcount}")
    return playcount


def read_required_str(item: dict, key: str) -> str:
    value = item.get(key)
    if not isinstance(value, str) or not value.strip():
        raise SystemExit(f"Last.fm item missing {key}")
    return value.strip()


def read_artist_name(item: dict) -> str:
    artist = item.get("artist")
    if isinstance(artist, str) and artist.strip():
        return artist.strip()
    if isinstance(artist, dict):
        return read_required_str(artist, "name")
    raise SystemExit("Last.fm item missing artist name")


if __name__ == "__main__":
    main()
