#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# Masar Platform - سيناريوهات سلوكيات الأدمن
# Admin Behavior Scenarios - Complete E2E Testing
# ═══════════════════════════════════════════════════════════════════════
# التبويبات:
#   1. تسجيل الدخول والوصول
#   2. إدارة المستخدمين (إنشاء / تعديل / تعطيل)
#   3. إدارة التخصصات (إنشاء / تعديل / تعطيل)
#   4. إدارة المراحل (إنشاء / تعديل / ترتيب / تعطيل)
#   5. إدارة القوالب (إنشاء / تعديل / تعطيل)
#   6. إعدادات المنصة (القراءة / التحديث)
#   7. إدارة الحصص (عرض / تعديل / إعفاء)
#   8. التقارير والإحصائيات
#   9. مراقبة المحادثات
#   10. صحة النظام
# ═══════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Reset counters
TOTAL_TESTS=0; PASSED_TESTS=0; FAILED_TESTS=0; SKIPPED_TESTS=0

print_banner "🧪 سيناريوهات سلوكيات الأدمن - مَسَار"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SETUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
check_server_health
login_admin
get_first_specialty


# ══════════════════════════════════════════════════════════════════════
# التبويب ١: تسجيل الدخول والوصول
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ١: تسجيل الدخول والوصول"

# --- 1.1 تسجيل دخول الأدمن ---
print_subsection "1.1 تسجيل دخول الأدمن"

RESP=$(api_post "/auth/login" "" '{"email":"admin@masar.sa","password":"admin123"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "تسجيل دخول الأدمن بنجاح" "200" "$STATUS"
assert_contains "يحتوي على token" "$BODY" "token"
assert_contains "الدور ADMIN" "$BODY" "ADMIN"

# --- 1.2 رفض تسجيل دخول أدمن بكلمة مرور خاطئة ---
print_subsection "1.2 رفض تسجيل الدخول بكلمة مرور خاطئة"

RESP=$(api_post "/auth/login" "" '{"email":"admin@masar.sa","password":"wrong"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض كلمة مرور خاطئة" "401" "$STATUS"

# --- 1.3 رفض وصول غير الأدمن لنقاط الإدارة ---
print_subsection "1.3 منع وصول غير الأدمن لنقاط الإدارة"

# إنشاء مستشار تجريبي
create_test_consultant

RESP=$(api_get "/admin/users" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض وصول المستشار لإدارة المستخدمين" "200" "$STATUS"

RESP=$(api_get "/admin/reports" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض وصول المستشار للتقارير" "200" "$STATUS"

# إنشاء رائد أعمال تجريبي
create_test_entrepreneur

RESP=$(api_get "/admin/users" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض وصول رائد الأعمال لإدارة المستخدمين" "200" "$STATUS"

# --- 1.4 جلب الملف الشخصي للأدمن ---
print_subsection "1.4 جلب الملف الشخصي للأدمن"

RESP=$(api_get "/auth/me" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الملف الشخصي" "200" "$STATUS"

ME_ROLE=$(echo "$BODY" | jq -r '.data.role // empty' 2>/dev/null)
assert_eq "الدور ADMIN" "ADMIN" "$ME_ROLE"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٢: إدارة المستخدمين
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٢: إدارة المستخدمين (إنشاء / تعديل / تعطيل)"

# --- 2.1 جلب قائمة المستخدمين ---
print_subsection "2.1 جلب قائمة المستخدمين (GET /api/admin/users)"

RESP=$(api_get "/admin/users" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب المستخدمين بنجاح" "200" "$STATUS"

USER_COUNT=$(echo "$BODY" | jq -r '.data.users | length' 2>/dev/null)
assert_gt "يوجد مستخدم واحد على الأقل" "$USER_COUNT" "0"

# --- 2.2 فلترة المستخدمين حسب الدور ---
print_subsection "2.2 فلترة المستخدمين حسب الدور"

RESP=$(api_get "/admin/users?role=CONSULTANT" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "فلترة المستشارين" "200" "$STATUS"

ALL_CONSULTANTS=$(echo "$BODY" | jq -r '[.data.users[] | select(.role != "CONSULTANT")] | length' 2>/dev/null)
assert_eq "جميع النتائج مستشارون" "0" "$ALL_CONSULTANTS"

RESP=$(api_get "/admin/users?role=ENTREPRENEUR" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "فلترة رواد الأعمال" "200" "$STATUS"

# --- 2.3 البحث عن مستخدم ---
print_subsection "2.3 البحث عن مستخدم"

RESP=$(api_get "/admin/users?search=admin" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "البحث عن مستخدم" "200" "$STATUS"

SEARCH_RESULTS=$(echo "$BODY" | jq -r '.data.users | length' 2>/dev/null)
assert_gte "نتيجة بحث واحدة على الأقل" "$SEARCH_RESULTS" "1"

# --- 2.4 إنشاء مستشار جديد ---
print_subsection "2.4 إنشاء مستشار جديد (POST /api/admin/users)"

NEW_CONSULTANT_EMAIL="admin.created.consultant.$(date +%s)@masar.sa"
RESP=$(api_post "/admin/users" "$ADMIN_TOKEN" "{
    \"name\": \"مستشار من الأدمن\",
    \"email\": \"${NEW_CONSULTANT_EMAIL}\",
    \"password\": \"test123\",
    \"role\": \"CONSULTANT\",
    \"specialtyId\": \"${SPECIALTY_ID}\",
    \"bio\": \"مستشار تم إنشاؤه من لوحة الأدمن\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إنشاء مستشار بنجاح" "201" "$STATUS"

NEW_CONSULTANT_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
HAS_PROFILE=$(echo "$BODY" | jq -r '.data.consultantProfile // empty' 2>/dev/null)
assert_not_eq "يحتوي على consultantProfile" "" "$HAS_PROFILE"

CREATED_BIO=$(echo "$BODY" | jq -r '.data.consultantProfile.bio // empty' 2>/dev/null)
assert_not_eq "النبذة موجودة" "" "$CREATED_BIO"

# --- 2.5 إنشاء مستشار بدون تخصص ---
print_subsection "2.5 منع إنشاء مستشار بدون تخصص"

RESP=$(api_post "/admin/users" "$ADMIN_TOKEN" "{
    \"name\": \"بدون تخصص\",
    \"email\": \"no.spec.$(date +%s)@masar.sa\",
    \"password\": \"test123\",
    \"role\": \"CONSULTANT\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض إنشاء مستشار بدون تخصص" "201" "$STATUS"

# --- 2.6 إنشاء رائد أعمال جديد ---
print_subsection "2.6 إنشاء رائد أعمال جديد"

NEW_ENT_EMAIL="admin.created.ent.$(date +%s)@masar.sa"
RESP=$(api_post "/admin/users" "$ADMIN_TOKEN" "{
    \"name\": \"رائد أعمال من الأدمن\",
    \"email\": \"${NEW_ENT_EMAIL}\",
    \"password\": \"test123\",
    \"role\": \"ENTREPRENEUR\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إنشاء رائد أعمال بنجاح" "201" "$STATUS"

NEW_ENT_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
HAS_ENT_PROFILE=$(echo "$BODY" | jq -r '.data.entrepreneurProfile // empty' 2>/dev/null)
assert_not_eq "يحتوي على entrepreneurProfile" "" "$HAS_ENT_PROFILE"

# التحقق من إنشاء حصة تلقائية
HAS_QUOTA=$(echo "$BODY" | jq -r '.data.entrepreneurProfile.quota // empty' 2>/dev/null)
assert_not_eq "تم إنشاء حصة تلقائية" "" "$HAS_QUOTA"

# --- 2.7 إنشاء مستخدم ببريد مكرر ---
print_subsection "2.7 منع إنشاء مستخدم ببريد مكرر"

RESP=$(api_post "/admin/users" "$ADMIN_TOKEN" "{
    \"name\": \"مكرر\",
    \"email\": \"${NEW_CONSULTANT_EMAIL}\",
    \"password\": \"test123\",
    \"role\": \"ENTREPRENEUR\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض بريد مكرر" "201" "$STATUS"

# --- 2.8 كلمة مرور قصيرة ---
print_subsection "2.8 منع إنشاء مستخدم بكلمة مرور قصيرة"

RESP=$(api_post "/admin/users" "$ADMIN_TOKEN" "{
    \"name\": \"قصيرة\",
    \"email\": \"short.pass.$(date +%s)@masar.sa\",
    \"password\": \"12\",
    \"role\": \"ENTREPRENEUR\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض كلمة مرور قصيرة" "201" "$STATUS"

# --- 2.9 بريد غير صالح ---
print_subsection "2.9 منع إنشاء مستخدم ببريد غير صالح"

RESP=$(api_post "/admin/users" "$ADMIN_TOKEN" "{
    \"name\": \"غير صالح\",
    \"email\": \"notanemail\",
    \"password\": \"test123\",
    \"role\": \"ENTREPRENEUR\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض بريد غير صالح" "201" "$STATUS"

# --- 2.10 تعديل مستخدم ---
print_subsection "2.10 تعديل بيانات مستشار (PATCH /api/admin/users)"

if [ -n "$NEW_CONSULTANT_ID" ]; then
    RESP=$(api_patch "/admin/users" "$ADMIN_TOKEN" "{
        \"userId\": \"${NEW_CONSULTANT_ID}\",
        \"name\": \"مستشار معدّل\",
        \"bio\": \"نبذة محدثة من الأدمن\"
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعديل المستخدم بنجاح" "200" "$STATUS"

    UPDATED_NAME=$(echo "$BODY" | jq -r '.data.name // empty' 2>/dev/null)
    assert_eq "الاسم تم تحديثه" "مستشار معدّل" "$UPDATED_NAME"
else
    skip_test "تعديل مستخدم" "لا يوجد مستخدم"
fi

# --- 2.11 تعطيل مستخدم ---
print_subsection "2.11 تعطيل مستخدم"

if [ -n "$NEW_CONSULTANT_ID" ]; then
    RESP=$(api_patch "/admin/users" "$ADMIN_TOKEN" "{
        \"userId\": \"${NEW_CONSULTANT_ID}\",
        \"isActive\": false
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعطيل المستخدم بنجاح" "200" "$STATUS"

    IS_ACTIVE=$(echo "$BODY" | jq -r '.data.isActive // true' 2>/dev/null)
    assert_eq "المستخدم معطّل" "false" "$IS_ACTIVE"
else
    skip_test "تعطيل مستخدم" "لا يوجد مستخدم"
fi

# --- 2.12 محاولة تسجيل دخول مستخدم معطّل ---
print_subsection "2.12 منع تسجيل دخول مستخدم معطّل"

RESP=$(api_post "/auth/login" "" "{\"email\":\"${NEW_CONSULTANT_EMAIL}\",\"password\":\"test123\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض تسجيل دخول مستخدم معطّل" "403" "$STATUS"

# --- 2.13 إعادة تفعيل مستخدم ---
print_subsection "2.13 إعادة تفعيل مستخدم"

if [ -n "$NEW_CONSULTANT_ID" ]; then
    RESP=$(api_patch "/admin/users" "$ADMIN_TOKEN" "{
        \"userId\": \"${NEW_CONSULTANT_ID}\",
        \"isActive\": true
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "إعادة التفعيل" "200" "$STATUS"

    IS_ACTIVE=$(echo "$BODY" | jq -r '.data.isActive // false' 2>/dev/null)
    assert_eq "المستخدم مفعّل" "true" "$IS_ACTIVE"
else
    skip_test "إعادة تفعيل مستخدم" "لا يوجد مستخدم"
fi

# --- 2.14 تصفح المستخدمين ---
print_subsection "2.14 تصفح المستخدمين (pagination)"

RESP=$(api_get "/admin/users?page=1&limit=5" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "تصفح المستخدمين" "200" "$STATUS"

HAS_PAGINATION=$(echo "$BODY" | jq -r '.data.pagination // empty' 2>/dev/null)
assert_not_eq "يحتوي على بيانات التصفح" "" "$HAS_PAGINATION"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٣: إدارة التخصصات
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٣: إدارة التخصصات (إنشاء / تعديل / تعطيل)"

# --- 3.1 جلب التخصصات ---
print_subsection "3.1 جلب التخصصات (GET /api/admin/specialties)"

RESP=$(api_get "/admin/specialties?includeInactive=true" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب التخصصات بنجاح" "200" "$STATUS"

SPEC_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null)
assert_gt "يوجد تخصص واحد على الأقل" "$SPEC_COUNT" "0"

# --- 3.2 إنشاء تخصص جديد ---
print_subsection "3.2 إنشاء تخصص جديد (POST /api/admin/specialties)"

RESP=$(api_post "/admin/specialties" "$ADMIN_TOKEN" '{
    "nameAr": "تخصص تجريبي",
    "nameEn": "Test Specialty",
    "description": "تخصص للاختبار",
    "icon": "🔬",
    "color": "#FF5733"
}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إنشاء تخصص بنجاح" "201" "$STATUS"

NEW_SPEC_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
assert_not_eq "تم الحصول على معرف التخصص" "" "$NEW_SPEC_ID"

CREATED_NAME_AR=$(echo "$BODY" | jq -r '.data.nameAr // empty' 2>/dev/null)
assert_eq "الاسم العربي صحيح" "تخصص تجريبي" "$CREATED_NAME_AR"

# --- 3.3 إنشاء تخصص بدون اسم ---
print_subsection "3.3 منع إنشاء تخصص بدون اسم عربي أو إنجليزي"

RESP=$(api_post "/admin/specialties" "$ADMIN_TOKEN" '{"nameAr":"فقط عربي"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض تخصص بدون اسم إنجليزي" "201" "$STATUS"

RESP=$(api_post "/admin/specialties" "$ADMIN_TOKEN" '{"nameEn":"English only"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض تخصص بدون اسم عربي" "201" "$STATUS"

# --- 3.4 تعديل تخصص ---
print_subsection "3.4 تعديل تخصص (PATCH /api/admin/specialties)"

if [ -n "$NEW_SPEC_ID" ]; then
    RESP=$(api_patch "/admin/specialties" "$ADMIN_TOKEN" "{
        \"id\": \"${NEW_SPEC_ID}\",
        \"nameAr\": \"تخصص معدّل\",
        \"description\": \"وصف محدّث\"
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعديل التخصص بنجاح" "200" "$STATUS"

    UPDATED_NAME=$(echo "$BODY" | jq -r '.data.nameAr // empty' 2>/dev/null)
    assert_eq "الاسم تم تحديثه" "تخصص معدّل" "$UPDATED_NAME"
else
    skip_test "تعديل تخصص" "لا يوجد تخصص"
fi

# --- 3.5 تعطيل تخصص ---
print_subsection "3.5 تعطيل تخصص (DELETE /api/admin/specialties)"

if [ -n "$NEW_SPEC_ID" ]; then
    RESP=$(api_delete "/admin/specialties?id=${NEW_SPEC_ID}" "$ADMIN_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعطيل التخصص بنجاح" "200" "$STATUS"

    IS_ACTIVE=$(echo "$BODY" | jq -r '.data.specialty.isActive // true' 2>/dev/null)
    assert_eq "التخصص معطّل" "false" "$IS_ACTIVE"
else
    skip_test "تعطيل تخصص" "لا يوجد تخصص"
fi

# --- 3.6 التخصصات النشطة فقط ---
print_subsection "3.6 فلترة التخصصات النشطة فقط"

RESP=$(api_get "/admin/specialties" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب التخصصات النشطة" "200" "$STATUS"

# جميع التخصصات المعادة يجب أن تكون نشطة
ALL_ACTIVE=$(echo "$BODY" | jq -r '[.data[] | select(.isActive == false)] | length' 2>/dev/null)
assert_eq "لا يوجد تخصصات معطّلة في القائمة الافتراضية" "0" "$ALL_ACTIVE"

# --- 3.7 التخصص يحتوي على عدد المستشارين ---
print_subsection "3.7 التخصص يحتوي على عدد المستشارين والمراحل"

RESP=$(api_get "/admin/specialties?includeInactive=true" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")

FIRST_SPEC_CONSULTANTS=$(echo "$BODY" | jq -r '.data[0]._count.consultants // 0' 2>/dev/null)
echo -e "    ℹ️  مستشارو التخصص الأول: ${FIRST_SPEC_CONSULTANTS}"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٤: إدارة المراحل
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٤: إدارة المراحل (إنشاء / تعديل / ترتيب / تعطيل)"

# --- 4.1 جلب المراحل ---
print_subsection "4.1 جلب المراحل (GET /api/admin/milestones)"

RESP=$(api_get "/admin/milestones?includeInactive=true" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب المراحل بنجاح" "200" "$STATUS"

MILESTONE_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null)
assert_gt "يوجد مرحلة واحدة على الأقل" "$MILESTONE_COUNT" "0"

# --- 4.2 إنشاء مرحلة جديدة ---
print_subsection "4.2 إنشاء مرحلة جديدة (POST /api/admin/milestones)"

RESP=$(api_post "/admin/milestones" "$ADMIN_TOKEN" "{
    \"titleAr\": \"مرحلة تجريبية\",
    \"titleEn\": \"Test Milestone\",
    \"descriptionAr\": \"وصف المرحلة التجريبية\",
    \"descriptionEn\": \"Test milestone description\",
    \"sortOrder\": 99,
    \"specialtyId\": \"${SPECIALTY_ID}\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إنشاء مرحلة بنجاح" "201" "$STATUS"

NEW_MILESTONE_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
assert_not_eq "تم الحصول على معرف المرحلة" "" "$NEW_MILESTONE_ID"

CREATED_TITLE=$(echo "$BODY" | jq -r '.data.titleAr // empty' 2>/dev/null)
assert_eq "العنوان العربي صحيح" "مرحلة تجريبية" "$CREATED_TITLE"

# --- 4.3 إنشاء مرحلة بدون بيانات مطلوبة ---
print_subsection "4.3 منع إنشاء مرحلة بدون بيانات مطلوبة"

RESP=$(api_post "/admin/milestones" "$ADMIN_TOKEN" '{"titleAr":"فقط عربي"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض مرحلة بدون عنوان إنجليزي" "201" "$STATUS"

RESP=$(api_post "/admin/milestones" "$ADMIN_TOKEN" '{"titleAr":"عربي","titleEn":"English"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض مرحلة بدون تخصص" "201" "$STATUS"

# --- 4.4 تعديل مرحلة ---
print_subsection "4.4 تعديل مرحلة (PATCH /api/admin/milestones)"

if [ -n "$NEW_MILESTONE_ID" ]; then
    RESP=$(api_patch "/admin/milestones" "$ADMIN_TOKEN" "{
        \"id\": \"${NEW_MILESTONE_ID}\",
        \"titleAr\": \"مرحلة معدّلة\",
        \"descriptionAr\": \"وصف محدّث\"
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعديل المرحلة بنجاح" "200" "$STATUS"

    UPDATED_TITLE=$(echo "$BODY" | jq -r '.data.titleAr // empty' 2>/dev/null)
    assert_eq "العنوان تم تحديثه" "مرحلة معدّلة" "$UPDATED_TITLE"
else
    skip_test "تعديل مرحلة" "لا يوجد مرحلة"
fi

# --- 4.5 تعطيل مرحلة ---
print_subsection "4.5 تعطيل مرحلة (DELETE /api/admin/milestones)"

if [ -n "$NEW_MILESTONE_ID" ]; then
    RESP=$(api_delete "/admin/milestones?id=${NEW_MILESTONE_ID}" "$ADMIN_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعطيل المرحلة بنجاح" "200" "$STATUS"
else
    skip_test "تعطيل مرحلة" "لا يوجد مرحلة"
fi

# --- 4.6 ترتيب المراحل ---
print_subsection "4.6 ترتيب المراحل (إعادة ترتيب)"

RESP=$(api_get "/admin/milestones?includeInactive=true" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
FIRST_MILE_ID=$(echo "$BODY" | jq -r '.data[0].id // empty' 2>/dev/null)
SECOND_MILE_ID=$(echo "$BODY" | jq -r '.data[1].id // empty' 2>/dev/null)

if [ -n "$FIRST_MILE_ID" ] && [ -n "$SECOND_MILE_ID" ]; then
    # Swap sortOrder
    FIRST_ORDER=$(echo "$BODY" | jq -r '.data[0].sortOrder // 0' 2>/dev/null)
    SECOND_ORDER=$(echo "$BODY" | jq -r '.data[1].sortOrder // 1' 2>/dev/null)

    # Update first to second's order
    RESP=$(api_patch "/admin/milestones" "$ADMIN_TOKEN" "{
        \"id\": \"${FIRST_MILE_ID}\",
        \"sortOrder\": ${SECOND_ORDER}
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تحديث ترتيب المرحلة الأولى" "200" "$STATUS"
else
    skip_test "ترتيب المراحل" "لا يوجد مرحلتين"
fi

# --- 4.7 تعيين مستشار للمرحلة ---
print_subsection "4.7 تعيين مستشار لمرحلة"

RESP=$(api_get "/admin/milestones?includeInactive=true" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
ACTIVE_MILE_ID=$(echo "$BODY" | jq -r '.data[0].id // empty' 2>/dev/null)

if [ -n "$ACTIVE_MILE_ID" ]; then
    RESP=$(api_patch "/admin/milestones" "$ADMIN_TOKEN" "{
        \"id\": \"${ACTIVE_MILE_ID}\",
        \"consultantId\": \"${CONSULTANT_PROFILE_ID}\"
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعيين مستشار للمرحلة" "200" "$STATUS"
else
    skip_test "تعيين مستشار" "لا يوجد مرحلة"
fi


# ══════════════════════════════════════════════════════════════════════
# التبويب ٥: إدارة القوالب
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٥: إدارة القوالب (إنشاء / تعديل / تعطيل)"

# --- 5.1 جلب القوالب ---
print_subsection "5.1 جلب القوالب (GET /api/admin/templates)"

RESP=$(api_get "/admin/templates?includeInactive=true" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب القوالب بنجاح" "200" "$STATUS"

# --- 5.2 إنشاء قالب جديد ---
print_subsection "5.2 إنشاء قالب جديد مع ملف (POST /api/admin/templates)"

# إنشاء ملف PDF وهمي
TEST_TEMPLATE="/tmp/masar_template_test_$(date +%s).pdf"
echo "%PDF-1.4 test template file" > "$TEST_TEMPLATE"

RESP=$(curl -s -w '\n%{http_code}' --max-time ${TIMEOUT} \
    -X POST \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -F "file=@${TEST_TEMPLATE}" \
    -F "nameAr=قالب تجريبي" \
    -F "nameEn=Test Template" \
    -F "descriptionAr=قالب للاختبار" \
    -F "descriptionEn=Test template" \
    -F "category=business-plan" \
    -F "specialtyId=${SPECIALTY_ID}" \
    "${BASE_URL}/admin/templates")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إنشاء قالب بنجاح" "201" "$STATUS"

TEMPLATE_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
rm -f "$TEST_TEMPLATE"

# --- 5.3 إنشاء قالب بدون ملف ---
print_subsection "5.3 منع إنشاء قالب بدون ملف"

RESP=$(curl -s -w '\n%{http_code}' --max-time ${TIMEOUT} \
    -X POST \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -F "nameAr=بدون ملف" \
    -F "nameEn=No file" \
    "${BASE_URL}/admin/templates")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض قالب بدون ملف" "201" "$STATUS"

# --- 5.4 تعديل قالب ---
print_subsection "5.4 تعديل بيانات قالب (PATCH /api/admin/templates)"

if [ -n "$TEMPLATE_ID" ]; then
    RESP=$(api_patch "/admin/templates" "$ADMIN_TOKEN" "{
        \"id\": \"${TEMPLATE_ID}\",
        \"nameAr\": \"قالب معدّل\",
        \"descriptionAr\": \"وصف محدّث\"
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعديل القالب بنجاح" "200" "$STATUS"
else
    skip_test "تعديل قالب" "لا يوجد قالب"
fi

# --- 5.5 تعطيل قالب ---
print_subsection "5.5 تعطيل قالب (DELETE /api/admin/templates)"

if [ -n "$TEMPLATE_ID" ]; then
    RESP=$(api_delete "/admin/templates?id=${TEMPLATE_ID}" "$ADMIN_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعطيل القالب بنجاح" "200" "$STATUS"
else
    skip_test "تعطيل قالب" "لا يوجد قالب"
fi


# ══════════════════════════════════════════════════════════════════════
# التبويب ٦: إعدادات المنصة
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٦: إعدادات المنصة (القراءة / التحديث)"

# --- 6.1 جلب الإعدادات ---
print_subsection "6.1 جلب إعدادات المنصة (GET /api/admin/configs)"

RESP=$(api_get "/admin/configs" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الإعدادات بنجاح" "200" "$STATUS"

CONFIG_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null)
assert_gt "يوجد إعداد واحد على الأقل" "$CONFIG_COUNT" "0"

# --- 6.2 تحديث إعداد رقمي ---
print_subsection "6.2 تحديث إعداد رقمي (PATCH /api/admin/configs)"

# حفظ القيمة الأصلية
ORIGINAL_QUOTA=$(echo "$BODY" | jq -r '.data[] | select(.key=="DEFAULT_MONTHLY_QUOTA") | .value' 2>/dev/null)
echo -e "    ℹ️  القيمة الأصلية DEFAULT_MONTHLY_QUOTA: ${ORIGINAL_QUOTA}"

RESP=$(api_patch "/admin/configs" "$ADMIN_TOKEN" '{"key":"DEFAULT_MONTHLY_QUOTA","value":"8"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "تحديث الإعداد الرقمي" "200" "$STATUS"

UPDATED_VALUE=$(echo "$BODY" | jq -r '.data.value // empty' 2>/dev/null)
assert_eq "القيمة تحدثت إلى 8" "8" "$UPDATED_VALUE"

# إعادة القيمة الأصلية
if [ -n "$ORIGINAL_QUOTA" ]; then
    api_patch "/admin/configs" "$ADMIN_TOKEN" "{\"key\":\"DEFAULT_MONTHLY_QUOTA\",\"value\":\"${ORIGINAL_QUOTA}\"}" > /dev/null 2>&1
fi

# --- 6.3 منع تحديث إعداد رقمي بقيمة غير رقمية ---
print_subsection "6.3 منع تحديث إعداد رقمي بقيمة غير رقمية"

RESP=$(api_patch "/admin/configs" "$ADMIN_TOKEN" '{"key":"DEFAULT_MONTHLY_QUOTA","value":"not-a-number"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض قيمة غير رقمية لإعداد رقمي" "200" "$STATUS"

# --- 6.4 تحديث إعداد منطقي ---
print_subsection "6.4 تحديث إعداد منطقي"

# إيجاد إعداد منطقي
BOOL_CONFIG_KEY=$(echo "$BODY" | jq -r '.data[] | select(.type=="BOOLEAN") | .key' 2>/dev/null | head -1)
if [ -n "$BOOL_CONFIG_KEY" ]; then
    RESP=$(api_patch "/admin/configs" "$ADMIN_TOKEN" "{\"key\":\"${BOOL_CONFIG_KEY}\",\"value\":\"true\"}")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تحديث إعداد منطقي" "200" "$STATUS"
else
    skip_test "تحديث إعداد منطقي" "لا يوجد إعداد BOOLEAN"
fi

# --- 6.5 منع وصول غير الأدمن ---
print_subsection "6.5 منع وصول غير الأدمن للإعدادات"

RESP=$(api_get "/admin/configs" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض وصول المستشار للإعدادات" "200" "$STATUS"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٧: إدارة الحصص
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٧: إدارة الحصص (عرض / تعديل / إعفاء)"

# --- 7.1 جلب الحصص ---
print_subsection "7.1 جلب الحصص (GET /api/admin/quotas)"

RESP=$(api_get "/admin/quotas" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الحصص بنجاح" "200" "$STATUS"

QUOTA_COUNT=$(echo "$BODY" | jq -r '.data.quotas | length' 2>/dev/null)
assert_gt "يوجد حصة واحدة على الأقل" "$QUOTA_COUNT" "0"

# حفظ أول حصة
FIRST_QUOTA_ID=$(echo "$BODY" | jq -r '.data.quotas[0].id // empty' 2>/dev/null)

# --- 7.2 البحث في الحصص ---
print_subsection "7.2 البحث في الحصص"

RESP=$(api_get "/admin/quotas?search=test" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "البحث في الحصص" "200" "$STATUS"

# --- 7.3 تعديل حد الحصة الشهرية ---
print_subsection "7.3 تعديل حد الحصة الشهرية (PATCH /api/admin/quotas)"

if [ -n "$FIRST_QUOTA_ID" ]; then
    RESP=$(api_patch "/admin/quotas" "$ADMIN_TOKEN" "{
        \"id\": \"${FIRST_QUOTA_ID}\",
        \"monthlyBookingLimit\": 10
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعديل حد الحصة" "200" "$STATUS"

    UPDATED_LIMIT=$(echo "$BODY" | jq -r '.data.monthlyBookingLimit // 0' 2>/dev/null)
    assert_eq "الحد تحدث إلى 10" "10" "$UPDATED_LIMIT"
else
    skip_test "تعديل حد الحصة" "لا يوجد حصة"
fi

# --- 7.4 إعفاء رائد أعمال من الحصة ---
print_subsection "7.4 إعفاء رائد أعمال من الحصة"

if [ -n "$FIRST_QUOTA_ID" ]; then
    RESP=$(api_patch "/admin/quotas" "$ADMIN_TOKEN" "{
        \"id\": \"${FIRST_QUOTA_ID}\",
        \"isExempted\": true,
        \"customLimit\": 50
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "إعفاء رائد أعمال" "200" "$STATUS"

    IS_EXEMPTED=$(echo "$BODY" | jq -r '.data.isExempted // false' 2>/dev/null)
    CUSTOM_LIMIT=$(echo "$BODY" | jq -r '.data.customLimit // 0' 2>/dev/null)
    assert_eq "تم الإعفاء" "true" "$IS_EXEMPTED"
    assert_eq "الحد المخصص 50" "50" "$CUSTOM_LIMIT"
else
    skip_test "إعفاء من الحصة" "لا يوجد حصة"
fi

# --- 7.5 إلغاء الإعفاء ---
print_subsection "7.5 إلغاء إعفاء رائد أعمال"

if [ -n "$FIRST_QUOTA_ID" ]; then
    RESP=$(api_patch "/admin/quotas" "$ADMIN_TOKEN" "{
        \"id\": \"${FIRST_QUOTA_ID}\",
        \"isExempted\": false,
        \"customLimit\": null
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "إلغاء الإعفاء" "200" "$STATUS"

    IS_EXEMPTED=$(echo "$BODY" | jq -r '.data.isExempted // true' 2>/dev/null)
    assert_eq "تم إلغاء الإعفاء" "false" "$IS_EXEMPTED"
else
    skip_test "إلغاء إعفاء" "لا يوجد حصة"
fi

# --- 7.6 منع تحديد حد سالب ---
print_subsection "7.6 منع تحديد حد حصة سالب"

if [ -n "$FIRST_QUOTA_ID" ]; then
    RESP=$(api_patch "/admin/quotas" "$ADMIN_TOKEN" "{
        \"id\": \"${FIRST_QUOTA_ID}\",
        \"monthlyBookingLimit\": -1
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_not_eq "رفض حد سالب" "200" "$STATUS"
else
    skip_test "حد سالب" "لا يوجد حصة"
fi

# --- 7.7 تصفح الحصص ---
print_subsection "7.7 تصفح الحصص (pagination)"

RESP=$(api_get "/admin/quotas?page=1&limit=5" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "تصفح الحصص" "200" "$STATUS"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٨: التقارير والإحصائيات
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٨: التقارير والإحصائيات"

# --- 8.1 جلب التقارير ---
print_subsection "8.1 جلب التقارير (GET /api/admin/reports)"

RESP=$(api_get "/admin/reports" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب التقارير بنجاح" "200" "$STATUS"

# --- 8.2 التحقق من محتوى التقرير ---
print_subsection "8.2 التحقق من محتوى التقرير"

assert_contains "يحتوي على إحصائيات المستخدمين" "$BODY" "users"
assert_contains "يحتوي على إحصائيات الحجوزات" "$BODY" "bookings"
assert_contains "يحتوي على إحصائيات المراحل" "$BODY" "milestones"

TOTAL_USERS=$(echo "$BODY" | jq -r '.data.users.total // 0' 2>/dev/null)
assert_gt "إجمالي المستخدمين أكبر من 0" "$TOTAL_USERS" "0"

TOTAL_CONSULTANTS=$(echo "$BODY" | jq -r '.data.users.consultants // 0' 2>/dev/null)
TOTAL_ENTREPRENEURS=$(echo "$BODY" | jq -r '.data.users.entrepreneurs // 0' 2>/dev/null)
echo -e "    ℹ️  إجمالي المستخدمين: ${TOTAL_USERS} (مستشارون: ${TOTAL_CONSULTANTS}, رواد أعمال: ${TOTAL_ENTREPRENEURS})"

# --- 8.3 أداء المستشارين ---
print_subsection "8.3 أداء المستشارين"

PERF_COUNT=$(echo "$BODY" | jq -r '.data.consultantPerformance | length' 2>/dev/null)
echo -e "    ℹ️  عدد المستشارين في التقرير: ${PERF_COUNT}"

# --- 8.4 الحجوزات الأخيرة ---
print_subsection "8.4 الحجوزات الأخيرة"

RECENT_COUNT=$(echo "$BODY" | jq -r '.data.recentBookings | length' 2>/dev/null)
echo -e "    ℹ️  عدد الحجوزات الأخيرة: ${RECENT_COUNT}"

# --- 8.5 إحصائيات المحادثات ---
print_subsection "8.5 إحصائيات المحادثات"

TOTAL_ROOMS=$(echo "$BODY" | jq -r '.data.chat.totalRooms // 0' 2>/dev/null)
TOTAL_MESSAGES=$(echo "$BODY" | jq -r '.data.chat.totalMessages // 0' 2>/dev/null)
echo -e "    ℹ️  غرف المحادثة: ${TOTAL_ROOMS}, الرسائل: ${TOTAL_MESSAGES}"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٩: مراقبة المحادثات
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٩: مراقبة المحادثات"

# --- 9.1 جلب غرف المحادثة ---
print_subsection "9.1 جلب جميع غرف المحادثة (GET /api/admin/chat)"

RESP=$(api_get "/admin/chat" "$ADMIN_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب غرف المحادثة بنجاح" "200" "$STATUS"

# --- 9.2 جلب رسائل غرفة محددة ---
print_subsection "9.2 جلب رسائل غرفة محددة (GET /api/admin/chat?roomId=...)"

ROOM_ID=$(echo "$BODY" | jq -r '.data.rooms[0].id // empty' 2>/dev/null)
if [ -n "$ROOM_ID" ]; then
    RESP=$(api_get "/admin/chat?roomId=${ROOM_ID}" "$ADMIN_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "جلب رسائل غرفة محددة" "200" "$STATUS"
else
    skip_test "جلب رسائل غرفة" "لا يوجد غرف"
fi

# --- 9.3 منع وصول غير الأدمن ---
print_subsection "9.3 منع وصول غير الأدمن لمراقبة المحادثات"

RESP=$(api_get "/admin/chat" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض وصول المستشار" "200" "$STATUS"


# ══════════════════════════════════════════════════════════════════════
# التبويب ١٠: صحة النظام
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ١٠: صحة النظام"

# --- 10.1 فحص الصحة ---
print_subsection "10.1 فحص صحة النظام (GET /api/health)"

RESP=$(api_get "/health" "")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "فحص الصحة بنجاح" "200" "$STATUS"
assert_contains "الحالة healthy" "$BODY" "healthy"
assert_contains "معلومات قاعدة البيانات" "$BODY" "database"
assert_contains "معلومات النظام" "$BODY" "system"

# --- 10.2 التحقق من تفاصيل الصحة ---
print_subsection "10.2 التحقق من تفاصيل الصحة"

DB_STATUS=$(echo "$BODY" | jq -r '.data.database.status // empty' 2>/dev/null)
assert_eq "قاعدة البيانات متصلة" "connected" "$DB_STATUS"

UPTIME=$(echo "$BODY" | jq -r '.data.uptime // 0' 2>/dev/null)
assert_gt "وقت التشغيل أكبر من 0" "$UPTIME" "0"

METRICS_TOTAL=$(echo "$BODY" | jq -r '.data.metrics.totalUsers // 0' 2>/dev/null)
assert_gte "إجمالي المستخدمين في المقاييس" "$METRICS_TOTAL" "1"

# --- 10.3 الإحصائيات العامة ---
print_subsection "10.3 الإحصائيات العامة (GET /api/stats)"

RESP=$(api_get "/stats" "")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الإحصائيات العامة" "200" "$STATUS"

ENT_COUNT=$(echo "$BODY" | jq -r '.data.entrepreneurs // 0' 2>/dev/null)
assert_gte "عدد رواد الأعمال" "$ENT_COUNT" "0"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLEANUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cleanup_test_data

# Deactivate additional test users
for test_uid in "${NEW_CONSULTANT_ID:-}" "${NEW_ENT_ID:-}"; do
    if [ -n "$test_uid" ] && [ -n "${ADMIN_TOKEN:-}" ]; then
        api_patch "/admin/users" "$ADMIN_TOKEN" "{\"userId\":\"${test_uid}\",\"isActive\":false}" > /dev/null 2>&1 || true
    fi
done

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print_summary "الأدمن"
