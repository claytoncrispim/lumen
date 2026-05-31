import json
import os

import aiohttp


async def generate_travel_guide(prompt: str):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY_MISSING")

    endpoint = (
        "https://generativelanguage.googleapis.com/v1/models/"
        "gemini-2.5-flash:generateContent"
    )

    request_payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}],
            }
        ]
    }

    async with aiohttp.ClientSession() as session:
        async with session.post(
            endpoint,
            params={"key": api_key},
            json=request_payload,
        ) as response:
            response_payload = await response.json()
            if response.status != 200:
                raise Exception(f"GEMINI_UPSTREAM_ERROR: {response.status}")

    text = (
        response_payload.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )

    if not text:
        raise Exception("GEMINI_EMPTY_RESPONSE")

    cleaned_text = (
        text.replace("```json", "")
        .replace("```", "")
        .strip()
    )

    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        raise Exception("GEMINI_INVALID_JSON")
