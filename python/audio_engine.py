import sys
import json
import os
import argparse
import time
import shutil
from pathlib import Path

# Mock mode flag for environments where heavy ML libs are not installed
MOCK_MODE = os.environ.get('MOCK_ML', 'false').lower() == 'true'

def check_dependencies():
    """Check if necessary libraries are importable."""
    if MOCK_MODE:
        return True, []

    missing = []
    try:
        import spleeter
    except ImportError:
        missing.append('spleeter')

    try:
        import whisper
    except ImportError:
        missing.append('openai-whisper')

    try:
        import ffmpeg
    except ImportError:
        missing.append('ffmpeg-python')

    return len(missing) == 0, missing

def format_timestamp(seconds):
    """Format seconds to LRC timestamp [mm:ss.xx]."""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    hundredths = int((seconds - int(seconds)) * 100)
    return f"[{minutes:02d}:{secs:02d}.{hundredths:02d}]"

def generate_lrc(segments):
    """Convert whisper segments to LRC format."""
    lrc_lines = []
    for segment in segments:
        start = segment['start']
        text = segment['text'].strip()
        timestamp = format_timestamp(start)
        lrc_lines.append(f"{timestamp}{text}")
    return "\n".join(lrc_lines)

def process_audio(file_path, output_dir):
    """
    Process audio file: isolate vocals and transcribe.
    """

    # Create output directory for this file
    file_name = Path(file_path).stem
    session_dir = Path(output_dir) / file_name
    session_dir.mkdir(parents=True, exist_ok=True)

    result = {
        "status": "success",
        "original": file_path,
        "vocals": None,
        "accompaniment": None,
        "lyrics": None
    }

    try:
        # 1. Vocal Isolation
        # In a real scenario, we would use Spleeter here.
        # For this implementation, I'll write the code for Spleeter but wrap it
        # to fall back if dependencies are missing (or if in MOCK_MODE).

        vocals_path = session_dir / "vocals.wav"
        accompaniment_path = session_dir / "accompaniment.wav"

        if MOCK_MODE:
            # Create dummy files for testing
            shutil.copy(file_path, vocals_path)
            shutil.copy(file_path, accompaniment_path)
            result["vocals"] = str(vocals_path)
            result["accompaniment"] = str(accompaniment_path)

            # Mock Lyrics
            result["lyrics"] = """[00:00.00] (Music)
[00:05.00] This is a generated lyric
[00:10.00] Because we are in mock mode
[00:15.00] Real ML processing requires heavy dependencies
"""
            return result

        # Real Processing
        try:
            from spleeter.separator import Separator
            import whisper
        except ImportError as e:
            return {
                "status": "error",
                "message": f"Missing ML dependencies: {str(e)}. Please install requirements.txt"
            }

        # Spleeter separation
        # using 2stems: vocals + accompaniment
        separator = Separator('spleeter:2stems')
        # Spleeter saves to {output_dir}/{filename}/{stem}.wav
        # We need to direct it carefully
        separator.separate_to_file(file_path, str(session_dir))

        # Spleeter usually creates a subdir with the filename.
        # E.g. session_dir/filename/vocals.wav
        # Let's check where it put them.
        spleeter_out = session_dir / file_name

        if (spleeter_out / "vocals.wav").exists():
            result["vocals"] = str(spleeter_out / "vocals.wav")
            result["accompaniment"] = str(spleeter_out / "accompaniment.wav")
        else:
             # Try direct session dir if configuration differs
             if (session_dir / "vocals.wav").exists():
                 result["vocals"] = str(session_dir / "vocals.wav")
                 result["accompaniment"] = str(session_dir / "accompaniment.wav")

        # 2. Transcription with Whisper
        # Load model (use 'tiny' or 'base' for speed, can be configured)
        model = whisper.load_model("base")

        # We transcribe the vocals for better accuracy on lyrics
        audio_source = result["vocals"] if result["vocals"] else file_path

        transcription = model.transcribe(audio_source)
        result["lyrics"] = generate_lrc(transcription['segments'])

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

    return result

def main():
    parser = argparse.ArgumentParser(description="Audio AI Processing Engine")
    parser.add_argument("command", choices=["analyze"], help="Command to execute")
    parser.add_argument("file_path", help="Path to the audio file")
    parser.add_argument("--output_dir", default=None, help="Directory to save output files")

    args = parser.parse_args()

    if not os.path.exists(args.file_path):
        print(json.dumps({"status": "error", "message": "File not found"}))
        return

    # Determine output directory
    output_dir = args.output_dir
    if not output_dir:
        # Default to a temp folder near the script or system temp
        import tempfile
        output_dir = os.path.join(tempfile.gettempdir(), "music-app-ai")

    if args.command == "analyze":
        output = process_audio(args.file_path, output_dir)
        print(json.dumps(output))

if __name__ == "__main__":
    main()
