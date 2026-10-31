from django.urls import path, re_path

from common import views as common
from common.response import not_found
from sample import codes, layouts, users

urlpatterns = [
    path('api/common/codes', common.codes),
    # 샘플 업무 API
    path('api/users', users.users),
    path('api/users/save', users.save),
    path('api/users/<str:user_id>', users.user),
    path('api/codes/groups', codes.groups),
    path('api/codes/groups/save', codes.save_groups),
    path('api/codes', codes.codes),
    path('api/codes/save', codes.save_codes),
    path('api/layouts', layouts.maps),
    path('api/layouts/items', layouts.items),
    path('api/layouts/items/save', layouts.save_items),
    # 없는 API 도 공통 형식으로
    re_path(r'^api/.*$', not_found),
]
