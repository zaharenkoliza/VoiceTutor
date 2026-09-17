#!/usr/bin/env python3
"""
VoiceTutor — export analysis script.

Reads the JSON export from GET /api/export/all and produces three CSVs:
  1. task_metrics.csv
  2. block_surveys.csv
  3. post_surveys.csv

Usage:
  # Option A: from saved JSON file
  python analysis/export_analysis.py export.json

  # Option B: directly from server
  python analysis/export_analysis.py --url http://localhost:3001 --secret YOUR_RESEARCHER_SECRET

Output goes to analysis/output/ by default (override with --outdir).
"""

import argparse
import json
import os
import sys
from collections import defaultdict
from datetime import datetime
from typing import Any, Optional

try:
    import pandas as pd
except ImportError:
    print("pandas is required: pip install pandas", file=sys.stderr)
    sys.exit(1)


def load_events(args) -> list[dict[str, Any]]:
    """Load events from file or server."""
    if args.url:
        import urllib.request
        url = f"{args.url.rstrip('/')}/api/export/all"
        req = urllib.request.Request(url, headers={"X-Researcher-Secret": args.secret})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
    else:
        with open(args.input, "r", encoding="utf-8-sig") as f:
            data = json.load(f)

    # Accept both raw event arrays and the export wrapper
    if isinstance(data, list):
        return data
    if "events" in data:
        return data["events"]
    raise ValueError("Cannot find events in input data")


def _iso_diff_ms(start: str, end: str) -> Optional[float]:
    """Compute millisecond difference between two ISO timestamps."""
    try:
        t0 = datetime.fromisoformat(start.replace("Z", "+00:00"))
        t1 = datetime.fromisoformat(end.replace("Z", "+00:00"))
        return round((t1 - t0).total_seconds() * 1000)
    except Exception:
        return None


# ─── 1. task_metrics ─────────────────────────────────────────────────

def build_task_metrics(events: list[dict]) -> pd.DataFrame:
    """
    Per-task row with:
      participantId, sessionId, blockId, mode, taskId,
      durationMs, status, isCorrect, tutorRequestCount,
      sttLatencyMsAvg, llmLatencyMsAvg, ttsLatencyMsAvg,
      technicalErrorCount
    """
    by_attempt: dict[str, list[dict]] = defaultdict(list)
    for e in events:
        aid = e.get("taskAttemptId", "")
        if aid and aid != "none":
            by_attempt[aid].append(e)

    rows = []
    for attempt_id, attempt_events in by_attempt.items():
        block_id = attempt_events[0].get("blockId", "")
        if block_id == "practice":
            continue

        participant_id = attempt_events[0]["participantId"]
        session_id = attempt_events[0]["sessionId"]

        task_id = None
        mode = None
        start_ts = None
        start_mono = None
        end_ts = None
        end_mono = None
        status = None
        is_correct = None
        tutor_request_count = 0
        stt_latencies: list[float] = []
        llm_latencies: list[float] = []
        tts_latencies: list[float] = []
        tech_error_count = 0

        for e in attempt_events:
            t = e["type"]
            d = e.get("data", {})

            if t == "task_start":
                task_id = d.get("taskId")
                mode = d.get("mode")
                start_ts = e["timestamp"]
                start_mono = e.get("monotonicMs")

            elif t == "task_end":
                end_ts = e["timestamp"]
                end_mono = e.get("monotonicMs")
                status = d.get("status")

            elif t == "answer_submit":
                if d.get("isCorrect"):
                    is_correct = True

            elif t == "tutor_request":
                tutor_request_count += 1

            elif t == "tutor_response":
                lat = d.get("latencyMs")
                if isinstance(lat, (int, float)):
                    llm_latencies.append(lat)

            elif t == "stt_result":
                ms = _iso_diff_ms(d.get("sttStartedAt", ""), d.get("sttFinishedAt", ""))
                if ms is not None:
                    stt_latencies.append(ms)

            elif t == "tts_result":
                ms = _iso_diff_ms(d.get("ttsStartedAt", ""), d.get("ttsFinishedAt", ""))
                if ms is not None:
                    tts_latencies.append(ms)

            elif t in ("technical_error", "stt_error", "tts_error", "tutor_error", "mic_error"):
                tech_error_count += 1

        # Compute duration
        duration_ms = None
        if start_mono is not None and end_mono is not None:
            duration_ms = round(end_mono - start_mono)
        elif start_ts and end_ts:
            duration_ms = _iso_diff_ms(start_ts, end_ts)

        if is_correct is None and status:
            is_correct = status == "correct"

        rows.append({
            "participantId": participant_id,
            "sessionId": session_id,
            "blockId": block_id,
            "mode": mode,
            "taskId": task_id,
            "durationMs": duration_ms,
            "status": status,
            "isCorrect": is_correct,
            "tutorRequestCount": tutor_request_count,
            "sttLatencyMsAvg": round(sum(stt_latencies) / len(stt_latencies)) if stt_latencies else None,
            "llmLatencyMsAvg": round(sum(llm_latencies) / len(llm_latencies)) if llm_latencies else None,
            "ttsLatencyMsAvg": round(sum(tts_latencies) / len(tts_latencies)) if tts_latencies else None,
            "technicalErrorCount": tech_error_count,
        })

    return pd.DataFrame(rows)


# ─── 2. block_surveys ───────────────────────────────────────────────

def build_block_surveys(events: list[dict]) -> pd.DataFrame:
    """
    Wide-format: one row per block survey.
    participantId, sessionId, blockId, mode, ease_of_use, formulation_ease, effort, ...
    """
    block_modes: dict[str, dict[str, str]] = {}
    for e in events:
        if e["type"] == "block_start":
            sid = e["sessionId"]
            bid = e.get("data", {}).get("blockId", e.get("blockId", ""))
            mode = e.get("data", {}).get("mode", "")
            if sid not in block_modes:
                block_modes[sid] = {}
            block_modes[sid][bid] = mode

    rows = []
    for e in events:
        if e["type"] != "survey_response":
            continue
        survey_id = e.get("data", {}).get("surveyId", "")
        if survey_id not in ("block1", "block2"):
            continue

        responses = e.get("data", {}).get("responses", {})
        sid = e["sessionId"]
        mode = block_modes.get(sid, {}).get(survey_id, "")

        row = {
            "participantId": e["participantId"],
            "sessionId": sid,
            "blockId": survey_id,
            "mode": mode,
        }
        row.update(responses)
        rows.append(row)

    return pd.DataFrame(rows)


# ─── 3. post_surveys ────────────────────────────────────────────────

def build_post_surveys(events: list[dict]) -> pd.DataFrame:
    """
    Wide-format: one row per post survey.
    participantId, sessionId, mode_preference, perceived_speed_preference, ...
    """
    rows = []
    for e in events:
        if e["type"] != "survey_response":
            continue
        survey_id = e.get("data", {}).get("surveyId", "")
        if survey_id != "post":
            continue

        responses = e.get("data", {}).get("responses", {})
        row = {
            "participantId": e["participantId"],
            "sessionId": e["sessionId"],
        }
        row.update(responses)
        rows.append(row)

    return pd.DataFrame(rows)


# ─── Main ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="VoiceTutor experiment data export")
    parser.add_argument("input", nargs="?", help="Path to export JSON file")
    parser.add_argument("--url", help="Server URL (e.g. http://localhost:3001)")
    parser.add_argument("--secret", help="Researcher secret for server auth")
    parser.add_argument("--outdir", default="analysis/output", help="Output directory")
    args = parser.parse_args()

    if not args.input and not args.url:
        parser.error("Provide either an input JSON file or --url")

    events = load_events(args)
    print(f"Loaded {len(events)} events")

    os.makedirs(args.outdir, exist_ok=True)

    # 1. task_metrics
    df_tasks = build_task_metrics(events)
    path1 = os.path.join(args.outdir, "task_metrics.csv")
    df_tasks.to_csv(path1, index=False)
    print(f"\n[1] task_metrics.csv — {len(df_tasks)} rows")
    if not df_tasks.empty:
        print(f"    Columns: {list(df_tasks.columns)}")
        print(df_tasks.to_string(index=False, max_rows=10))

    # 2. block_surveys
    df_blocks = build_block_surveys(events)
    path2 = os.path.join(args.outdir, "block_surveys.csv")
    df_blocks.to_csv(path2, index=False)
    print(f"\n[2] block_surveys.csv — {len(df_blocks)} rows")
    if not df_blocks.empty:
        print(f"    Columns: {list(df_blocks.columns)}")
        print(df_blocks.to_string(index=False, max_rows=10))

    # 3. post_surveys
    df_post = build_post_surveys(events)
    path3 = os.path.join(args.outdir, "post_surveys.csv")
    df_post.to_csv(path3, index=False)
    print(f"\n[3] post_surveys.csv — {len(df_post)} rows")
    if not df_post.empty:
        print(f"    Columns: {list(df_post.columns)}")
        print(df_post.to_string(index=False, max_rows=10))

    print(f"\nAll files saved to {args.outdir}/")


if __name__ == "__main__":
    main()
