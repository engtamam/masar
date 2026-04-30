#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# Masar Platform - سيناريوهات سلوكيات رائد الأعمال
# Entrepreneur Behavior Scenarios - Complete E2E Testing
# ═══════════════════════════════════════════════════════════════════════
# التبويبات:
#   1. التسجيل وتسجيل الدخول
#   2. الملف الشخصي ولوحة التحكم
#   3. رحلة المراحل (عرض / تقديم / رفع ملفات)
#   4. حجز الاستشارات (بحث / حجز / إلغاء)
#   5. المحادثات
#   6. الملفات (رفع / تحميل / حذف)
#   7. القوالب
#   8. الإشعارات
#   9. التحقق من البريد واستعادة كلمة المرور
# ═══════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/common.sh"

# Reset counters
TOTAL_TESTS=0; PASSED_TESTS=0; FAILED_TESTS=0; SKIPPED_TESTS=0

print_banner "🧪 سيناريوهات سلوكيات رائد الأعمال - مَسَار"

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SETUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
check_server_health
login_admin
get_first_specialty
create_test_consultant
create_test_entrepreneur

# ══════════════════════════════════════════════════════════════════════
# التبويب ١: التسجيل وتسجيل الدخول
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ١: التسجيل وتسجيل الدخول"

# --- 1.1 تسجيل حساب جديد ---
print_subsection "1.1 تسجيل حساب رائد أعمال جديد (POST /api/auth/register)"

NEW_ENTREPRENEUR_EMAIL="register.test.$(date +%s)@masar.sa"
RESP=$(api_post "/auth/register" "" "{
    \"name\": \"رائد أعمال جديد\",
    \"email\": \"${NEW_ENTREPRENEUR_EMAIL}\",
    \"password\": \"test123\",
    \"projectName\": \"مشروعي الجديد\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "تسجيل حساب جديد بنجاح" "201" "$STATUS"
assert_contains "الاستجابة تحتوي على token" "$BODY" "token"
assert_contains "الدور ENTREPRENEUR" "$BODY" "ENTREPRENEUR"

# حفظ بيانات الحساب الجديد
NEW_ENTREPRENEUR_TOKEN=$(echo "$BODY" | jq -r '.data.token // empty' 2>/dev/null)
NEW_ENTREPRENEUR_ID=$(echo "$BODY" | jq -r '.data.user.id // empty' 2>/dev/null)

# --- 1.2 تسجيل بحساب مكرر ---
print_subsection "1.2 منع التسجيل ببريد مكرر"

RESP=$(api_post "/auth/register" "" "{
    \"name\": \"مكرر\",
    \"email\": \"${NEW_ENTREPRENEUR_EMAIL}\",
    \"password\": \"test123\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض التسجيل ببريد مكرر" "201" "$STATUS"

# --- 1.3 تسجيل بدون بيانات مطلوبة ---
print_subsection "1.3 التحقق من صحة بيانات التسجيل"

# بدون اسم
RESP=$(api_post "/auth/register" "" "{\"email\":\"a@b.com\",\"password\":\"test123\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض تسجيل بدون اسم" "201" "$STATUS"

# بدون بريد
RESP=$(api_post "/auth/register" "" "{\"name\":\"test\",\"password\":\"test123\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض تسجيل بدون بريد" "201" "$STATUS"

# كلمة مرور قصيرة
RESP=$(api_post "/auth/register" "" "{\"name\":\"test\",\"email\":\"x@y.com\",\"password\":\"12\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض كلمة مرور أقل من 6 أحرف" "201" "$STATUS"

# بريد غير صالح
RESP=$(api_post "/auth/register" "" "{\"name\":\"test\",\"email\":\"notanemail\",\"password\":\"test123\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض بريد غير صالح" "201" "$STATUS"

# --- 1.4 تسجيل الدخول ---
print_subsection "1.4 تسجيل الدخول بالحساب الجديد"

RESP=$(api_post "/auth/login" "" "{\"email\":\"${NEW_ENTREPRENEUR_EMAIL}\",\"password\":\"test123\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "تسجيل دخول ناجح" "200" "$STATUS"

LOGIN_TOKEN=$(echo "$BODY" | jq -r '.data.token // empty' 2>/dev/null)
assert_not_eq "تم الحصول على token" "" "$LOGIN_TOKEN"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٢: الملف الشخصي ولوحة التحكم
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٢: الملف الشخصي ولوحة التحكم"

# --- 2.1 جلب الملف الشخصي ---
print_subsection "2.1 جلب الملف الشخصي (GET /api/auth/me)"

RESP=$(api_get "/auth/me" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الملف الشخصي بنجاح" "200" "$STATUS"

ME_ROLE=$(echo "$BODY" | jq -r '.data.role // empty' 2>/dev/null)
assert_eq "الدور هو ENTREPRENEUR" "ENTREPRENEUR" "$ME_ROLE"

# --- 2.2 الملف الشخصي يحتوي على entrepreneurProfile ---
print_subsection "2.2 التحقق من وجود ملف رائد الأعمال"

HAS_ENT_PROFILE=$(echo "$BODY" | jq -r '.data.entrepreneurProfile // empty' 2>/dev/null)
assert_not_eq "يحتوي على entrepreneurProfile" "" "$HAS_ENT_PROFILE"

# --- 2.3 الملف الشخصي يحتوي على quota ---
print_subsection "2.3 التحقق من وجود الحصة"

HAS_QUOTA=$(echo "$BODY" | jq -r '.data.entrepreneurProfile.quota // empty' 2>/dev/null)
assert_not_eq "يحتوي على quota" "" "$HAS_QUOTA"

QUOTA_LIMIT=$(echo "$BODY" | jq -r '.data.entrepreneurProfile.quota.monthlyBookingLimit // 0' 2>/dev/null)
assert_gt "حد الحصة الشهرية أكبر من 0" "$QUOTA_LIMIT" "0"

# --- 2.4 جلب الإحصائيات العامة ---
print_subsection "2.4 جلب الإحصائيات العامة (GET /api/stats)"

RESP=$(api_get "/stats" "")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الإحصائيات بنجاح" "200" "$STATUS"
assert_contains "يحتوي على عدد رواد الأعمال" "$BODY" "entrepreneurs"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٣: رحلة المراحل
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٣: رحلة المراحل (عرض / تقديم / رفع ملفات)"

# --- 3.1 جلب المراحل ---
print_subsection "3.1 جلب مراحل الرحلة (GET /api/milestones)"

RESP=$(api_get "/milestones" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب المراحل بنجاح" "200" "$STATUS"
assert_success "استجابة ناجحة" "$BODY"

# --- 3.2 التحقق من وجود مراحل ---
print_subsection "3.2 التحقق من وجود مراحل وprogress"

MILESTONE_COUNT=$(echo "$BODY" | jq -r '.data.milestones | length' 2>/dev/null)
PROGRESS_COUNT=$(echo "$BODY" | jq -r '.data.progress | length' 2>/dev/null)
assert_gt "يوجد مرحلة واحدة على الأقل" "$MILESTONE_COUNT" "0"
assert_gte "يوجد تقدم مرحلة واحد على الأقل" "$PROGRESS_COUNT" "1"

# --- 3.3 المرحلة الأولى يجب أن تكون IN_PROGRESS ---
print_subsection "3.3 المرحلة الأولى يجب أن تكون IN_PROGRESS"

FIRST_STATUS=$(echo "$BODY" | jq -r '.data.progress[0].status // empty' 2>/dev/null)
assert_eq "حالة أول مرحلة IN_PROGRESS" "IN_PROGRESS" "$FIRST_STATUS"

# حفظ معرف المرحلة الأولى
FIRST_PROGRESS_ID=$(echo "$BODY" | jq -r '.data.progress[] | select(.status=="IN_PROGRESS") | .id' 2>/dev/null | head -1)

# --- 3.4 تقديم مرحلة للمراجعة ---
print_subsection "3.4 تقديم مرحلة للمراجعة (POST /api/milestones/[id]/submit)"

if [ -n "$FIRST_PROGRESS_ID" ]; then
    RESP=$(api_post "/milestones/${FIRST_PROGRESS_ID}/submit" "$ENTREPRENEUR_TOKEN" '{"notes":"أكملت هذه المرحلة وأريد المراجعة"}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "تقديم المرحلة بنجاح" "200" "$STATUS"

    SUBMITTED_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
    assert_eq "حالة المرحلة SUBMITTED" "SUBMITTED" "$SUBMITTED_STATUS"
else
    skip_test "تقديم مرحلة" "لا يوجد مرحلة IN_PROGRESS"
fi

# --- 3.5 منع تقديم مرحلة مكتملة أو مقفلة ---
print_subsection "3.5 منع تقديم مرحلة بحالة خاطئة"

# تقديم نفس المرحلة مرة أخرى (الآن SUBMITTED)
if [ -n "$FIRST_PROGRESS_ID" ]; then
    RESP=$(api_post "/milestones/${FIRST_PROGRESS_ID}/submit" "$ENTREPRENEUR_TOKEN" '{"notes":"محاولة ثانية"}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_not_eq "رفض تقديم مرحلة مقدمّة بالفعل" "200" "$STATUS"
fi

# مرحلة مقفلة
RESP=$(api_get "/milestones" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
LOCKED_ID=$(echo "$BODY" | jq -r '.data.progress[] | select(.status=="LOCKED") | .id' 2>/dev/null | head -1)
if [ -n "$LOCKED_ID" ]; then
    RESP=$(api_post "/milestones/${LOCKED_ID}/submit" "$ENTREPRENEUR_TOKEN" '{"notes":"محاولة"}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_not_eq "رفض تقديم مرحلة مقفلة" "200" "$STATUS"
else
    skip_test "تقديم مرحلة مقفلة" "لا يوجد مرحلة LOCKED"
fi

# --- 3.6 قبول المستشار للمرحلة المقدمة ---
print_subsection "3.6 المستشار يقبل المرحلة (لفتح المرحلة التالية)"

if [ -n "$FIRST_PROGRESS_ID" ]; then
    RESP=$(api_post "/milestones/${FIRST_PROGRESS_ID}/approve" "$CONSULTANT_TOKEN" "{
        \"entrepreneurId\": \"${ENTREPRENEUR_PROFILE_ID}\",
        \"status\": \"APPROVED\",
        \"comment\": \"عمل ممتاز!\"
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "قبول المرحلة بنجاح" "200" "$STATUS"
fi

# --- 3.7 التحقق من فتح المرحلة التالية ---
print_subsection "3.7 التحقق من فتح المرحلة التالية بعد القبول"

RESP=$(api_get "/milestones" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")

IN_PROGRESS_COUNT=$(echo "$BODY" | jq -r '[.data.progress[] | select(.status=="IN_PROGRESS")] | length' 2>/dev/null)
assert_gte "يوجد مرحلة IN_PROGRESS واحدة على الأقل بعد القبول" "$IN_PROGRESS_COUNT" "1"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٤: حجز الاستشارات
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٤: حجز الاستشارات (بحث / حجز / إلغاء)"

# --- 4.1 المستشار يضيف توفر ---
print_subsection "4.1 إعداد توفر المستشار"

RESP=$(api_post "/bookings/availability" "$CONSULTANT_TOKEN" '{
    "slots": [
        {"dayOfWeek": 0, "startTime": "09:00", "endTime": "12:00", "slotDuration": 30},
        {"dayOfWeek": 2, "startTime": "10:00", "endTime": "14:00", "slotDuration": 60}
    ]
}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إضافة توفر المستشار" "201" "$STATUS"

# --- 4.2 رائد أعمال يبحث عن توفر المستشار ---
print_subsection "4.2 البحث عن توفر المستشار (GET /api/bookings/availability)"

RESP=$(api_get "/bookings/availability?consultantId=${CONSULTANT_PROFILE_ID}" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب توفر المستشار بنجاح" "200" "$STATUS"

AVAIL_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null)
assert_gte "يوجد فترة توفر واحدة على الأقل" "$AVAIL_COUNT" "1"

# --- 4.3 إنشاء حجز ---
print_subsection "4.3 إنشاء حجز استشارة (POST /api/bookings)"

TOMORROW=$(date -d "+1 day" +%Y-%m-%d 2>/dev/null || date -v+1d +%Y-%m-%d 2>/dev/null || echo "2026-05-02")
RESP=$(api_post "/bookings" "$ENTREPRENEUR_TOKEN" "{
    \"consultantId\": \"${CONSULTANT_PROFILE_ID}\",
    \"date\": \"${TOMORROW}\",
    \"startTime\": \"09:00\",
    \"endTime\": \"09:30\",
    \"notes\": \"أريد استشارة بخصوص المرحلة الأولى\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إنشاء الحجز بنجاح" "201" "$STATUS"

BOOKING_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
BOOKING_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
assert_eq "حالة الحجز CONFIRMED" "CONFIRMED "$BOOKING_STATUS"

MEETING_LINK=$(echo "$BODY" | jq -r '.data.meetingLink // empty' 2>/dev/null)
assert_not_eq "يوجد رابط اجتماع Jitsi" "" "$MEETING_LINK"

# --- 4.4 الحجز يقلل الحصة ---
print_subsection "4.4 التحقق من تقليل الحصة بعد الحجز"

RESP=$(api_get "/auth/me" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
USED_QUOTA=$(echo "$BODY" | jq -r '.data.entrepreneurProfile.quota.bookingsUsedThisMonth // 0' 2>/dev/null)
assert_gte "تم استخدام حصة واحدة على الأقل" "$USED_QUOTA" "1"

# --- 4.5 منع الحجز بتاريخ ماض ---
print_subsection "4.5 منع الحجز بتاريخ ماض"

YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d 2>/dev/null || echo "2026-04-30")
RESP=$(api_post "/bookings" "$ENTREPRENEUR_TOKEN" "{
    \"consultantId\": \"${CONSULTANT_PROFILE_ID}\",
    \"date\": \"${YESTERDAY}\",
    \"startTime\": \"10:00\",
    \"endTime\": \"10:30\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض الحجز بتاريخ ماض" "201" "$STATUS"

# --- 4.6 منع الحجز بدون بيانات مطلوبة ---
print_subsection "4.6 التحقق من صحة بيانات الحجز"

RESP=$(api_post "/bookings" "$ENTREPRENEUR_TOKEN" '{"consultantId":"'${CONSULTANT_PROFILE_ID}'"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض حجز بدون تاريخ" "201" "$STATUS"

# --- 4.7 جلب حجوزات رائد الأعمال ---
print_subsection "4.7 جلب حجوزاتي (GET /api/bookings)"

RESP=$(api_get "/bookings" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الحجوزات بنجاح" "200" "$STATUS"

MY_BOOKING_COUNT=$(echo "$BODY" | jq -r '.data.bookings | length' 2>/dev/null)
assert_gte "يوجد حجز واحد على الأقل" "$MY_BOOKING_COUNT" "1"

# --- 4.8 إلغاء الحجز ---
print_subsection "4.8 إلغاء حجز استشارة (PATCH /api/bookings/[id])"

if [ -n "$BOOKING_ID" ]; then
    RESP=$(api_patch "/bookings/${BOOKING_ID}" "$ENTREPRENEUR_TOKEN" '{
        "status": "CANCELLED",
        "cancellationReason": "لا أستطيع الحضور"
    }')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "إلغاء الحجز بنجاح" "200" "$STATUS"

    CANCEL_STATUS=$(echo "$BODY" | jq -r '.data.status // empty' 2>/dev/null)
    assert_eq "الحالة CANCELLED" "CANCELLED" "$CANCEL_STATUS"
else
    skip_test "إلغاء حجز" "لا يوجد حجز"
fi

# --- 4.9 الحصة تعود بعد الإلغاء ---
print_subsection "4.9 التحقق من عودة الحصة بعد الإلغاء"

RESP=$(api_get "/auth/me" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
USED_AFTER_CANCEL=$(echo "$BODY" | jq -r '.data.entrepreneurProfile.quota.bookingsUsedThisMonth // 0' 2>/dev/null)
# بعد الإلغاء يجب أن تقل الحصة المستخدمة
assert_eq "الحصة المستخدمة نقصت بعد الإلغاء" "$((USED_QUOTA - 1))" "$USED_AFTER_CANCEL"

# --- 4.10 حجز ثاني ثم حجز ثالث يتجاوز الحصة ---
print_subsection "4.10 اختبار حدود الحصة الشهرية"

# إنشاء حجوزات حتى نصل للحد
RESP=$(api_get "/auth/me" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
QUOTA_LIMIT=$(echo "$BODY" | jq -r '.data.entrepreneurProfile.quota.monthlyBookingLimit // 4' 2>/dev/null)
QUOTA_USED=$(echo "$BODY" | jq -r '.data.entrepreneurProfile.quota.bookingsUsedThisMonth // 0' 2>/dev/null)
REMAINING=$((QUOTA_LIMIT - QUOTA_USED))

echo -e "    ℹ️  الحد: ${QUOTA_LIMIT}, المستخدمة: ${QUOTA_USED}, المتبقية: ${REMAINING}"

# أنشئ حجوزات حتى نملأ الحصة
BOOKING_COUNTER=1
while [ "$REMAINING" -gt 0 ]; do
    START_HOUR=$((9 + BOOKING_COUNTER))
    END_HOUR=$((9 + BOOKING_COUNTER))
    END_MIN=30
    if [ "$BOOKING_COUNTER" -gt 1 ]; then
        START_MIN=30
        END_MIN=59
    else
        START_MIN=0
    fi

    RESP=$(api_post "/bookings" "$ENTREPRENEUR_TOKEN" "{
        \"consultantId\": \"${CONSULTANT_PROFILE_ID}\",
        \"date\": \"${TOMORROW}\",
        \"startTime\": \"${START_HOUR}:${START_MIN}\",
        \"endTime\": \"${END_HOUR}:${END_MIN}\"
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")

    REMAINING=$((REMAINING - 1))
    BOOKING_COUNTER=$((BOOKING_COUNTER + 1))
done

# محاولة حجز واحد إضافي يجب أن تفشل
RESP=$(api_post "/bookings" "$ENTREPRENEUR_TOKEN" "{
    \"consultantId\": \"${CONSULTANT_PROFILE_ID}\",
    \"date\": \"${TOMORROW}\",
    \"startTime\": \"15:00\",
    \"endTime\": \"15:30\"
}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض حجز يتجاوز الحصة الشهرية" "201" "$STATUS"

# --- 4.11 فلترة حجوزات حسب الحالة ---
print_subsection "4.11 فلترة الحجوزات حسب الحالة"

RESP=$(api_get "/bookings?status=CANCELLED" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "فلترة الحجوزات الملغاة" "200" "$STATUS"

# --- 4.12 حجز مع ربط بمرحلة ---
print_subsection "4.12 حجز استشارة مرتبطة بمرحلة"

# إلغاء حجز لتفريغ حصة
RESP=$(api_get "/bookings" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
CONFIRMED_ID=$(echo "$BODY" | jq -r '.data.bookings[] | select(.status=="CONFIRMED") | .id' 2>/dev/null | head -1)
if [ -n "$CONFIRMED_ID" ]; then
    api_patch "/bookings/${CONFIRMED_ID}" "$ENTREPRENEUR_TOKEN" '{"status":"CANCELLED","cancellationReason":"تفريغ حصة"}' > /dev/null
fi

# جلب مرحلة IN_PROGRESS
RESP=$(api_get "/milestones" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
CURRENT_PROGRESS_ID=$(echo "$BODY" | jq -r '.data.progress[] | select(.status=="IN_PROGRESS") | .id' 2>/dev/null | head -1)

if [ -n "$CURRENT_PROGRESS_ID" ]; then
    RESP=$(api_post "/bookings" "$ENTREPRENEUR_TOKEN" "{
        \"consultantId\": \"${CONSULTANT_PROFILE_ID}\",
        \"date\": \"${TOMORROW}\",
        \"startTime\": \"11:00\",
        \"endTime\": \"11:30\",
        \"milestoneProgressId\": \"${CURRENT_PROGRESS_ID}\",
        \"notes\": \"استشارة بخصوص المرحلة\"
    }")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")

    if [ "$STATUS" = "201" ]; then
        assert_contains "الحجز مرتبط بمرحلة" "$BODY" "milestoneProgress"
    else
        skip_test "حجز مرتبط بمرحلة" "تجاوز الحصة"
    fi
else
    skip_test "حجز مرتبط بمرحلة" "لا يوجد مرحلة IN_PROGRESS"
fi


# ══════════════════════════════════════════════════════════════════════
# التبويب ٥: المحادثات
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٥: المحادثات"

# --- 5.1 جلب غرف المحادثة ---
print_subsection "5.1 جلب غرف المحادثة (GET /api/chat/rooms)"

RESP=$(api_get "/chat/rooms" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب غرف المحادثة بنجاح" "200" "$STATUS"

ROOM_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null)
assert_gte "يوجد غرفة محادثة واحدة على الأقل" "$ROOM_COUNT" "1"

FIRST_ROOM_ID=$(echo "$BODY" | jq -r '.data[0].id // empty' 2>/dev/null)

# --- 5.2 غرفة تحتوي على عضو غير مقروء ---
print_subsection "5.2 التحقق من عداد الرسائل غير المقروءة"

UNREAD_COUNT=$(echo "$BODY" | jq -r '.data[0].unreadCount // 0' 2>/dev/null)
echo -e "    ℹ️  رسائل غير مقروءة: ${UNREAD_COUNT}"

# --- 5.3 جلب رسائل غرفة ---
print_subsection "5.3 جلب رسائل غرفة محادثة"

if [ -n "$FIRST_ROOM_ID" ]; then
    RESP=$(api_get "/chat/rooms/${FIRST_ROOM_ID}/messages" "$ENTREPRENEUR_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "جلب الرسائل بنجاح" "200" "$STATUS"

    MSG_COUNT=$(echo "$BODY" | jq -r '.data.messages | length' 2>/dev/null)
    assert_gte "يوجد رسالة واحدة على الأقل" "$MSG_COUNT" "1"
else
    skip_test "جلب رسائل غرفة" "لا يوجد غرفة"
fi

# --- 5.4 إرسال رسالة ---
print_subsection "5.4 إرسال رسالة في غرفة محادثة"

if [ -n "$FIRST_ROOM_ID" ]; then
    RESP=$(api_post "/chat/rooms/${FIRST_ROOM_ID}/messages" "$ENTREPRENEUR_TOKEN" '{"content":"مرحباً، أحتاج مساعدة في المرحلة الأولى"}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "إرسال رسالة بنجاح" "201" "$STATUS"

    # التحقق من المرسل
    SENDER_ID=$(echo "$BODY" | jq -r '.data.senderId // empty' 2>/dev/null)
    assert_eq "المرسل هو رائد الأعمال" "$ENTREPRENEUR_USER_ID" "$SENDER_ID"
else
    skip_test "إرسال رسالة" "لا يوجد غرفة"
fi

# --- 5.5 إرسال رسالة فارغة ---
print_subsection "5.5 منع إرسال رسالة فارغة"

if [ -n "$FIRST_ROOM_ID" ]; then
    RESP=$(api_post "/chat/rooms/${FIRST_ROOM_ID}/messages" "$ENTREPRENEUR_TOKEN" '{"content":""}')
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_not_eq "رفض رسالة فارغة" "201" "$STATUS"
else
    skip_test "إرسال رسالة فارغة" "لا يوجد غرفة"
fi

# --- 5.6 التصفح في الرسائل ---
print_subsection "5.6 جلب الرسائل مع التصفح"

if [ -n "$FIRST_ROOM_ID" ]; then
    RESP=$(api_get "/chat/rooms/${FIRST_ROOM_ID}/messages?page=1&limit=5" "$ENTREPRENEUR_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "جلب الرسائل مع التصفح" "200" "$STATUS"

    HAS_PAGINATION=$(echo "$BODY" | jq -r '.data.pagination // empty' 2>/dev/null)
    assert_not_eq "يحتوي على بيانات التصفح" "" "$HAS_PAGINATION"
else
    skip_test "تصفح الرسائل" "لا يوجد غرفة"
fi


# ══════════════════════════════════════════════════════════════════════
# التبويب ٦: الملفات (رفع / تحميل / حذف)
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٦: الملفات (رفع / تحميل / حذف)"

# --- 6.1 رفع ملف ---
print_subsection "6.1 رفع ملف (POST /api/files)"

# إنشاء ملف اختبار مؤقت
TEST_FILE="/tmp/masar_test_file_$(date +%s).txt"
echo "هذا ملف اختبار لمنصة مَسَار" > "$TEST_FILE"

RESP=$(curl -s -w '\n%{http_code}' --max-time ${TIMEOUT} \
    -X POST \
    -H "Authorization: Bearer ${ENTREPRENEUR_TOKEN}" \
    -F "file=@${TEST_FILE}" \
    -F "milestoneProgressId=${FIRST_PROGRESS_ID}" \
    "${BASE_URL}/files")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفع ملف بنجاح" "201" "$STATUS"

UPLOADED_FILE_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
assert_not_eq "تم الحصول على معرف الملف" "" "$UPLOADED_FILE_ID"

# تنظيف الملف المؤقت
rm -f "$TEST_FILE"

# --- 6.2 جلب قائمة الملفات ---
print_subsection "6.2 جلب قائمة الملفات (GET /api/files)"

RESP=$(api_get "/files" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الملفات بنجاح" "200" "$STATUS"

FILE_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null)
assert_gte "يوجد ملف واحد على الأقل" "$FILE_COUNT" "1"

# --- 6.3 فلترة الملفات حسب المرحلة ---
print_subsection "6.3 فلترة الملفات حسب المرحلة"

if [ -n "$FIRST_PROGRESS_ID" ]; then
    RESP=$(api_get "/files?milestoneProgressId=${FIRST_PROGRESS_ID}" "$ENTREPRENEUR_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "فلترة الملفات حسب المرحلة" "200" "$STATUS"
else
    skip_test "فلترة ملفات حسب مرحلة" "لا يوجد مرحلة"
fi

# --- 6.4 تحميل ملف ---
print_subsection "6.4 تحميل ملف (GET /api/files/[id])"

if [ -n "$UPLOADED_FILE_ID" ]; then
    RESP=$(api_get "/files/${UPLOADED_FILE_ID}" "$ENTREPRENEUR_TOKEN")
    STATUS=$(get_status "$RESP")
    # ملف يتم تنزيله كـ binary
    assert_eq "تحميل الملف بنجاح" "200" "$STATUS"
else
    skip_test "تحميل ملف" "لا يوجد ملف مرفوع"
fi

# --- 6.5 حذف ملف ---
print_subsection "6.5 حذف ملف (DELETE /api/files/[id])"

if [ -n "$UPLOADED_FILE_ID" ]; then
    RESP=$(api_delete "/files/${UPLOADED_FILE_ID}" "$ENTREPRENEUR_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "حذف الملف بنجاح" "200" "$STATUS"

    # تحقق من حذفه من القائمة
    RESP=$(api_get "/files" "$ENTREPRENEUR_TOKEN")
    BODY=$(get_body "$RESP")
    NEW_FILE_COUNT=$(echo "$BODY" | jq -r '.data | length' 2>/dev/null)
    assert_eq "عدد الملفات نقص بواحد" "$((FILE_COUNT - 1))" "$NEW_FILE_COUNT"
else
    skip_test "حذف ملف" "لا يوجد ملف مرفوع"
fi

# --- 6.6 رفع ملف بتشفير ---
print_subsection "6.6 رفع ملف مشفر"

TEST_FILE2="/tmp/masar_encrypted_test_$(date +%s).txt"
echo "ملف سري مشفر" > "$TEST_FILE2"

RESP=$(curl -s -w '\n%{http_code}' --max-time ${TIMEOUT} \
    -X POST \
    -H "Authorization: Bearer ${ENTREPRENEUR_TOKEN}" \
    -F "file=@${TEST_FILE2}" \
    -F "milestoneProgressId=${FIRST_PROGRESS_ID}" \
    -F "encrypt=true" \
    "${BASE_URL}/files")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "رفع ملف مشفر بنجاح" "201" "$STATUS"

IS_ENCRYPTED=$(echo "$BODY" | jq -r '.data.isEncrypted // false' 2>/dev/null)
assert_eq "الملف مشفر" "true" "$IS_ENCRYPTED"

rm -f "$TEST_FILE2"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٧: القوالب
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٧: القوالب"

# --- 7.1 جلب القوالب ---
print_subsection "7.1 جلب القوالب المتاحة (GET /api/templates)"

RESP=$(api_get "/templates" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب القوالب بنجاح" "200" "$STATUS"
assert_success "استجابة ناجحة" "$BODY"

# --- 7.2 فلترة القوالب حسب التصنيف ---
print_subsection "7.2 فلترة القوالب حسب التصنيف"

for CAT in "business-plan" "financial" "legal" "marketing" "pitch-deck"; do
    RESP=$(api_get "/templates?category=${CAT}" "$ENTREPRENEUR_TOKEN")
    BODY=$(get_body "$RESP")
    STATUS=$(get_status "$RESP")
    assert_http_status "فلترة بتصنيف ${CAT}" "200" "$STATUS"
done

# --- 7.3 فلترة القوالب حسب التخصص ---
print_subsection "7.3 فلترة القوالب حسب التخصص"

RESP=$(api_get "/templates?specialtyId=${SPECIALTY_ID}" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "فلترة بتخصص محدد" "200" "$STATUS"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٨: الإشعارات
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٨: الإشعارات"

# --- 8.1 جلب الإشعارات ---
print_subsection "8.1 جلب الإشعارات (GET /api/notifications)"

RESP=$(api_get "/notifications" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "جلب الإشعارات بنجاح" "200" "$STATUS"
assert_success "استجابة ناجحة" "$BODY"

# بعد قبول المرحلة يجب أن يكون هناك إشعارات
NOTIF_COUNT=$(echo "$BODY" | jq -r '.data.notifications | length' 2>/dev/null)
echo -e "    ℹ️  عدد الإشعارات: ${NOTIF_COUNT}"

# --- 8.2 فلترة الإشعارات غير المقروءة ---
print_subsection "8.2 فلترة الإشعارات غير المقروءة"

RESP=$(api_get "/notifications?unreadOnly=true" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "فلترة غير المقروءة" "200" "$STATUS"

# --- 8.3 تعليم الكل كمقروء ---
print_subsection "8.3 تعليم جميع الإشعارات كمقروءة"

RESP=$(api_patch "/notifications" "$ENTREPRENEUR_TOKEN" '{"markAllRead":true}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "تعليم الكل كمقروء" "200" "$STATUS"

# تحقق
RESP=$(api_get "/notifications" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
UNREAD=$(echo "$BODY" | jq -r '.data.unreadCount // 0' 2>/dev/null)
assert_eq "عدد غير المقروءة صفر" "0" "$UNREAD"

# --- 8.4 حذف جميع الإشعارات ---
print_subsection "8.4 حذف جميع الإشعارات"

RESP=$(api_delete "/notifications" "$ENTREPRENEUR_TOKEN")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "حذف جميع الإشعارات" "200" "$STATUS"


# ══════════════════════════════════════════════════════════════════════
# التبويب ٩: التحقق من البريد واستعادة كلمة المرور
# ══════════════════════════════════════════════════════════════════════
print_section "التبويب ٩: التحقق من البريد واستعادة كلمة المرور"

# --- 9.1 إعادة إرسال تأكيد البريد ---
print_subsection "9.1 إعادة إرسال تأكيد البريد (POST /api/auth/resend-verification)"

RESP=$(api_post "/auth/resend-verification" "" "{\"email\":\"${ENTREPRENEUR_EMAIL}\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "إعادة إرسال التأكيد" "200" "$STATUS"

# --- 9.2 طلب استعادة كلمة المرور ---
print_subsection "9.2 طلب استعادة كلمة المرور (POST /api/auth/forgot-password)"

RESP=$(api_post "/auth/forgot-password" "" "{\"email\":\"${ENTREPRENEUR_EMAIL}\"}")
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "طلب استعادة كلمة المرور" "200" "$STATUS"
assert_contains "رسالة تأكيد الطلب" "$BODY" "reset"

# --- 9.3 طلب استعادة لبريد غير موجود ---
print_subsection "9.3 طلب استعادة لبريد غير موجود (يجب أن يعطي نفس الرد)"

RESP=$(api_post "/auth/forgot-password" "" '{"email":"nonexistent@masar.sa"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_http_status "نفس الرد لمنع كشف البريدات" "200" "$STATUS"

# --- 9.4 محاولة إعادة تعيين كلمة مرور بتوكن وهمي ---
print_subsection "9.4 رفض إعادة تعيين كلمة مرور بتوكن وهمي"

RESP=$(api_post "/auth/reset-password" "" '{"token":"fake-token-123","password":"newpass123"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض توكن وهمي" "200" "$STATUS"

# --- 9.5 كلمة مرور قصيرة لإعادة التعيين ---
print_subsection "9.5 رفض كلمة مرور قصيرة لإعادة التعيين"

RESP=$(api_post "/auth/reset-password" "" '{"token":"fake-token","password":"12"}')
BODY=$(get_body "$RESP")
STATUS=$(get_status "$RESP")
assert_not_eq "رفض كلمة مرور قصيرة" "200" "$STATUS"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLEANUP
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Deactivate test accounts
if [ -n "${ADMIN_TOKEN:-}" ] && [ -n "${NEW_ENTREPRENEUR_ID:-}" ]; then
    api_patch "/admin/users" "$ADMIN_TOKEN" "{\"userId\":\"${NEW_ENTREPRENEUR_ID}\",\"isActive\":false}" > /dev/null 2>&1 || true
fi
cleanup_test_data

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
print_summary "رائد الأعمال"
