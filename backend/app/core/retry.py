"""
Retry logic with exponential backoff for Paper2Code operations
"""

import asyncio
import functools
import logging
import random
from typing import Any, Callable, List, Optional, Type, Union
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class RetryableError(Exception):
    """Base exception for errors that should trigger a retry."""
    pass


class PermanentError(Exception):
    """Exception for errors that should not trigger a retry."""
    pass


class RetryConfig:
    """Configuration for retry behavior."""

    def __init__(
        self,
        max_attempts: int = 3,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        retryable_exceptions: Optional[List[Type[Exception]]] = None,
        permanent_exceptions: Optional[List[Type[Exception]]] = None
    ):
        self.max_attempts = max_attempts
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.retryable_exceptions = retryable_exceptions or [RetryableError]
        self.permanent_exceptions = permanent_exceptions or [PermanentError]


class RetryState:
    """State tracking for retry attempts."""

    def __init__(self, operation_id: str, config: RetryConfig):
        self.operation_id = operation_id
        self.config = config
        self.attempt_count = 0
        self.first_attempt_at = datetime.utcnow()
        self.last_attempt_at = None
        self.total_delay = 0.0
        self.errors: List[Exception] = []

    def next_delay(self) -> float:
        """Calculate the delay for the next retry attempt."""
        if self.attempt_count == 0:
            return 0.0

        # Exponential backoff
        delay = self.config.initial_delay * (
            self.config.exponential_base ** (self.attempt_count - 1)
        )

        # Cap at max delay
        delay = min(delay, self.config.max_delay)

        # Add jitter to avoid thundering herd
        if self.config.jitter:
            jitter_range = delay * 0.1  # 10% jitter
            delay += random.uniform(-jitter_range, jitter_range)

        return max(0.0, delay)

    def should_retry(self, exception: Exception) -> bool:
        """Determine if the operation should be retried based on the exception."""
        # Check if we've exceeded max attempts
        if self.attempt_count >= self.config.max_attempts:
            return False

        # Check for permanent errors (don't retry)
        for permanent_exc in self.config.permanent_exceptions:
            if isinstance(exception, permanent_exc):
                return False

        # Check for retryable errors
        for retryable_exc in self.config.retryable_exceptions:
            if isinstance(exception, retryable_exc):
                return True

        # Default behavior based on exception type
        if isinstance(exception, (ConnectionError, TimeoutError, OSError)):
            return True

        return False

    def record_attempt(self, exception: Optional[Exception] = None):
        """Record an attempt and optionally store the error."""
        self.attempt_count += 1
        self.last_attempt_at = datetime.utcnow()

        if exception:
            self.errors.append(exception)

        logger.info(
            f"Retry attempt {self.attempt_count}/{self.config.max_attempts} "
            f"for operation {self.operation_id}"
        )


def retry_with_backoff(
    config: Optional[RetryConfig] = None,
    operation_id: Optional[str] = None
):
    """
    Decorator for adding retry logic with exponential backoff to async functions.

    Args:
        config: Retry configuration. If None, uses default config.
        operation_id: Unique identifier for the operation (for logging).

    Example:
        @retry_with_backoff(
            config=RetryConfig(max_attempts=5, initial_delay=2.0),
            operation_id="paper_processing"
        )
        async def process_paper(paper_path: str):
            # This function will be retried on failure
            return await some_operation(paper_path)
    """

    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            retry_config = config or RetryConfig()
            op_id = operation_id or f"{func.__name__}_{id(args)}"
            state = RetryState(op_id, retry_config)

            while True:
                try:
                    # Wait for the calculated delay
                    delay = state.next_delay()
                    if delay > 0:
                        logger.info(f"Waiting {delay:.2f}s before retry attempt {state.attempt_count + 1}")
                        await asyncio.sleep(delay)
                        state.total_delay += delay

                    # Record the attempt
                    state.record_attempt()

                    # Try the operation
                    result = await func(*args, **kwargs)

                    # Success - log and return
                    if state.attempt_count > 1:
                        logger.info(
                            f"Operation {op_id} succeeded on attempt {state.attempt_count} "
                            f"after {state.total_delay:.2f}s total delay"
                        )

                    return result

                except Exception as e:
                    state.record_attempt(e)

                    # Check if we should retry
                    if not state.should_retry(e):
                        logger.error(
                            f"Operation {op_id} failed permanently after {state.attempt_count} attempts: {e}"
                        )
                        # Attach retry information to the exception
                        e.retry_attempts = state.attempt_count
                        e.total_delay = state.total_delay
                        e.retry_errors = state.errors
                        raise e

                    logger.warning(
                        f"Operation {op_id} failed on attempt {state.attempt_count}: {e}. "
                        f"Will retry in {state.next_delay():.2f}s"
                    )

        return wrapper
    return decorator


async def retry_operation(
    operation: Callable,
    config: Optional[RetryConfig] = None,
    operation_id: Optional[str] = None,
    *args,
    **kwargs
) -> Any:
    """
    Programmatic retry wrapper for operations that can't use the decorator.

    Args:
        operation: The async function to retry
        config: Retry configuration
        operation_id: Unique identifier for logging
        *args: Arguments to pass to the operation
        **kwargs: Keyword arguments to pass to the operation

    Returns:
        The result of the successful operation

    Raises:
        The last exception if all retries fail
    """

    @retry_with_backoff(config=config, operation_id=operation_id)
    async def wrapper():
        return await operation(*args, **kwargs)

    return await wrapper()


# Predefined retry configurations for common scenarios

NETWORK_RETRY_CONFIG = RetryConfig(
    max_attempts=5,
    initial_delay=1.0,
    max_delay=30.0,
    exponential_base=2.0,
    retryable_exceptions=[
        ConnectionError,
        TimeoutError,
        OSError,
        RetryableError
    ],
    permanent_exceptions=[
        ValueError,
        TypeError,
        FileNotFoundError,
        PermanentError
    ]
)

SUBPROCESS_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay=2.0,
    max_delay=60.0,
    exponential_base=2.0,
    retryable_exceptions=[
        OSError,
        asyncio.TimeoutError,
        RetryableError
    ],
    permanent_exceptions=[
        ValueError,
        FileNotFoundError,
        PermanentError
    ]
)

FILE_OPERATION_RETRY_CONFIG = RetryConfig(
    max_attempts=4,
    initial_delay=0.5,
    max_delay=10.0,
    exponential_base=1.5,
    retryable_exceptions=[
        OSError,
        PermissionError,
        RetryableError
    ],
    permanent_exceptions=[
        FileNotFoundError,
        IsADirectoryError,
        PermanentError
    ]
)

PAPER2CODE_STAGE_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    initial_delay=5.0,
    max_delay=120.0,
    exponential_base=2.0,
    retryable_exceptions=[
        ConnectionError,
        TimeoutError,
        OSError,
        asyncio.TimeoutError,
        RetryableError
    ],
    permanent_exceptions=[
        ValueError,
        TypeError,
        FileNotFoundError,
        PermanentError
    ]
)