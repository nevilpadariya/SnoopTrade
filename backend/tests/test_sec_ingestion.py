import os
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from scripts import sec_filing_data_extraction_script as sec


@pytest.fixture
def collection(monkeypatch):
    collection = MagicMock()
    monkeypatch.setattr(sec, 'get_db', lambda: {'form_4_links_DIS': collection})
    monkeypatch.setattr(sec, 'fetch_form_4_links', lambda *a, **kw: [])
    return collection


def test_empty_refresh_creates_legacy_safe_unique_index(collection):
    sec.insert_form4_data('DIS', '0001744489')
    collection.create_index.assert_called_once_with(
        [('_dedupe_key', 1)], name='idx_dedupe_key_unique_strings',
        unique=True, partialFilterExpression={'_dedupe_key': {'$type': 'string'}},
    )
    collection.bulk_write.assert_not_called()


def test_refresh_passes_keyed_transactions_to_bulk_upsert(collection, monkeypatch):
    monkeypatch.setattr(sec, 'fetch_form_4_links', lambda *a, **kw: ['filing.xml'])
    monkeypatch.setattr(sec, 'extract_details_from_form4', lambda _: {
        'issuer': {'trading_symbol': 'DIS'},
        'transactions': [{'transaction_date': '2026-10-29', 'shares': 10}],
    })
    collection.bulk_write.return_value = SimpleNamespace(upserted_count=1, modified_count=0)
    sec.insert_form4_data('DIS', '0001744489')
    operations = collection.bulk_write.call_args.args[0]
    assert len(operations) == 1
    assert len(operations[0]._filter['_dedupe_key']) == 64
    assert operations[0]._upsert is True


def test_write_failure_fails_the_workflow(collection, monkeypatch):
    monkeypatch.setattr(sec, 'fetch_form_4_links', lambda *a, **kw: ['filing.xml'])
    monkeypatch.setattr(sec, 'extract_details_from_form4', lambda _: {'transactions': [{}]})
    collection.bulk_write.side_effect = RuntimeError('database unavailable')
    with pytest.raises(RuntimeError, match='database unavailable'):
        sec.insert_form4_data('DIS', '0001744489')


@pytest.mark.skipif(not os.getenv('MONGODB_TEST_URI'), reason='requires a test MongoDB server')
def test_real_mongodb_preserves_legacy_rows_and_rejects_duplicate_keys(monkeypatch):
    client = MongoClient(os.environ['MONGODB_TEST_URI'], serverSelectionTimeoutMS=5000)
    database_name = 'snooptrade_test_' + uuid4().hex
    database = client[database_name]
    collection = database['form_4_links_DIS']
    try:
        collection.insert_many([{}, {}, {'_dedupe_key': None}, {'_dedupe_key': None}])
        monkeypatch.setattr(sec, 'get_db', lambda: database)
        monkeypatch.setattr(sec, 'fetch_form_4_links', lambda *a, **kw: [])
        sec.insert_form4_data('DIS', '0001744489')
        sec.insert_form4_data('DIS', '0001744489')  # Index creation is repeatable.
        collection.insert_one({'_dedupe_key': 'new-key'})
        with pytest.raises(DuplicateKeyError):
            collection.insert_one({'_dedupe_key': 'new-key'})
        assert collection.count_documents({}) == 5
    finally:
        client.drop_database(database_name)
        client.close()
