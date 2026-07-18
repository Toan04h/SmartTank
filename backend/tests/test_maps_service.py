import httpx
import pytest
from app.services.maps_service import autocomplete_address, geocode_place, reverse_geocode

class FakeResponse:
    def __init__(self, json_data):
        self._json_data = json_data

    def raise_for_status(self):
        pass

    def json(self):
        return self._json_data

# --- autocomplete_address ---

@pytest.mark.anyio
async def test_autocomplete_shapes_suggestions(monkeypatch):
    async def fake_post(self, url, headers=None, json=None, **kwargs):
        return FakeResponse({
            "suggestions": [
                {"placePrediction": {"text": {"text": "123 Main St"}, "placeId": "abc123"}}
            ]
        })
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    result = await autocomplete_address("123 Main")

    assert result == [{"description": "123 Main St", "place_id": "abc123"}]

@pytest.mark.anyio
async def test_autocomplete_without_coords_omits_location_bias(monkeypatch):
    captured = {}
    async def fake_post(self, url, headers=None, json=None, **kwargs):
        captured["json"] = json
        return FakeResponse({"suggestions": []})
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    await autocomplete_address("123 Main")

    assert "locationBias" not in captured["json"]

@pytest.mark.anyio
async def test_autocomplete_with_coords_includes_location_bias_circle(monkeypatch):
    captured = {}
    async def fake_post(self, url, headers=None, json=None, **kwargs):
        captured["json"] = json
        return FakeResponse({"suggestions": []})
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    await autocomplete_address("123 Main", lat=40.0, lng=-75.0)

    assert captured["json"]["locationBias"]["circle"]["center"] == {"latitude": 40.0, "longitude": -75.0}

@pytest.mark.anyio
async def test_autocomplete_no_suggestions_returns_empty_list(monkeypatch):
    async def fake_post(self, url, headers=None, json=None, **kwargs):
        return FakeResponse({})
    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    result = await autocomplete_address("nowhere")

    assert result == []

# --- geocode_place ---

@pytest.mark.anyio
async def test_geocode_place_shapes_response(monkeypatch):
    async def fake_get(self, url, headers=None, **kwargs):
        return FakeResponse({
            "location": {"latitude": 40.7128, "longitude": -74.0060},
            "formattedAddress": "New York, NY",
        })
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    result = await geocode_place("some-place-id")

    assert result == {"lat": 40.7128, "lng": -74.0060, "formatted_address": "New York, NY"}

# --- reverse_geocode ---

@pytest.mark.anyio
async def test_reverse_geocode_shapes_response(monkeypatch):
    captured = {}
    async def fake_get(self, url, params=None, **kwargs):
        captured["params"] = params
        return FakeResponse({"results": [{"formatted_address": "1600 Amphitheatre Pkwy"}]})
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    result = await reverse_geocode(37.4224, -122.0842)

    assert result == {"formatted_address": "1600 Amphitheatre Pkwy"}
    assert captured["params"]["latlng"] == "37.4224,-122.0842"
