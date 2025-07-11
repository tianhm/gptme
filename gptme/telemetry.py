"""
OpenTelemetry integration for gptme performance monitoring.

This module provides tracing and metrics collection to measure:
- Parsing speeds
- Server tokens/second
- Tool execution times
- LLM response times
"""

import functools
import logging
import os
import time
from collections.abc import Callable
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

# Type variable for generic function decoration
F = TypeVar("F", bound=Callable[..., Any])

# Global variables to track telemetry state
_telemetry_enabled = False
_tracer = None
_meter = None
_token_counter = None
_request_histogram = None

TELEMETRY_AVAILABLE = False
TELEMETRY_IMPORT_ERROR = None

try:
    from opentelemetry import metrics, trace  # fmt: skip
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter  # fmt: skip
    from opentelemetry.exporter.prometheus import PrometheusMetricReader  # fmt: skip
    from opentelemetry.instrumentation.flask import FlaskInstrumentor  # fmt: skip
    from opentelemetry.instrumentation.requests import RequestsInstrumentor  # fmt: skip
    from opentelemetry.sdk.metrics import MeterProvider  # fmt: skip
    from opentelemetry.sdk.resources import Resource  # fmt: skip
    from opentelemetry.sdk.trace import TracerProvider  # fmt: skip
    from opentelemetry.sdk.trace.export import BatchSpanProcessor  # fmt: skip

    TELEMETRY_AVAILABLE = True
except ImportError as e:
    TELEMETRY_AVAILABLE = False
    TELEMETRY_IMPORT_ERROR = str(e)


def is_telemetry_enabled() -> bool:
    """Check if telemetry is enabled."""
    return _telemetry_enabled and TELEMETRY_AVAILABLE


def init_telemetry(
    service_name: str = "gptme",
    enable_flask_instrumentation: bool = True,
    enable_requests_instrumentation: bool = True,
) -> None:
    """Initialize OpenTelemetry tracing and metrics."""
    global _telemetry_enabled, _tracer, _meter, _token_counter, _request_histogram

    # Check if telemetry is enabled via environment variable
    if os.getenv("GPTME_TELEMETRY_ENABLED", "").lower() not in ("true", "1", "yes"):
        logger.debug(
            "Telemetry not enabled. Set GPTME_TELEMETRY_ENABLED=true to enable."
        )
        return

    if not TELEMETRY_AVAILABLE:
        error_msg = "OpenTelemetry dependencies not available. Install with: pip install gptme[telemetry]"
        if TELEMETRY_IMPORT_ERROR:
            error_msg += f" (Import error: {TELEMETRY_IMPORT_ERROR})"
        logger.warning(error_msg)
        return

    try:
        # Initialize tracing with proper service name
        resource = Resource.create({"service.name": service_name})
        trace.set_tracer_provider(TracerProvider(resource=resource))
        _tracer = trace.get_tracer(service_name)

        # Set up OTLP exporter if endpoint provided (for Jaeger or other OTLP-compatible backends)
        # OTLP uses different default ports: 4317 for gRPC, 4318 for HTTP
        otlp_endpoint = os.getenv("OTLP_ENDPOINT") or "http://localhost:4317"
        otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        span_processor = BatchSpanProcessor(otlp_exporter)
        tracer_provider = trace.get_tracer_provider()
        if hasattr(tracer_provider, "add_span_processor"):
            tracer_provider.add_span_processor(span_processor)  # type: ignore

        # Initialize metrics
        prometheus_reader = PrometheusMetricReader()
        metrics.set_meter_provider(MeterProvider(metric_readers=[prometheus_reader]))
        _meter = metrics.get_meter(service_name)

        # Create metrics
        _token_counter = _meter.create_counter(
            name="gptme_tokens_processed",
            description="Number of tokens processed",
            unit="tokens",
        )

        _request_histogram = _meter.create_histogram(
            name="gptme_request_duration_seconds",
            description="Request duration in seconds",
            unit="seconds",
        )

        # Auto-instrument Flask and requests if enabled
        if enable_flask_instrumentation:
            FlaskInstrumentor().instrument()

        if enable_requests_instrumentation:
            RequestsInstrumentor().instrument()

        _telemetry_enabled = True

        # Import console for user-visible messages
        from .util import console  # fmt: skip

        # Log to console so users know telemetry is active
        console.log("📊 Telemetry enabled - performance metrics will be collected")
        console.log(f"🔍 Traces will be sent via OTLP to {otlp_endpoint}")

    except Exception as e:
        logger.error(f"Failed to initialize telemetry: {e}")


def trace_function(
    name: str | None = None, attributes: dict[str, Any] | None = None
) -> Callable[[F], F]:
    """Decorator to trace function execution."""

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not is_telemetry_enabled() or _tracer is None:
                return func(*args, **kwargs)
            span_name = name or f"{func.__module__}.{func.__name__}"

            with _tracer.start_as_current_span(span_name) as span:
                if attributes:
                    for key, value in attributes.items():
                        span.set_attribute(key, value)

                # Add function info
                span.set_attribute("function.name", func.__name__)
                span.set_attribute("function.module", func.__module__)

                try:
                    result = func(*args, **kwargs)
                    span.set_attribute("function.result.success", True)
                    return result
                except Exception as e:
                    span.set_attribute("function.result.success", False)
                    span.set_attribute("function.error.type", type(e).__name__)
                    span.set_attribute("function.error.message", str(e))
                    raise

        return wrapper  # type: ignore

    return decorator


def record_tokens(count: int, token_type: str = "total") -> None:
    """Record token count metric."""
    if not is_telemetry_enabled() or _token_counter is None:
        return

    _token_counter.add(count, {"token_type": token_type})


def record_request_duration(
    duration: float, endpoint: str, method: str = "GET"
) -> None:
    """Record request duration metric."""
    if not is_telemetry_enabled() or _request_histogram is None:
        return

    _request_histogram.record(duration, {"endpoint": endpoint, "method": method})


def measure_tokens_per_second(func: F) -> F:
    """Decorator to measure tokens per second for LLM operations."""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        if not is_telemetry_enabled() or _tracer is None:
            return func(*args, **kwargs)

        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()

        # Try to extract token count from result
        # This is a heuristic and may need adjustment based on actual return types
        token_count = 0
        if hasattr(result, "usage") and hasattr(result.usage, "total_tokens"):
            token_count = result.usage.total_tokens
        elif isinstance(result, dict) and "usage" in result:
            token_count = result["usage"].get("total_tokens", 0)

        if token_count > 0:
            duration = end_time - start_time
            tokens_per_second = token_count / duration if duration > 0 else 0

            with _tracer.start_as_current_span("llm_tokens_per_second") as span:
                span.set_attribute("tokens.count", token_count)
                span.set_attribute("tokens.duration_seconds", duration)
                span.set_attribute("tokens.per_second", tokens_per_second)

            record_tokens(token_count, "llm_response")

        return result

    return wrapper  # type: ignore


def shutdown_telemetry() -> None:
    """Shutdown telemetry providers."""
    global _telemetry_enabled

    if not _telemetry_enabled:
        return

    try:
        # Force flush any pending spans before shutdown
        tracer_provider = trace.get_tracer_provider()
        if hasattr(tracer_provider, "force_flush"):
            logger.debug("Flushing pending traces...")
            tracer_provider.force_flush(timeout_millis=5000)  # 5 second timeout

        # Shutdown tracer provider
        if hasattr(tracer_provider, "shutdown"):
            tracer_provider.shutdown()

        # Shutdown meter provider
        meter_provider = metrics.get_meter_provider()
        if hasattr(meter_provider, "shutdown"):
            meter_provider.shutdown()

        _telemetry_enabled = False
        logger.info("Telemetry shutdown successfully")

    except Exception as e:
        logger.error(f"Failed to shutdown telemetry: {e}")
