import httpx
import pytest
from app.services.fuel_service import get_fuel_price, _get_petroleum_price, _get_electricity_price

class FakeResponse:
    def __init__(self, json_data):
        self._json_data = json_data

    def raise_for_status(self):
        pass

    def json(self):
        return self._json_data

def _petroleum_payload(value):
    return {"response": {"data": [{"value": value}]}}

def _electricity_payload(price):
    return {"response": {"data": [{"price": price}]}}

def _empty_payload():
    return {"response": {"data": []}}

# --- get_fuel_price routing ---

@pytest.mark.anyio
async def test_gasoline_uses_petroleum_endpoint_with_epm0_code(monkeypatch):
    calls = []
    async def fake_get(self, url, params=None, **kwargs):
        calls.append(dict(params) if params else params)
        return FakeResponse(_petroleum_payload("3.50"))
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    result = await get_fuel_price("Regular Gasoline")

    assert result == {"price": 3.5, "unit": "dollars per gallon", "fuel_type": "Regular Gasoline"}
    assert calls[0]["facets[product][]"] == "EPM0"

@pytest.mark.anyio
async def test_diesel_uses_petroleum_endpoint_with_epd2d_code(monkeypatch):
    calls = []
    async def fake_get(self, url, params=None, **kwargs):
        calls.append(dict(params) if params else params)
        return FakeResponse(_petroleum_payload("4.20"))
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    result = await get_fuel_price("Diesel")

    assert result["price"] == 4.2
    assert calls[0]["facets[product][]"] == "EPD2D"

@pytest.mark.anyio
async def test_electricity_uses_electricity_endpoint_and_kwh_unit(monkeypatch):
    async def fake_get(self, url, params=None, **kwargs):
        return FakeResponse(_electricity_payload(15.0))
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    result = await get_fuel_price("Electricity")

    assert result["price"] == 0.15
    assert result["unit"] == "dollars per kWh"

@pytest.mark.anyio
async def test_unrecognized_fuel_type_falls_back_to_gasoline_endpoint(monkeypatch):
    calls = []
    async def fake_get(self, url, params=None, **kwargs):
        calls.append(dict(params) if params else params)
        return FakeResponse(_petroleum_payload("3.00"))
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    result = await get_fuel_price("Some Unknown Fuel")

    assert calls[0]["facets[product][]"] == "EPM0"
    assert result["unit"] == "dollars per gallon"

# --- _get_petroleum_price ---

@pytest.mark.anyio
async def test_petroleum_price_known_state_maps_to_eia_area_code(monkeypatch):
    calls = []
    async def fake_get(self, url, params=None, **kwargs):
        calls.append(dict(params) if params else params)
        return FakeResponse(_petroleum_payload("3.75"))
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    await _get_petroleum_price("EPM0", state="ca")

    assert calls[0]["facets[duoarea][]"] == "SCA"

@pytest.mark.anyio
async def test_petroleum_price_unmapped_state_uses_national_average(monkeypatch):
    calls = []
    async def fake_get(self, url, params=None, **kwargs):
        calls.append(dict(params) if params else params)
        return FakeResponse(_petroleum_payload("3.75"))
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    await _get_petroleum_price("EPM0", state="ZZ")

    assert calls[0]["facets[duoarea][]"] == "NUS"

@pytest.mark.anyio
async def test_petroleum_price_retries_national_when_state_has_no_data(monkeypatch):
    responses = [FakeResponse(_empty_payload()), FakeResponse(_petroleum_payload("3.10"))]
    calls = []
    async def fake_get(self, url, params=None, **kwargs):
        calls.append(dict(params) if params else params)
        return responses.pop(0)
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    price = await _get_petroleum_price("EPM0", state="CA")

    assert price == 3.10
    assert len(calls) == 2
    assert calls[0]["facets[duoarea][]"] == "SCA"
    assert calls[1]["facets[duoarea][]"] == "NUS"

# --- _get_electricity_price ---

@pytest.mark.anyio
async def test_electricity_price_converts_cents_to_dollars(monkeypatch):
    async def fake_get(self, url, params=None, **kwargs):
        return FakeResponse(_electricity_payload(20.0))
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    price = await _get_electricity_price(state="TX")

    assert price == 0.20

@pytest.mark.anyio
async def test_electricity_price_retries_national_when_state_has_no_data(monkeypatch):
    responses = [FakeResponse(_empty_payload()), FakeResponse(_electricity_payload(18.0))]
    calls = []
    async def fake_get(self, url, params=None, **kwargs):
        calls.append(dict(params) if params else params)
        return responses.pop(0)
    monkeypatch.setattr(httpx.AsyncClient, "get", fake_get)

    price = await _get_electricity_price(state="TX")

    assert price == 0.18
    assert calls[1]["facets[stateid][]"] == "US"
