#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# Masar Platform - سيناريوهات سلوكيات المستشار
# Consultant Behavior Scenarios - Complete E2E Testing
# ═══════════════════════════════════════════════════════════════════════
# التبويبات:
#   1. تسجيل الدخول والملف الشخصي
#   2. إدارة التوفر الأسبوعي (إنشاء / تعديل / حذف / استنساخ)
#   3. الحجوزات (عرض / إكمال / عدم حضور)
#   4. رحلة رواد الأعمال (مراجعة المراحل / قبول / رفض)
#   5. المحادثات
#   6. القوالب
#   7. الإشعارات
# ═══════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Reset counters
TOTAL_TESTS=0; PASSED_TESTS=0; FAILED_TESTS=0; SKIPPED_TESTS=0

print_banner "🧪 سيناريوهات سلوكيات المستشار - مَسَار"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SETUP: Admin login + Create test consultant + Get specialty
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
check_server_health
login_admin
get_first_specialty
create_test_consultant

# Get first milestone for later use
get_first_milestone

# ══════════════════════════════════════════════════════════════════════
# التبويب ١: تسجيل الدخول والملف الشخصي
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ١: تسجيل الدخول والملف الشخصي"

# --- 1.1 تسجيل الدخول ---
print_subsection "1.1 تسجيل دخول المستشار"

# تسجيل دخول ناجح
RESP=$(api_post "/auth/login" "" "{\"email\":\"${CONSULTANT_EMAIL}\",\"password\":\"${CONSULTANT_PASSWORD}\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "تسجيل دخول ناجح ببيانات صحيحة" "200" "$STATUS"
assert_contains "الاستجابة تحتوي على token" "$BODY" "token"
assert_contains "الاستجابة تحتوي على دور المستشار" "$BODY" "CONSULTANT"

# بيانات خاطئة
RESP=$(api_post "/auth/login" "" "{\"email\":\"${CONSULTANT_EMAIL}\",\"password\":\"wrongpass\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض تسجيل الدخول بكلمة مرور خاطئة" "401" "$STATUS"

# حقل مفقود
RESP=$(api_post "/auth/login" "" "{\"email\":\"${CONSULTANT_EMAIL}\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض تسجيل الدخول بدون كلمة مرور" "400" "$STATUS"

# --- 1.2 جلب الملف الشخصي ---
print_subsection "1.2 جلب الملف الشخصي (GET /api/auth/me)"

RESP=$(api_get "/auth/me" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الملف الشخصي بنجاح" "200" "$STATUS"

ME_ROLE=$(echo "$BODY" | jq -r '.data.role // empty' 2>/dev/null)
ME_NAME=$(echo "$BODY" | jq -r '.data.name // empty' 2>/dev/null)
assert_eq "الدور هو CONSULTANT" "CONSULTANT" "$ME_ROLE"
assert_contains "الاسم موجود" "$BODY" "مستشار تجريبي"

# الملف الشخصي يحتوي على consultantProfile
HAS_PROFILE=$(echo "$BODY" | jq -r '.data.consultantProfile // empty' 2>/dev/null)
assert_not_eq "يحتوي على consultantProfile" "" "$HAS_PROFILE"

# بدون token
RESP=$(api_get "/auth/me" "")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض الوصول بدون token" "401" "$STATUS"

# --- 1.3 التحقق من بيانات الملف الشخصي ---
print_subsection "1.3 التحقق من بيانات الملف الشخصي"

SPECIALTY_NAME=$(echo "$BODY" | jq -r '.data.consultantProfile.specialty.nameAr // empty' 2>/dev/null)
BIO=$(echo "$BODY" | jq -r '.data.consultantProfile.bio // empty' 2>/dev/null)
assert_not_eq "التخصص موجود في الملف الشخصي" "" "$SPECIALTY_NAME"
assert_not_eq "النبذة موجودة في الملف الشخصي" "" "$BIO"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٢: إدارة التوفر الأسبوعي
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٢: إدارة التوفر الأسبوعي (إنشاء / تعديل / حذف / استنساخ)"

# --- 2.1 إنشاء فترات توفر ---
print_subsection "2.1 إنشاء فترات توفر جديدة (POST /api/bookings/availability)"

RESP=$(api_post "/bookings/availability" "$CONSULTANT_TOKEN" '{
    "slots": [
        {"dayOfWeek": 0, "startTime": "09:00", "endTime": "12:00", "slotDuration": 30},
        {"dayOfWeek": 0, "startTime": "14:00", "endTime": "17:00", "slotDuration": 45},
        {"dayOfWeek": 2, "startTime": "10:00", "endTime": "13:00", "slotDuration": 60},
        {"dayOfWeek": 4, "startTime": "09:00", "endTime": "11:00", "slotDuration": 30}
    ]
}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إنشاء فترات التوفر بنجاح" "201" "$STATUS"
assert_success "استجابة ناجحة" "$BODY"

CREATED_COUNT=$(echo "$BODY" | jq -r '.data.count // 0' 2>/dev/null)
assert_gte "تم إنشاء 4 فترات على الأقل" "$CREATED_COUNT" "4"

# --- 2.2 إنشاء بتخطيط خاطئ ---
print_subsection "2.2 التحقق من صحة البيانات عند الإنشاء"

# dayOfWeek خارج النطاق
RESP=$(api_post "/bookings/availability" "$CONSULTANT_TOKEN" '{
    "slots": [{"dayOfWeek": 9, "startTime": "09:00", "endTime": "12:00"}]
}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض dayOfWeek خارج النطاق" "400" "$STATUS"

# startTime بعد endTime
RESP=$(api_post "/bookings/availability" "$CONSULTANT_TOKEN" '{
    "slots": [{"dayOfWeek": 1, "startTime": "17:00", "endTime": "09:00"}]
}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض startTime بعد endTime" "400" "$STATUS"

# مصفوفة فارغة
RESP=$(api_post "/bookings/availability" "$CONSULTANT_TOKEN" '{"slots": []}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض مصفوفة فترات فارغة" "400" "$STATUS"

# slotDuration أقل من 15
RESP=$(api_post "/bookings/availability" "$CONSULTANT_TOKEN" '{
    "slots": [{"dayOfWeek": 1, "startTime": "09:00", "endTime": "10:00", "slotDuration": 5}]
}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض slotDuration أقل من 15 دقيقة" "400" "$STATUS"

# --- 2.3 جلب فترات التوفر ---
print_subsection "2.3 جلب فترات التوفر (GET /api/bookings/availability?consultantId=me)"

RESP=$(api_get "/bookings/availability?consultantId=me" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب فترات التوفر بنجاح" "200" "$STATUS"
assert_success "استجابة ناجحة" "$BODY"

SLOT_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null)
assert_gte "عدد الفترات 4 على الأقل" "$SLOT_COUNT" "4"

# تحقق من البيانات
FIRST_DAY=$(echo "$BODY" | jq -r '.data[0].dayOfWeek // -1' 2>/dev/null)
assert_gte "يوم الأسبوع قيمة صحيحة (0-6)" "$FIRST_DAY" "0"

FIRST_START=$(echo "$BODY" | jq -r '.data[0].startTime // ""' 2>/dev/null)
assert_not_eq "وقت البداية موجود" "" "$FIRST_START"

# حفظ أول slot ID للحذف لاحقا
FIRST_SLOT_ID=$(echo "$BODY" | jq -r '.data[0].id // empty' 2>/dev/null)

# --- 2.4 جلب توفر مستشار آخر (من منظور رائد أعمال) ---
print_subsection "2.4 جلب توفر مستشار بمعرف محدد"

RESP=$(api_get "/bookings/availability?consultantId=${CONSULTANT_PROFILE_ID}" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب توفر مستشار بالمعرف" "200" "$STATUS"

# --- 2.5 حذف فترة توفر ---
print_subsection "2.5 حذف فترة توفر (DELETE /api/bookings/availability/[id])"

if [ -n "$FIRST_SLOT_ID" ]; then
    RESP=$(api_delete "/bookings/availability/${FIRST_SLOT_ID}" "$CONSULTANT_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "حذف فترة التوفر بنجاح" "200" "$STATUS"
    assert_success "استجابة ناجحة بعد الحذف" "$BODY"

    # تحقق أن الفترة حذفت (soft delete - لن تظهر في القائمة)
    RESP=$(api_get "/bookings/availability?consultantId=me" "$CONSULTANT_TOKEN")
    BODY=$(get_body "$RESP")
    NEW_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null)
    assert_eq "عدد الفترات نقص بواحد بعد الحذف" "$((SLOT_COUNT - 1))" "$NEW_COUNT"
else
    skip_test "حذف فترة توفر" "لا يوجد ID"
fi

# --- 2.6 حذف فترة لا يملكها المستشار ---
print_subsection "2.6 حذف فترة توفر لا يملكها المستشار"

RESP=$(api_delete "/bookings/availability/fake-id-12345" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
# يجب أن يفشل لأن الفترة غير موجودة أو لا يملكها
assert_not_eq "رفض حذف فترة وهمية" "200" "$STATUS"

# --- 2.7 استنساخ جدول التوفر لشهر محدد ---
print_subsection "2.7 استنساخ جدول التوفر لشهر محدد (POST /api/bookings/availability/clone)"

# استخدام الشهر القادم
NEXT_MONTH=$(date -d "+1 month" +%Y-%m 2>/dev/null || date -v+1m +%Y-%m 2>/dev/null || echo "2026-06")

RESP=$(api_post "/bookings/availability/clone" "$CONSULTANT_TOKEN" "{\"month\":\"${NEXT_MONTH}\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "استنساخ الجدول بنجاح" "200" "$STATUS"
assert_success "استجابة ناجحة للاستنساخ" "$BODY"

CLONE_COUNT=$(echo "$BODY" | jq -r '.data.count // 0' 2>/dev/null)
assert_gte "تم استنساخ فترة واحدة على الأقل" "$CLONE_COUNT" "1"

# --- 2.8 استنساخ شهر بدون تنسيق صحيح ---
print_subsection "2.8 التحقق من صحة بيانات الاستنساخ"

RESP=$(api_post "/bookings/availability/clone" "$CONSULTANT_TOKEN" '{"month":"invalid"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض استنساخ بتنسيق شهر خاطئ" "400" "$STATUS"

RESP=$(api_post "/bookings/availability/clone" "$CONSULTANT_TOKEN" '{}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض استنساخ بدون حقل month" "400" "$STATUS"

# --- 2.9 إضافة فترة توفر بفترة زمنية واحدة محددة (specificDate) ---
print_subsection "2.9 إنشاء فترة توفر بتاريخ محدد (specificDate)"

RESP=$(api_post "/bookings/availability" "$CONSULTANT_TOKEN" '{
    "slots": [
        {"dayOfWeek": 1, "startTime": "15:00", "endTime": "17:00", "slotDuration": 30, "isRecurring": false, "specificDate": "2026-05-15"}
    ]
}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إنشاء فترة بتاريخ محدد بنجاح" "201" "$STATUS"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٣: الحجوزات
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٣: الحجوزات (عرض / إكمال / عدم حضور)"

# إنشاء رائد أعمال تجريبي لحجز موعد
create_test_entrepreneur

# --- 3.1 جلب حجوزات المستشار ---
print_subsection "3.1 جلب حجوزات المستشار (GET /api/bookings)"

RESP=$(api_get "/bookings" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الحجوزات بنجاح" "200" "$STATUS"
assert_success "استجابة ناجحة" "$BODY"

# --- 3.2 إنشاء حجز من رائد الأعمال ---
print_subsection "3.2 إنشاء حجز تجريبي من رائد الأعمال"

# جلب milestone progress للرائد
RESP=$(api_get "/milestones" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
MILESTONE_PROGRESS_ID=$(echo "$BODY" | jq -r '.data.progress[0].id // empty' 2>/dev/null)

# إنشاء حجز
TOMORROW=$(date -d "+1 day" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d 2>/dev/null || echo "2026-05-02")
RESP=$(api_post "/bookings" "$ENTREPRENEUR_TOKEN" "{
    \"consultantId\": \"${CONSULTANT_PROFILE_ID}\",
    \"date\": \"${TOMORROW}\",
    \"startTime\": \"10:00\",
    \"endTime\": \"10:30\",
    \"milestoneProgressId\": \"${MILESTONE_PROGRESS_ID}\",
    \"notes\": \"اختبار حجز\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إنشاء الحجز بنجاح" "201" "$STATUS"
assert_success "استجابة ناجحة للحجز" "$BODY"

BOOKING_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
BOOKING_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
assert_eq "حالة الحجز CONFIRMED" "CONFIRMED" "$BOOKING_STATUS"
assert_contains "الحجز يحتوي على رابط اجتماع" "$BODY" "meetingLink"

# --- 3.3 عرض الحجوزات بعد الإنشاء ---
print_subsection "3.3 عرض الحجوزات بعد إنشاء حجز جديد"

RESP=$(api_get "/bookings" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الحجوزات بعد الإنشاء" "200" "$STATUS"

BOOKING_COUNT=$(echo "$BODY" | jq -r '.data.bookings | length' 2>/dev/null)
assert_gte "يوجد حجز واحد على الأقل" "$BOOKING_COUNT" "1"

# --- 3.4 تأكيد الحجز - لا يمكن الحجز في وقت مزدحم ---
print_subsection "3.4 منع الحجز في وقت مزدوم"

RESP=$(api_post "/bookings" "$ENTREPRENEUR_TOKEN" "{
    \"consultantId\": \"${CONSULTANT_PROFILE_ID}\",
    \"date\": \"${TOMORROW}\",
    \"startTime\": \"10:00\",
    \"endTime\": \"10:30\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض الحجز في وقت مزدوم" "409" "$STATUS"

# --- 3.5 تحديث حجز - إكمال الجلسة ---
print_subsection "3.5 إكمال الجلسة (PATCH /api/bookings/[id])"

if [ -n "$BOOKING_ID" ]; then
    RESP=$(api_patch "/bookings/${BOOKING_ID}" "$CONSULTANT_TOKEN" '{"status":"COMPLETED"}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "إكمال الجلسة بنجاح" "200" "$STATUS"

    NEW_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
    assert_eq "الحالة أصبحت COMPLETED" "COMPLETED" "$NEW_STATUS"
else
    skip_test "إكمال الجلسة" "لا يوجد حجز"
fi

# --- 3.6 إنشاء حجز آخر ثم تعليم عدم الحضور ---
print_subsection "3.6 تعليم عدم حضور (NO_SHOW)"

RESP=$(api_post "/bookings" "$ENTREPRENEUR_TOKEN" "{
    \"consultantId\": \"${CONSULTANT_PROFILE_ID}\",
    \"date\": \"${TOMORROW}\",
    \"startTime\": \"14:00\",
    \"endTime\": \"14:30\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
BOOKING_ID_2=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)

if [ -n "$BOOKING_ID_2" ]; then
    RESP=$(api_patch "/bookings/${BOOKING_ID_2}" "$CONSULTANT_TOKEN" '{"status":"NO_SHOW"}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعليم عدم حضور بنجاح" "200" "$STATUS"

    NEW_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
    assert_eq "الحالة أصبحت NO_SHOW" "NO_SHOW" "$NEW_STATUS"
else
    skip_test "تعليم عدم حضور" "لا يوجد حجز"
fi

# --- 3.7 إنشاء حجز ثم إلغاؤه ---
print_subsection "3.7 إلغاء حجز من المستشار"

RESP=$(api_post "/bookings" "$ENTREPRENEUR_TOKEN" "{
    \"consultantId\": \"${CONSULTANT_PROFILE_ID}\",
    \"date\": \"${TOMORROW}\",
    \"startTime\": \"16:00\",
    \"endTime\": \"16:30\"
}")
BODY=$(get_body "$RESP")
BOOKING_ID_3=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)

if [ -n "$BOOKING_ID_3" ]; then
    RESP=$(api_patch "/bookings/${BOOKING_ID_3}" "$CONSULTANT_TOKEN" '{
        "status":"CANCELLED","cancellationReason":"اختبار إلغاء"
    }')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "إلغاء الحجز بنجاح" "200" "$STATUS"

    NEW_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
    assert_eq "الحالة أصبحت CANCELLED" "CANCELLED" "$NEW_STATUS"
else
    skip_test "إلغاء حجز" "لا يوجد حجز"
fi

# --- 3.8 منع تحديث حجز مكتمل ---
print_subsection "3.8 منع تحديث حجز مكتمل"

if [ -n "$BOOKING_ID" ]; then
    RESP=$(api_patch "/bookings/${BOOKING_ID}" "$CONSULTANT_TOKEN" '{"status":"COMPLETED"}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_not_eq "رفض تحديث حجز مكتمل" "200" "$STATUS"
else
    skip_test "منع تحديث حجز مكتمل" "لا يوجد حجز"
fi

# --- 3.9 فلترة الحجوزات حسب الحالة ---
print_subsection "3.9 فلترة الحجوزات حسب الحالة"

RESP=$(api_get "/bookings?status=COMPLETED" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "فلترة الحجوزات المكتملة" "200" "$STATUS"

# جميع الحجوزات المعادة يجب أن تكون COMPLETED
ALL_COMPLETED=$(echo "$BODY" | jq -r '[.data.bookings[] | select(.status != "COMPLETED")] | length' 2>/dev/null)
assert_eq "جميع الحجوزات المعادة مكتملة" "0" "$ALL_COMPLETED"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٤: رحلة رواد الأعمال (مراجعة المراحل)
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٤: رحلة رواد الأعمال - مراجعة المراحل (قبول / رفض)"

# --- 4.1 جلب مراحل المستشار ---
print_subsection "4.1 جلب المراحل المخصصة للمستشار (GET /api/milestones)"

RESP=$(api_get "/milestones" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب المراحل بنجاح" "200" "$STATUS"
assert_success "استجابة ناجحة" "$BODY"

# --- 4.2 رائد أعمال يقدم مرحلة للمراجعة ---
print_subsection "4.2 رائد أعمال يقدم مرحلة للمراجعة"

RESP=$(api_get "/milestones" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
IN_PROGRESS_ID=$(echo "$BODY" | jq -r '.data.progress[] | select(.status=="IN_PROGRESS") | .id' 2>/dev/null | head -1)

if [ -n "$IN_PROGRESS_ID" ]; then
    RESP=$(api_post "/milestones/${IN_PROGRESS_ID}/submit" "$ENTREPRENEUR_TOKEN" '{"notes":"أرغب بمراجعة هذه المرحلة"}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تقديم المرحلة بنجاح" "200" "$STATUS"

    SUBMITTED_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
    assert_eq "حالة المرحلة أصبحت SUBMITTED" "SUBMITTED" "$SUBMITTED_STATUS"
else
    skip_test "تقديم مرحلة للمراجعة" "لا يوجد مرحلة IN_PROGRESS"
fi

# --- 4.3 المستشار يقبل المرحلة ---
print_subsection "4.3 المستشار يقبل المرحلة المقدمة"

if [ -n "$IN_PROGRESS_ID" ]; then
    RESP=$(api_post "/milestones/${IN_PROGRESS_ID}/approve" "$CONSULTANT_TOKEN" "{
        \"entrepreneurId\": \"${ENTREPRENEUR_PROFILE_ID}\",
        \"status\": \"APPROVED\",
        \"comment\": \"عمل ممتاز!\"
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "قبول المرحلة بنجاح" "200" "$STATUS"

    APPROVAL_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
    assert_eq "حالة القبول APPROVED" "APPROVED" "$APPROVAL_STATUS"
else
    skip_test "قبول مرحلة" "لا يوجد مرحلة مقدمة"
fi

# --- 4.4 تقديم مرحلة أخرى ثم رفضها ---
print_subsection "4.4 رفض مرحلة مقدمة مع تعليق"

RESP=$(api_get "/milestones" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
NEXT_IN_PROGRESS_ID=$(echo "$BODY" | jq -r '.data.progress[] | select(.status=="IN_PROGRESS") | .id' 2>/dev/null | head -1)

if [ -n "$NEXT_IN_PROGRESS_ID" ]; then
    # تقديم
    api_post "/milestones/${NEXT_IN_PROGRESS_ID}/submit" "$ENTREPRENEUR_TOKEN" '{"notes":"مرحلة للرفض"}' > /dev/null

    # رفض
    RESP=$(api_post "/milestones/${NEXT_IN_PROGRESS_ID}/approve" "$CONSULTANT_TOKEN" "{
        \"entrepreneurId\": \"${ENTREPRENEUR_PROFILE_ID}\",
        \"status\": \"REJECTED\",
        \"comment\": \"يحتاج تعديل\"
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "رفض المرحلة بنجاح" "200" "$STATUS"

    APPROVAL_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
    assert_eq "حالة الرفض REJECTED" "REJECTED" "$APPROVAL_STATUS"
else
    skip_test "رفض مرحلة" "لا يوجد مرحلة IN_PROGRESS ثانية"
fi

# --- 4.5 محاولة قبول مرحلة غير مقدمة ---
print_subsection "4.5 منع قبول مرحلة غير مقدمة (حالة خاطئة)"

RESP=$(api_post "/milestones/fake-id/approve" "$CONSULTANT_TOKEN" "{
    \"entrepreneurId\": \"${ENTREPRENEUR_PROFILE_ID}\",
    \"status\": \"APPROVED\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض قبول مرحلة وهمية" "200" "$STATUS"

# --- 4.6 بدون entrepreneurId ---
print_subsection "4.6 منع قبول بدون تحديد رائد الأعمال"

RESP=$(api_post "/milestones/fake-id/approve" "$CONSULTANT_TOKEN" '{"status":"APPROVED"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض قبول بدون entrepreneurId" "200" "$STATUS"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٥: المحادثات
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٥: المحادثات"

# --- 5.1 جلب غرف المحادثة ---
print_subsection "5.1 جلب غرف المحادثة (GET /api/chat/rooms)"

RESP=$(api_get "/chat/rooms" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب غرف المحادثة بنجاح" "200" "$STATUS"
assert_success "استجابة ناجحة" "$BODY"

# يجب أن تكون هناك غرفة محادثة تلقائية (أنشئت عند تسجيل رائد الأعمال)
ROOM_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null)
assert_gte "يوجد غرفة محادثة واحدة على الأقل" "$ROOM_COUNT" "1"

# حفظ أول غرفة
FIRST_ROOM_ID=$(echo "$BODY" | jq -r '.data[0].id // empty' 2>/dev/null)

# --- 5.2 جلب رسائل غرفة محادثة ---
print_subsection "5.2 جلب رسائل غرفة محادثة (GET /api/chat/rooms/[id]/messages)"

if [ -n "$FIRST_ROOM_ID" ]; then
    RESP=$(api_get "/chat/rooms/${FIRST_ROOM_ID}/messages" "$CONSULTANT_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "جلب الرسائل بنجاح" "200" "$STATUS"

    MSG_COUNT=$(echo "$BODY" | jq -r '.data.messages | length' 2>/dev/null)
    assert_gte "يوجد رسالة واحدة على الأقل" "$MSG_COUNT" "1"
else
    skip_test "جلب رسائل غرفة" "لا يوجد غرفة"
fi

# --- 5.3 إرسال رسالة ---
print_subsection "5.3 إرسال رسالة في غرفة محادثة (POST /api/chat/rooms/[id]/messages)"

if [ -n "$FIRST_ROOM_ID" ]; then
    RESP=$(api_post "/chat/rooms/${FIRST_ROOM_ID}/messages" "$CONSULTANT_TOKEN" '{"content":"مرحباً، كيف يمكنني مساعدتك؟"}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "إرسال رسالة بنجاح" "201" "$STATUS"
    assert_contains "الرسالة تحتوي على المحتوى" "$BODY" "مرحبا"

    SENT_MSG_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
else
    skip_test "إرسال رسالة" "لا يوجد غرفة"
fi

# --- 5.4 إرسال رسالة فارغة ---
print_subsection "5.4 منع إرسال رسالة فارغة"

if [ -n "$FIRST_ROOM_ID" ]; then
    RESP=$(api_post "/chat/rooms/${FIRST_ROOM_ID}/messages" "$CONSULTANT_TOKEN" '{"content":""}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_not_eq "رفض إرسال رسالة فارغة" "201" "$STATUS"

    RESP=$(api_post "/chat/rooms/${FIRST_ROOM_ID}/messages" "$CONSULTANT_TOKEN" '{"content":"   "}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_not_eq "رفض إرسال رسالة بمسافات فقط" "201" "$STATUS"
else
    skip_test "إرسال رسالة فارغة" "لا يوجد غرفة"
fi

# --- 5.5 إنشاء غرفة محادثة جديدة ---
print_subsection "5.5 إنشاء غرفة محادثة مباشرة جديدة (POST /api/chat/rooms)"

RESP=$(api_post "/chat/rooms" "$CONSULTANT_TOKEN" "{
    \"participantIds\": [\"${ENTREPRENEUR_USER_ID}\"]
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")

# قد تعيد غرفة موجودة (201 أو 200)
if [ "$STATUS" = "201" ] || [ "$STATUS" = "200" ]; then
    assert_success "إنشاء/جلب غرفة محادثة" "$BODY"
else
    # قد يكون هناك غرفة بالفعل
    assert_contains "الاستجابة تحتوي على بيانات الغرفة" "$BODY" "id"
fi

# --- 5.6 محاولة الوصول لغرفة لا ينتمي إليها ---
print_subsection "5.6 منع الوصول لغرفة لا ينتمي إليها المستشار"

RESP=$(api_get "/chat/rooms/fake-room-id/messages" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض الوصول لغرفة وهمية" "200" "$STATUS"

# --- 5.7 جلب الرسائل مع التصفح ---
print_subsection "5.7 جلب الرسائل مع التصفح (pagination)"

if [ -n "$FIRST_ROOM_ID" ]; then
    RESP=$(api_get "/chat/rooms/${FIRST_ROOM_ID}/messages?page=1&limit=10" "$CONSULTANT_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "جلب الرسائل مع التصفح" "200" "$STATUS"

    HAS_PAGINATION=$(echo "$BODY" | jq -r '.data.pagination // empty' 2>/dev/null)
    assert_not_eq "يحتوي على بيانات التصفح" "" "$HAS_PAGINATION"
else
    skip_test "جلب رسائل مع تصفح" "لا يوجد غرفة"
fi


# ══════════════════════════════════════════════════════════════════════
# التبويب ٦: القوالب
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٦: القوالب"

# --- 6.1 جلب القوالب ---
print_subsection "6.1 جلب القوالب المتاحة (GET /api/templates)"

RESP=$(api_get "/templates" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب القوالب بنجاح" "200" "$STATUS"
assert_success "استجابة ناجحة" "$BODY"

# --- 6.2 فلترة القوالب حسب التصنيف ---
print_subsection "6.2 فلترة القوالب حسب التصنيف"

RESP=$(api_get "/templates?category=business-plan" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "فلترة القوالب بنجاح" "200" "$STATUS"

# --- 6.3 بدون تسجيل دخول ---
print_subsection "6.3 منع الوصول بدون تسجيل دخول"

RESP=$(api_get "/templates" "")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفض جلب القوالب بدون تسجيل دخول" "401" "$STATUS"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٧: الإشعارات
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٧: الإشعارات"

# --- 7.1 جلب الإشعارات ---
print_subsection "7.1 جلب الإشعارات (GET /api/notifications)"

RESP=$(api_get "/notifications" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الإشعارات بنجاح" "200" "$STATUS"
assert_success "استجابة ناجحة" "$BODY"

NOTIF_COUNT=$(echo "$BODY" | jq -r '.data.notifications | length' 2>/dev/null)
UNREAD_COUNT=$(echo "$BODY" | jq -r '.data.unreadCount // 0' 2>/dev/null)
echo -e "    ℹ️  عدد الإشعارات: ${NOTIF_COUNT}, غير مقروءة: ${UNREAD_COUNT}"

# --- 7.2 جلب الإشعارات غير المقروءة فقط ---
print_subsection "7.2 فلترة الإشعارات غير المقروءة"

RESP=$(api_get "/notifications?unreadOnly=true" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الإشعارات غير المقروءة" "200" "$STATUS"

# --- 7.3 تعليم جميع الإشعارات كمقروءة ---
print_subsection "7.3 تعليم جميع الإشعارات كمقروءة (PATCH /api/notifications)"

RESP=$(api_patch "/notifications" "$CONSULTANT_TOKEN" '{"markAllRead":true}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "تعليم الكل كمقروء بنجاح" "200" "$STATUS"

# تحقق
RESP=$(api_get "/notifications?unreadOnly=true" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
UNREAD_AFTER=$(echo "$BODY" | jq -r '.data.unreadCount // 0' 2>/dev/null)
assert_eq "عدد غير المقروءة صفر بعد التعليم" "0" "$UNREAD_AFTER"

# --- 7.4 تعليم إشعار واحد كمقروء ---
print_subsection "7.4 تعليم إشعار واحد كمقروء"

# جلب أول إشعار
RESP=$(api_get "/notifications" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
FIRST_NOTIF_ID=$(echo "$BODY" | jq -r '.data.notifications[0].id // empty' 2>/dev/null)

if [ -n "$FIRST_NOTIF_ID" ]; then
    RESP=$(api_patch "/notifications" "$CONSULTANT_TOKEN" "{\"id\":\"${FIRST_NOTIF_ID}\"}")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تعليم إشعار واحد كمقروء" "200" "$STATUS"
else
    skip_test "تعليم إشعار واحد" "لا يوجد إشعارات"
fi

# --- 7.5 حذف جميع الإشعارات ---
print_subsection "7.5 حذف جميع الإشعارات (DELETE /api/notifications)"

RESP=$(api_delete "/notifications" "$CONSULTANT_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "حذف جميع الإشعارات" "200" "$STATUS"

DELETED_COUNT=$(echo "$BODY" | jq -r '.data.deletedCount // 0' 2>/dev/null)
echo -e "    ℹ️  تم حذف ${DELETED_COUNT} إشعار"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLEANUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cleanup_test_data

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print_summary "المستشار"
