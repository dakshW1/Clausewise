"""Thin client for Gemma 4 through the Google AI Studio (Generative Language) REST API."""

import base64
import json
import os
import re

import httpx

API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def enabled() -> bool:
    return bool(os.getenv("GEMINI_API_KEY"))


def _model() -> str:
    return os.getenv("GEMMA_MODEL", "gemma-4-31b-it")


def _parse_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.M).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("Gemma did not return JSON")
    return json.loads(text[start : end + 1])


async def generate_json(prompt: str, image: bytes | None = None, mime: str = "image/jpeg") -> dict:
    """Send a prompt (and optional image) and parse the JSON reply. Retries once on bad JSON."""
    parts: list[dict] = []
    if image:
        parts.append({"inline_data": {"mime_type": mime, "data": base64.b64encode(image).decode()}})
    parts.append({"text": prompt})
    config: dict = {"temperature": 0.2}
    # Minimal thinking cuts a full extraction from ~85 s to ~30 s on Gemma 4 with no loss in output.
    thinking = os.getenv("GEMMA_THINKING", "minimal")
    if thinking:
        config["thinkingConfig"] = {"thinkingLevel": thinking}
    body = {"contents": [{"role": "user", "parts": parts}], "generationConfig": config}

    last_err: Exception | None = None
    async with httpx.AsyncClient(timeout=180) as client:
        for _ in range(3):
            r = await client.post(
                API.format(model=_model()),
                params={"key": os.environ["GEMINI_API_KEY"]},
                json=body,
            )
            if r.status_code == 400 and "thinking" in r.text.lower() and "thinkingConfig" in config:
                config.pop("thinkingConfig")  # model doesn't support it; ask again without
                continue
            if r.status_code >= 500:
                # Minimal thinking intermittently returns 500; retry with the model's default instead.
                last_err = httpx.HTTPStatusError(r.text[:200], request=r.request, response=r)
                config.pop("thinkingConfig", None)
                continue
            r.raise_for_status()
            data = r.json()
            # Gemma 4 returns its reasoning as separate "thought" parts; only the answer parts hold the JSON.
            parts_out = data["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts_out if not p.get("thought"))
            try:
                return _parse_json(text)
            except (ValueError, json.JSONDecodeError) as e:
                last_err = e
                parts[-1] = {"text": prompt + "\n\nYour last reply was not valid JSON. Return valid JSON only."}
    raise ValueError(f"Gemma did not return valid JSON: {last_err}")
