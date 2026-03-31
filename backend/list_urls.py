import django
import os
import sys
from django.urls import get_resolver

# Add current directory to path so config can be found
sys.path.append(os.getcwd())

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def show_urls(patterns, prefix=''):
    for pattern in patterns:
        if hasattr(pattern, 'url_patterns'):
            show_urls(pattern.url_patterns, prefix + str(pattern.pattern))
        else:
            print(f"{prefix}{str(pattern.pattern)} -> {pattern.callback}")

if __name__ == '__main__':
    print("Listing all registered URLs:")
    show_urls(get_resolver().url_patterns)
