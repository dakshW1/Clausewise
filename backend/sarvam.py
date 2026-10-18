"""Sarvam AI client: speech-to-text, translation and text-to-speech for Indian languages."""

import os

import httpx

BASE = "https://api.sarvam.ai"


def enabled() -> bool:
    return bool(os.getenv("SARVAM_API_KEY"))


def _headers() -> dict:
    return {"api-subscription-key": os.environ["SARVAM_API_KEY"]}


async def speech_to_text(audio: bytes, filename: str, content_type: str) -> dict:
    """Returns {"text": ..., "language_code": ...}; Sarvam detects the language."""
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{BASE}/speech-to-text",
            headers=_headers(),
            files={"file": (filename, audio, content_type)},
            data={"model": os.getenv("SARVAM_STT_MODEL", "saarika:v2.5"), "language_code": "unknown"},
        )
        r.raise_for_status()
        data = r.json()
    return {"text": data.get("transcript", ""), "language_code": data.get("language_code") or "en-IN"}


async def translate(text: str, source: str, target: str) -> str:
    if source == target or not text:
        return text
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{BASE}/translate",
            headers=_headers(),
            json={
                "input": text,
                "source_language_code": source,
                "target_language_code": target,
                "model": os.getenv("SARVAM_TRANSLATE_MODEL", "mayura:v1"),
            },
        )
        r.raise_for_status()
        return r.json().get("translated_text", text)


async def text_to_speech(text: str, language_code: str) -> str | None:
    """Returns base64-encoded WAV audio."""
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            f"{BASE}/text-to-speech",
            headers=_headers(),
            json={
                "text": text[:1500],
                "target_language_code": language_code,
                "model": os.getenv("SARVAM_TTS_MODEL", "bulbul:v3"),
                "speaker": os.getenv("SARVAM_SPEAKER", "priya"),
            },
        )
        r.raise_for_status()
        audios = r.json().get("audios") or []
    return audios[0] if audios else None
