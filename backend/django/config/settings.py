"""
설정은 환경변수로 바꾼다.
  DB=postgres | oracle   (기본 postgres)
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY', 'change-me-in-production')
DEBUG = os.environ.get('DEBUG', 'true').lower() == 'true'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# 인증·세션 테이블을 쓰지 않는 API 전용 구성. 로그인을 붙일 때 auth 앱을 추가한다
INSTALLED_APPS = [
    'rest_framework',
    'common',
    'sample',
]

MIDDLEWARE = [
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'
APPEND_SLASH = False

_db = os.environ.get('DB', 'postgres')
if _db == 'oracle':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.oracle',
            # host:port/service_name
            'NAME': f"{os.environ.get('DB_HOST', 'localhost')}:{os.environ.get('DB_PORT', '1521')}/{os.environ.get('DB_NAME', 'FREEPDB1')}",
            'USER': os.environ.get('DB_USER', 'app'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'app'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
            'NAME': os.environ.get('DB_NAME', 'appdb'),
            'USER': os.environ.get('DB_USER', 'app'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'app'),
        }
    }

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': ['rest_framework.renderers.JSONRenderer'],
    'DEFAULT_PARSER_CLASSES': ['rest_framework.parsers.JSONParser'],
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'UNAUTHENTICATED_USER': None,
    # 모든 오류를 { success, code, message, data } 로
    'EXCEPTION_HANDLER': 'common.response.exception_handler',
}

LANGUAGE_CODE = 'ko-kr'
TIME_ZONE = 'Asia/Seoul'
USE_TZ = False

LOGGING = {
    'version': 1,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'loggers': {'common': {'handlers': ['console'], 'level': 'INFO'}},
}
