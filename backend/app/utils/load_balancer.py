import asyncio
import time
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class KeyStatus(Enum):
    ACTIVE = "active"
    RATE_LIMITED = "rate_limited"
    FAILED = "failed"

@dataclass
class APIKeyInfo:
    key: str
    status: KeyStatus = KeyStatus.ACTIVE
    requests_per_minute: int = 0
    requests_per_day: int = 0
    last_request_time: float = 0
    last_reset_minute: int = 0
    last_reset_day: int = 0
    consecutive_failures: int = 0
    last_failure_time: float = 0

    def reset_counters_if_needed(self):
        """Reset request counters based on time periods"""
        current_time = time.time()
        current_minute = int(current_time // 60)
        current_day = int(current_time // 86400)

        # Reset minute counter
        if current_minute != self.last_reset_minute:
            self.requests_per_minute = 0
            self.last_reset_minute = current_minute

        # Reset day counter
        if current_day != self.last_reset_day:
            self.requests_per_day = 0
            self.last_reset_day = current_day

        # Reset failure status after cooldown period (5 minutes)
        if (self.status == KeyStatus.FAILED and
            current_time - self.last_failure_time > 300):
            self.status = KeyStatus.ACTIVE
            self.consecutive_failures = 0

    def can_make_request(self) -> bool:
        """Check if this key can make a request based on rate limits"""
        self.reset_counters_if_needed()

        if self.status == KeyStatus.FAILED:
            return False

        # Rate limits: IPM=2, IPD=400
        if self.requests_per_minute >= 2 or self.requests_per_day >= 400:
            self.status = KeyStatus.RATE_LIMITED
            return False

        return True

    def record_request(self):
        """Record a successful request"""
        self.reset_counters_if_needed()
        self.requests_per_minute += 1
        self.requests_per_day += 1
        self.last_request_time = time.time()
        self.consecutive_failures = 0

        # Update status based on new counts
        if self.requests_per_minute >= 2 or self.requests_per_day >= 400:
            self.status = KeyStatus.RATE_LIMITED
        else:
            self.status = KeyStatus.ACTIVE

    def record_failure(self):
        """Record a failed request"""
        self.consecutive_failures += 1
        self.last_failure_time = time.time()

        # Mark as failed after 3 consecutive failures
        if self.consecutive_failures >= 3:
            self.status = KeyStatus.FAILED

class LoadBalancer:
    def __init__(self, api_keys: List[str]):
        self.keys: Dict[str, APIKeyInfo] = {
            key: APIKeyInfo(key=key) for key in api_keys
        }
        self.last_used_index = 0

    def get_available_key(self) -> Optional[str]:
        """Get an available API key using round-robin with health checking"""
        available_keys = [
            key_info for key_info in self.keys.values()
            if key_info.can_make_request()
        ]

        if not available_keys:
            logger.warning("No available API keys")
            return None

        # Sort by usage to prefer less used keys
        available_keys.sort(key=lambda k: (k.requests_per_day, k.requests_per_minute))

        # Use round-robin among available keys
        selected_key = available_keys[self.last_used_index % len(available_keys)]
        self.last_used_index = (self.last_used_index + 1) % len(available_keys)

        return selected_key.key

    def get_multiple_available_keys(self, count: int) -> List[str]:
        """Get multiple available API keys for parallel requests"""
        available_keys = [
            key_info for key_info in self.keys.values()
            if key_info.can_make_request()
        ]

        if not available_keys:
            logger.warning("No available API keys")
            return []

        # Sort by usage to prefer less used keys
        available_keys.sort(key=lambda k: (k.requests_per_day, k.requests_per_minute))

        # Return up to 'count' keys, cycling through available ones
        selected_keys = []
        for i in range(min(count, len(available_keys) * 2)):  # Allow some cycling
            key_index = (self.last_used_index + i) % len(available_keys)
            selected_key = available_keys[key_index]

            # Check if we can still use this key
            if selected_key.can_make_request():
                selected_keys.append(selected_key.key)
                if len(selected_keys) >= count:
                    break

        self.last_used_index = (self.last_used_index + len(selected_keys)) % len(available_keys)
        return selected_keys

    def record_success(self, api_key: str):
        """Record a successful API request"""
        if api_key in self.keys:
            self.keys[api_key].record_request()

    def record_failure(self, api_key: str):
        """Record a failed API request"""
        if api_key in self.keys:
            self.keys[api_key].record_failure()

    def get_stats(self) -> Dict:
        """Get load balancer statistics"""
        active_keys = sum(1 for k in self.keys.values() if k.status == KeyStatus.ACTIVE)
        rate_limited_keys = sum(1 for k in self.keys.values() if k.status == KeyStatus.RATE_LIMITED)
        failed_keys = sum(1 for k in self.keys.values() if k.status == KeyStatus.FAILED)

        total_requests_today = sum(k.requests_per_day for k in self.keys.values())
        total_requests_this_minute = sum(k.requests_per_minute for k in self.keys.values())

        return {
            "total_keys": len(self.keys),
            "active_keys": active_keys,
            "rate_limited_keys": rate_limited_keys,
            "failed_keys": failed_keys,
            "total_requests_today": total_requests_today,
            "total_requests_this_minute": total_requests_this_minute
        }

def load_api_keys_from_file(file_path: str) -> List[str]:
    """Load API keys from a text file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            keys = [line.strip() for line in f if line.strip()]
        logger.info(f"Loaded {len(keys)} API keys from {file_path}")
        return keys
    except FileNotFoundError:
        logger.error(f"API keys file not found: {file_path}")
        return []
    except Exception as e:
        logger.error(f"Error loading API keys: {e}")
        return []

# Global load balancer instance
_load_balancer: Optional[LoadBalancer] = None

def get_load_balancer() -> LoadBalancer:
    """Get the global load balancer instance"""
    global _load_balancer
    if _load_balancer is None:
        # Try different paths for keys.txt
        import os
        possible_paths = [
            "keys.txt",
            "../keys.txt",
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "keys.txt")
        ]

        api_keys = []
        for path in possible_paths:
            api_keys = load_api_keys_from_file(path)
            if api_keys:
                break

        if not api_keys:
            logger.warning("No API keys found, creating dummy load balancer for development")
            # Create a dummy key for development/testing
            api_keys = ["sk-dummy-key-for-development"]

        _load_balancer = LoadBalancer(api_keys)
    return _load_balancer