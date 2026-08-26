from datetime import datetime, timezone

def utc_now() -> datetime:
    # Use timezone-naive UTC datetime for consistent storage and comparison across SQLite & MySQL
    return datetime.now(timezone.utc).replace(tzinfo=None)
