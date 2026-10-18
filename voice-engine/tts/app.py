import io
import os
from functools import lru_cache
from typing import Annotated

import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import Response

app = FastAPI(title="OATHome Indic TTS", version="0.1.0")
MODEL_ID = os.getenv("TTS_MODEL_ID", "ai4bharat/IndicF5")

@lru_cache(maxsize=1)
def load_model():
    try:
        from transformers import AutoModel
        return AutoModel.from_pretrained(MODEL_ID, trust_remote_code=True)
    except Exception as exc:
        raise RuntimeError(f"Could not load TTS model {MODEL_ID}. Check model access/terms and worker memory.") from exc

@app.get("/health")
def health():
    return {"service": "oathome-tts", "status": "ok", "modelConfigured": bool(MODEL_ID)}

@app.post("/synthesize")
async def synthesize(
    text: Annotated[str, Form(...)],
    reference_text: Annotated[str, Form(...)],
    reference_audio: Annotated[UploadFile, File(...)],
):
    if not text.strip() or len(text) > 1200:
        raise HTTPException(status_code=400, detail="Text must be 1–1200 characters.")
    if not reference_text.strip() or len(reference_text) > 1200:
        raise HTTPException(status_code=400, detail="Provide the exact transcript of the reference audio.")
    if reference_audio.content_type not in {"audio/wav", "audio/x-wav", "audio/mpeg", "audio/flac", "audio/ogg", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Upload a WAV, MP3, FLAC or OGG reference clip.")
    audio_bytes = await reference_audio.read()
    if not audio_bytes or len(audio_bytes) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Reference audio must be between 1 byte and 15 MB.")
    try:
        with io.BytesIO(audio_bytes) as buffer:
            ref_audio, sample_rate = sf.read(buffer, dtype="float32")
        if ref_audio.ndim == 2:
            ref_audio = ref_audio.mean(axis=1)
        if sample_rate <= 0 or len(ref_audio) / sample_rate > 20:
            raise ValueError("Reference audio must be 20 seconds or shorter.")
        # IndicF5 expects a path; persist only for the duration of this request.
        import tempfile
        with tempfile.NamedTemporaryFile(suffix=".wav") as temp:
            sf.write(temp.name, ref_audio, sample_rate)
            model = load_model()
            result = model(text.strip(), ref_audio_path=temp.name, ref_text=reference_text.strip())
        audio = np.asarray(result, dtype=np.float32)
        if audio.ndim > 1:
            audio = audio.squeeze()
        output = io.BytesIO()
        sf.write(output, audio, 24000, format="WAV")
        return Response(content=output.getvalue(), media_type="audio/wav", headers={"Cache-Control": "no-store"})
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail="Could not synthesize this text/reference clip. Check audio format, model access and worker logs.") from exc