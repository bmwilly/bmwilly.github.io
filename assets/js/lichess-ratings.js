(() => {
  "use strict";

  const PERFS = ["Blitz", "Rapid"];
  const SVG_NS = "http://www.w3.org/2000/svg";
  const MS_PER_DAY = 86_400_000;
  const SPARK = { width: 280, height: 56, padX: 4, padY: 6 };

  function main() {
    const root = document.getElementById("lichess-ratings");
    if (!root) {
      throw new Error("lichess-ratings: #lichess-ratings not found");
    }
    load(root);
  }

  async function load(root) {
    const status = root.querySelector(".lichess-ratings__status");
    const username = root.dataset.username;
    const days = Number(root.dataset.days);
    if (!username) {
      throw new Error("lichess-ratings: data-username is missing");
    }
    if (!Number.isFinite(days) || days <= 0) {
      throw new Error(`lichess-ratings: invalid data-days ${root.dataset.days}`);
    }

    try {
      const history = await fetchRatingHistory(username);
      const now = new Date();
      const series = PERFS.map((name) => {
        const entry = history.find((item) => item.name === name);
        if (!entry) {
          return { name, missing: true };
        }
        return buildSeries(name, entry.points, days, now);
      });
      if (series.every((item) => item.missing || item.empty)) {
        throw new Error(`lichess-ratings: no ${PERFS.join(" or ")} history for ${username}`);
      }
      render(root, series, days, now);
    } catch (err) {
      status.hidden = false;
      status.textContent = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  async function fetchRatingHistory(username) {
    const url = `https://lichess.org/api/user/${encodeURIComponent(username)}/rating-history`;
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`lichess-ratings: Lichess HTTP ${response.status} for ${url}`);
    }
    const payload = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("lichess-ratings: rating-history response was not an array");
    }
    return payload;
  }

  function parsePoint(point) {
    if (!Array.isArray(point) || point.length < 4) {
      throw new Error(`lichess-ratings: bad history point ${JSON.stringify(point)}`);
    }
    const [year, month, day, rating] = point;
    // Lichess months are 0-indexed, same as JS Date. Python date() needs month+1.
    const date = new Date(Date.UTC(year, month, day));
    if (Number.isNaN(date.getTime())) {
      throw new Error(`lichess-ratings: invalid date ${year}-${month + 1}-${day}`);
    }
    if (!Number.isFinite(rating)) {
      throw new Error(`lichess-ratings: invalid rating ${rating}`);
    }
    return { date, rating };
  }

  function buildSeries(name, rawPoints, days, now) {
    if (!Array.isArray(rawPoints) || rawPoints.length === 0) {
      return { name, empty: true };
    }

    const points = rawPoints.map(parsePoint).sort((a, b) => a.date - b.date);
    const cutoff = new Date(now.getTime() - days * MS_PER_DAY);
    let lastBefore = null;
    const inWindow = [];
    for (const point of points) {
      if (point.date <= cutoff) {
        lastBefore = point;
      } else {
        inWindow.push(point);
      }
    }

    const startRating = lastBefore?.rating ?? inWindow[0]?.rating;
    const endPoint = inWindow.at(-1) ?? lastBefore;
    if (startRating === undefined || !endPoint) {
      return { name, empty: true };
    }

    const plot = [];
    if (lastBefore) {
      plot.push({ date: cutoff, rating: lastBefore.rating });
    }
    plot.push(...inWindow);
    const lastPlot = plot.at(-1);
    if (lastPlot && lastPlot.date < now) {
      plot.push({ date: now, rating: endPoint.rating });
    }

    return {
      name,
      empty: false,
      current: endPoint.rating,
      delta: endPoint.rating - startRating,
      playedDays: inWindow.length,
      asOf: endPoint.date,
      plot,
    };
  }

  function render(root, series, days, now) {
    const status = root.querySelector(".lichess-ratings__status");
    const seriesRoot = root.querySelector(".lichess-ratings__series");
    const moodRoot = root.querySelector(".lichess-ratings__mood");
    const windowLabel = root.querySelector(".lichess-ratings__window");

    seriesRoot.replaceChildren();
    for (const item of series) {
      seriesRoot.append(renderPerf(item, days, now));
    }

    const mood = moodFromSeries(series);
    renderMood(moodRoot, mood);
    const latest = series
      .filter((item) => item.asOf)
      .map((item) => item.asOf)
      .sort((a, b) => b - a)[0];
    const asOf = latest
      ? ` · as of ${latest.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`
      : "";
    windowLabel.textContent = `last ${days} days${asOf}`;
    seriesRoot.hidden = false;
    moodRoot.hidden = false;
    status.hidden = true;
    root.setAttribute("aria-label", mood.ariaLabel);
  }

  function renderPerf(item, days, now) {
    const wrap = document.createElement("div");
    wrap.className = "lichess-ratings__perf";

    if (item.missing || item.empty) {
      wrap.dataset.trend = "flat";
      wrap.innerHTML = `<div class="lichess-ratings__meta"><span class="lichess-ratings__name">${item.name}</span><span class="lichess-ratings__empty">no games</span></div>`;
      return wrap;
    }

    const trend = item.delta > 0 ? "up" : item.delta < 0 ? "down" : "flat";
    wrap.dataset.trend = trend;
    const deltaText = item.delta > 0 ? `+${item.delta}` : String(item.delta);

    const meta = document.createElement("div");
    meta.className = "lichess-ratings__meta";
    meta.innerHTML = `<span class="lichess-ratings__name">${item.name}</span><span class="lichess-ratings__rating">${item.current}</span><span class="lichess-ratings__delta">${deltaText}</span>`;

    wrap.append(meta, sparklineSvg(item.plot, days, now));
    return wrap;
  }

  function sparklineSvg(plot, days, now) {
    const { width, height, padX, padY } = SPARK;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "lichess-ratings__spark");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-hidden", "true");

    const cutoff = now.getTime() - days * MS_PER_DAY;
    const ratings = plot.map((p) => p.rating);
    const minR = Math.min(...ratings);
    const maxR = Math.max(...ratings);
    const padRating = Math.max((maxR - minR) * 0.12, 6);
    const yMin = minR - padRating;
    const yMax = maxR + padRating;

    const xAt = (date) => {
      const t = (date.getTime() - cutoff) / (now.getTime() - cutoff);
      return padX + t * (width - 2 * padX);
    };
    const yAt = (rating) => {
      if (maxR === minR) {
        return height / 2;
      }
      const t = (rating - yMin) / (yMax - yMin);
      return height - padY - t * (height - 2 * padY);
    };

    const coords = plot.map((p) => ({ x: xAt(p.date), y: yAt(p.rating) }));
    const lineD = coords
      .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(" ");
    const last = coords.at(-1);
    const first = coords[0];
    const fillD = `${lineD} L${last.x.toFixed(1)},${height} L${first.x.toFixed(1)},${height} Z`;

    const fill = document.createElementNS(SVG_NS, "path");
    fill.setAttribute("class", "lichess-ratings__spark-fill");
    fill.setAttribute("d", fillD);
    fill.setAttribute("fill", "currentColor");

    const line = document.createElementNS(SVG_NS, "path");
    line.setAttribute("class", "lichess-ratings__spark-line");
    line.setAttribute("d", lineD);
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "currentColor");

    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("class", "lichess-ratings__spark-dot");
    dot.setAttribute("cx", last.x.toFixed(1));
    dot.setAttribute("cy", last.y.toFixed(1));
    dot.setAttribute("r", "2.4");
    dot.setAttribute("fill", "currentColor");

    svg.append(fill, line, dot);
    return svg;
  }

  function moodFromSeries(series) {
    const live = series.filter((item) => !item.missing && !item.empty);
    const weighted = live.reduce(
      (acc, item) => {
        const weight = Math.max(item.playedDays, 1);
        return { sum: acc.sum + item.delta * weight, weight: acc.weight + weight };
      },
      { sum: 0, weight: 0 },
    );
    const meanDelta = weighted.sum / weighted.weight;
    const score = Math.tanh(meanDelta / 30);
    let key;
    if (score > 0.2) key = "happy";
    else if (score < -0.2) key = "sad";
    else key = "meh";

    const parts = live.map((item) => {
      const sign = item.delta > 0 ? "+" : "";
      return `${item.name} ${sign}${item.delta}`;
    });
    return {
      key,
      score,
      label: key === "happy" ? "happy" : key === "sad" ? "unhappy" : "fine",
      ariaLabel: `Lichess mood ${key}: ${parts.join(", ")} over the recent past`,
    };
  }

  function renderMood(moodRoot, mood) {
    moodRoot.dataset.mood = mood.key;
    moodRoot.querySelector(".lichess-ratings__mood-label").textContent = mood.label;
    const mouth = moodRoot.querySelector(".lichess-ratings__face-mouth");
    // score in [-1, 1] bends the mouth: smile down in SVG y is larger.
    const bend = (mood.score * 8).toFixed(1);
    mouth.setAttribute("d", `M12 26 Q20 ${26 + Number(bend)} 28 26`);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
