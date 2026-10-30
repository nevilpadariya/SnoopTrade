"""Run separately from unit tests, which replace database modules with fakes."""

import importlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.skipif(
    not os.getenv('MONGODB_TEST_URI'), reason='requires an isolated test MongoDB server',
)


@pytest.fixture(scope='module')
def api():
    with pytest.MonkeyPatch.context() as patch:
        patch.setenv('MONGODB_URI', os.environ['MONGODB_TEST_URI'])
        patch.setenv('JWT_SECRET_KEY', secrets.token_hex(32))
        patch.setenv('ENABLE_SCHEDULER', 'false')
        patch.setenv('EVENT_BUS_BACKEND', 'memory')
        patch.setenv('FORECAST_ENGINE', 'ewm')
        database = importlib.import_module('database.database')
        prefix = 'snooptrade_test_' + uuid4().hex
        names = [prefix + suffix for suffix in ('_users', '_stocks', '_sec')]
        # Use the real client, collections and indexes in disposable databases.
        patch.setattr(database, 'user_db', database.client[names[0]])
        patch.setattr(database, 'stock_db', database.client[names[1]])
        patch.setattr(database, 'sec_db', database.client[names[2]])
        app = importlib.import_module('app').app
        try:
            with TestClient(app) as client:
                yield client, database
        finally:
            for name in names:
                database.client.drop_database(name)
            database.client.close()


def test_health_and_protected_routes(api):
    client, _ = api
    assert client.get('/health').json() == {'status': 'ok'}
    assert client.get('/health/ready').json() == {'status': 'ready'}
    assert client.get('/stocks/AAPL').status_code == 401
    assert client.get('/auth/me').status_code == 401


def test_signup_login_refresh_and_market_data(api):
    client, database = api
    email = 'integration@example.com'
    password = 'Local-test-password-2026'
    signup = client.post('/auth/signup', json={
        'name': 'Integration User', 'email': email, 'password': password,
    })
    assert signup.status_code == 201, signup.text
    assert client.post('/auth/signup', json={
        'name': 'Integration User', 'email': email, 'password': password,
    }).status_code == 409
    assert client.post('/auth/token', data={
        'username': email, 'password': 'wrong', 'login_type': 'normal',
    }).status_code == 401
    login = client.post('/auth/token', data={
        'username': email, 'password': password, 'login_type': 'normal',
    })
    assert login.status_code == 200, login.text
    tokens = login.json()
    headers = {'Authorization': 'Bearer ' + tokens['access_token']}
    assert client.get('/auth/me', headers=headers).json()['email'] == email

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    database.stock_db['stock_data_AAPL'].insert_many([
        {'ticker': 'AAPL', 'Date': now - timedelta(days=i),
         'Open': 100.0 + i, 'High': 110.0 + i, 'Low': 90.0 + i,
         'Close': 105.0 + i, 'Volume': 1000}
        for i in range(3)
    ])
    database.sec_db['form_4_links_AAPL'].insert_one({
        'trading_symbol': 'AAPL', 'transaction_date': now.strftime('%Y-%m-%d'),
        'transaction_code': 'P', 'shares': '10',
    })
    stocks = client.get('/stocks/AAPL?period=1w', headers=headers)
    assert stocks.status_code == 200, stocks.text
    assert len(stocks.json()) == 3
    transactions = client.get('/transactions/AAPL?time_period=1w', headers=headers)
    assert transactions.status_code == 200, transactions.text
    assert transactions.json()[0]['shares'] == '10'
    combined = client.get('/prefetch/AAPL?period=1w', headers=headers)
    assert combined.status_code == 200, combined.text
    assert len(combined.json()['stock_data']) == 3
    forecast = client.post('/future/AAPL', headers=headers, json=stocks.json())
    assert forecast.status_code == 200, forecast.text
    assert len(forecast.json()) == 30

    refresh = client.post('/auth/refresh', json={'refresh_token': tokens['refresh_token']})
    assert refresh.status_code == 200, refresh.text
    assert client.post('/auth/refresh', json={
        'refresh_token': tokens['refresh_token'],
    }).status_code == 401
    assert client.post('/auth/logout', headers=headers).status_code == 200
    assert client.post('/auth/refresh', json={
        'refresh_token': refresh.json()['refresh_token'],
    }).status_code == 401
