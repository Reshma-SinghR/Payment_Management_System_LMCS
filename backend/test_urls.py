import django
import os
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.urls import resolve, Resolver404

urls_to_test = [
    '/api/buses/',
    '/api/buses',
    '/api/students/',
    '/api/payments/receipts/',
]

for url in urls_to_test:
    try:
        match = resolve(url)
        print(f"URL '{url}' resolved to view: {match.func}")
    except Resolver404:
        print(f"URL '{url}' could not be resolved (404).")
    except Exception as e:
        print(f"URL '{url}' error: {e}")
