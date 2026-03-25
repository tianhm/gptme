from unittest.mock import Mock

import pytest

from gptme.tools.browser import _read_github_repo


def test_read_github_repo_uses_shared_browser_fallback(monkeypatch):
    url = "https://github.com/gptme/gptme"
    fallback = Mock(return_value="fallback content")

    monkeypatch.setattr("gptme.tools.browser._read_url_with_browser", fallback)
    monkeypatch.setattr(
        "gptme.tools.browser.subprocess.run",
        Mock(side_effect=FileNotFoundError),
    )

    result = _read_github_repo(url)

    assert result == "fallback content"
    fallback.assert_called_once_with(url)


def test_extract_main_content_passes_noise_selector_as_argument():
    pytest.importorskip("playwright")
    from gptme.tools._browser_playwright import _extract_main_content

    class FakeElement:
        def inner_text(self):
            return "body text"

        def inner_html(self):
            return "<body>body text</body>"

    class FakePage:
        def __init__(self):
            self.evaluate_calls = []

        def query_selector(self, selector):
            if selector == "body":
                return FakeElement()
            return None

        def wait_for_timeout(self, timeout_ms):
            assert timeout_ms == 1000

        def evaluate(self, expression, arg=None):
            self.evaluate_calls.append((expression, arg))

        def inner_html(self, selector):
            assert selector == "body"
            return "<body>body text</body>"

    page = FakePage()

    result = _extract_main_content(page)

    assert result == "<body>body text</body>"
    assert any(arg == "[aria-hidden='true']" for _, arg in page.evaluate_calls)
    assert all(
        "querySelectorAll(selector)" in expression
        for expression, _ in page.evaluate_calls
    )
    assert all(
        "[aria-hidden='true']" not in expression
        for expression, _ in page.evaluate_calls
    )
