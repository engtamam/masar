#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# Masar Platform - Common Test Utilities
# Shared functions: login, assertions, API helpers, reporting
# ═══════════════════════════════════════════════════════════════════════

set -uo pipefail
# NOTE: Do NOT use `set -e` — assertions need to handle failures gracefully

# ─── Configuration ───────────────────────────────────────────────────
BASE_URL="${BASE_URL:-http://localhost:3000/api}"
TIMEOUT=15

# ─── Colors ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ─── Counters ────────────────────────────────────────────────────────
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# ─── Section Tracking ────────────────────────────────────────────────
CURRENT_SECTION=""

# ─── Print Helpers ───────────────────────────────────────────────────
print_banner() {
    echo ""
    echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║${NC}  ${BOLD}$1${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    CURRENT_SECTION="$1"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  📂 ${BOLD}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_subsection() {
    echo ""
    echo -e "${CYAN}  ▸ $1${NC}"
}

# ─── Assertion Functions ─────────────────────────────────────────────
assert_eq() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$expected" = "$actual" ]; then
        echo -e "    ${GREEN}✅ ${test_name}${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "    ${RED}❌ ${test_name}${NC}"
        echo -e "       Expected: ${expected}"
        echo -e "       Actual:   ${actual}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

assert_not_eq() {
    local test_name="$1"
    local not_expected="$2"
    local actual="$3"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$not_expected" != "$actual" ]; then
        echo -e "    ${GREEN}✅ ${test_name}${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "    ${RED}❌ ${test_name}${NC}"
        echo -e "       Should NOT be: ${not_expected}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

assert_contains() {
    local test_name="$1"
    local haystack="$2"
    local needle="$3"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if echo "$haystack" | grep -q "$needle"; then
        echo -e "    ${GREEN}✅ ${test_name}${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "    ${RED}❌ ${test_name}${NC}"
        echo -e "       Expected to contain: ${needle}"
        echo -e "       In: ${haystack:0:200}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

assert_not_contains() {
    local test_name="$1"
    local haystack="$2"
    local needle="$3"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if ! echo "$haystack" | grep -q "$needle"; then
        echo -e "    ${GREEN}✅ ${test_name}${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "    ${RED}❌ ${test_name}${NC}"
        echo -e "       Should NOT contain: ${needle}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

assert_gt() {
    local test_name="$1"
    local val1="$2"
    local val2="$3"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$val1" -gt "$val2" ] 2>/dev/null; then
        echo -e "    ${GREEN}✅ ${test_name}${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "    ${RED}❌ ${test_name}${NC}"
        echo -e "       ${val1} should be > ${val2}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

assert_gte() {
    local test_name="$1"
    local val1="$2"
    local val2="$3"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$val1" -ge "$val2" ] 2>/dev/null; then
        echo -e "    ${GREEN}✅ ${test_name}${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "    ${RED}❌ ${test_name}${NC}"
        echo -e "       ${val1} should be >= ${val2}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

assert_http_status() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$expected" = "$actual" ]; then
        echo -e "    ${GREEN}✅ ${test_name} (HTTP ${actual})${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "    ${RED}❌ ${test_name} (Expected HTTP ${expected}, got ${actual})${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

assert_success() {
    local test_name="$1"
    local response="$2"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local success=$(echo "$response" | jq -r '.success' 2>/dev/null || echo "null")
    if [ "$success" = "true" ]; then
        echo -e "    ${GREEN}✅ ${test_name}${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "    ${RED}❌ ${test_name}${NC}"
        local err=$(echo "$response" | jq -r '.error // "unknown error"' 2>/dev/null)
        echo -e "       Error: ${err}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

assert_failed() {
    local test_name="$1"
    local response="$2"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    local success=$(echo "$response" | jq -r '.success' 2>/dev/null || echo "null")
    if [ "$success" = "false" ]; then
        echo -e "    ${GREEN}✅ ${test_name}${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "    ${RED}❌ ${test_name} (Expected failure but got success)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

skip_test() {
    local test_name="$1"
    local reason="${2:-skipped}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
    echo -e "    ${YELLOW}⏭️  ${test_name} (${reason})${NC}"
}

# ─── API Helpers ─────────────────────────────────────────────────────
api_call() {
    local method="$1"
    local endpoint="$2"
    local token="${3:-}"
    local body="${4:-}"

    local auth_header=""
    if [ -n "$token" ]; then
        auth_header=" -H 'Authorization: Bearer ${token}'"
    fi

    local data_arg=""
    if [ -n "$body" ]; then
        data_arg=" -d '${body}'"
    fi

    local cmd="curl -s -w '\\n%{http_code}' --max-time ${TIMEOUT} -X ${method} -H 'Content-Type: application/json'${auth_header}${data_arg} '${BASE_URL}${endpoint}'"

    local response
    response=$(eval "$cmd" 2>/dev/null) || {
        echo '{"success":false,"error":"Connection refused"}'
        echo "000"
        return
    }

    echo "$response"
}

# Extract HTTP status code from response (last line)
get_status() {
    echo "$1" | tail -1
}

# Extract JSON body from response (all lines except last)
get_body() {
    echo "$1" | sed '$d'
}

# Quick API calls with automatic parsing
api_get() {
    local endpoint="$1"
    local token="$2"
    api_call "GET" "$endpoint" "$token" ""
}

api_post() {
    local endpoint="$1"
    local token="$2"
    local body="$3"
    api_call "POST" "$endpoint" "$token" "$body"
}

api_patch() {
    local endpoint="$1"
    local token="$2"
    local body="$3"
    api_call "PATCH" "$endpoint" "$token" "$body"
}

api_delete() {
    local endpoint="$1"
    local token="$2"
    local body="${3:-}"
    api_call "DELETE" "$endpoint" "$token" "$body"
}

# ─── Login Helpers ───────────────────────────────────────────────────
login_as() {
    local email="$1"
    local password="$2"
    local label="$3"

    print_subsection "تسجيل الدخول: ${label}" >&2

    local response
    response=$(api_post "/auth/login" "" "{\"email\":\"${email}\",\"password\":\"${password}\"}")

    local status=$(get_status "$response")
    local body=$(get_body "$response")

    assert_http_status "تسجيل الدخول كـ ${label}" "200" "$status" >&2

    local token=""
    if [ "$status" = "200" ]; then
        token=$(echo "$body" | jq -r '.data.token // empty' 2>/dev/null)
    fi

    # Only the token goes to stdout (captured by caller); everything else to stderr
    echo "$token"
}

# Login as admin and export token
login_admin() {
    ADMIN_TOKEN=$(login_as "admin@masar.sa" "admin123" "أدمن")
    export ADMIN_TOKEN
    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${RED}❌ فشل تسجيل الدخول كأدمن - لا يمكن المتابعة${NC}" >&2
        return 1
    fi
}

# ─── Setup: Create test consultant ──────────────────────────────────
create_test_consultant() {
    local suffix="${1:-$(date +%s)}"
    local email="test.consultant.${suffix}@masar.sa"

    print_subsection "إنشاء مستشار تجريبي: ${email}"

    local response
    response=$(api_post "/admin/users" "$ADMIN_TOKEN" "{
        \"name\": \"مستشار تجريبي\",
        \"email\": \"${email}\",
        \"password\": \"test123\",
        \"role\": \"CONSULTANT\",
        \"specialtyId\": \"${SPECIALTY_ID}\",
        \"bio\": \"مستشار للاختبار\"
    }")

    local status=$(get_status "$response")
    local body=$(get_body "$response")

    if [ "$status" = "201" ]; then
        CONSULTANT_USER_ID=$(echo "$body" | jq -r '.data.id // empty' 2>/dev/null)
        CONSULTANT_PROFILE_ID=$(echo "$body" | jq -r '.data.consultantProfile.id // empty' 2>/dev/null)
        CONSULTANT_EMAIL="$email"
        CONSULTANT_PASSWORD="test123"

        # Login to get token
        CONSULTANT_TOKEN=$(login_as "$CONSULTANT_EMAIL" "$CONSULTANT_PASSWORD" "مستشار تجريبي")

        echo -e "    ${GREEN}📋 Consultant ID: ${CONSULTANT_USER_ID}${NC}"
        echo -e "    ${GREEN}📋 Profile ID: ${CONSULTANT_PROFILE_ID}${NC}"
    else
        echo -e "${RED}❌ فشل إنشاء المستشار التجريبي${NC}"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        return 1
    fi
}

# ─── Setup: Create test entrepreneur ────────────────────────────────
create_test_entrepreneur() {
    local suffix="${1:-$(date +%s)}"
    local email="test.entrepreneur.${suffix}@masar.sa"

    print_subsection "إنشاء رائد أعمال تجريبي: ${email}"

    local response
    response=$(api_post "/admin/users" "$ADMIN_TOKEN" "{
        \"name\": \"رائد أعمال تجريبي\",
        \"email\": \"${email}\",
        \"password\": \"test123\",
        \"role\": \"ENTREPRENEUR\"
    }")

    local status=$(get_status "$response")
    local body=$(get_body "$response")

    if [ "$status" = "201" ]; then
        ENTREPRENEUR_USER_ID=$(echo "$body" | jq -r '.data.id // empty' 2>/dev/null)
        ENTREPRENEUR_PROFILE_ID=$(echo "$body" | jq -r '.data.entrepreneurProfile.id // empty' 2>/dev/null)
        ENTREPRENEUR_EMAIL="$email"
        ENTREPRENEUR_PASSWORD="test123"

        # Login to get token
        ENTREPRENEUR_TOKEN=$(login_as "$ENTREPRENEUR_EMAIL" "$ENTREPRENEUR_PASSWORD" "رائد أعمال تجريبي")

        echo -e "    ${GREEN}📋 Entrepreneur ID: ${ENTREPRENEUR_USER_ID}${NC}"
        echo -e "    ${GREEN}📋 Profile ID: ${ENTREPRENEUR_PROFILE_ID}${NC}"
    else
        echo -e "${RED}❌ فشل إنشاء رائد الأعمال التجريبي${NC}"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        return 1
    fi
}

# ─── Setup: Get first active specialty ──────────────────────────────
get_first_specialty() {
    print_subsection "جلب أول تخصص نشط"

    local response
    response=$(api_get "/admin/specialties?includeInactive=true" "$ADMIN_TOKEN")

    local body=$(get_body "$response")
    SPECIALTY_ID=$(echo "$body" | jq -r '.data[0].id // empty' 2>/dev/null)

    if [ -n "$SPECIALTY_ID" ]; then
        local sname=$(echo "$body" | jq -r '.data[0].nameAr // ""' 2>/dev/null)
        echo -e "    ${GREEN}📋 Specialty: ${sname} (${SPECIALTY_ID})${NC}"
    else
        echo -e "${RED}❌ لا يوجد تخصص نشط - لا يمكن المتابعة${NC}"
        return 1
    fi
}

# ─── Setup: Get first milestone default ─────────────────────────────
get_first_milestone() {
    local response
    response=$(api_get "/admin/milestones?includeInactive=true" "$ADMIN_TOKEN")

    local body=$(get_body "$response")
    MILESTONE_DEFAULT_ID=$(echo "$body" | jq -r '.data[0].id // empty' 2>/dev/null)
    MILESTONE_SPECIALTY_ID=$(echo "$body" | jq -r '.data[0].specialtyId // empty' 2>/dev/null)
}

# ─── Results Summary ─────────────────────────────────────────────────
print_summary() {
    local role="$1"
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  📊 ملخص نتائج الاختبار - ${role}${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "  إجمالي الاختبارات:  ${BOLD}${TOTAL_TESTS}${NC}"
    echo -e "  ${GREEN}ناجحة:              ${PASSED_TESTS}${NC}"
    echo -e "  ${RED}فاشلة:              ${FAILED_TESTS}${NC}"
    if [ "$SKIPPED_TESTS" -gt 0 ]; then
        echo -e "  ${YELLOW}متجاوزة:            ${SKIPPED_TESTS}${NC}"
    fi
    echo ""

    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "${GREEN}  🎉 جميع الاختبارات نجحت!${NC}"
    else
        echo -e "${RED}  ⚠️  هناك ${FAILED_TESTS} اختبار فاشل!${NC}"
    fi
    echo ""

    # Return exit code
    if [ "$FAILED_TESTS" -gt 0 ]; then
        return 1
    fi
    return 0
}

# ─── Health Check ────────────────────────────────────────────────────
check_server_health() {
    print_subsection "فحص صحة الخادم" >&2

    local response
    response=$(api_get "/health" "") || true

    local status=$(get_status "$response")
    local body=$(get_body "$response")

    if [ "$status" = "200" ]; then
        local db_status=$(echo "$body" | jq -r '.data.database.status // "unknown"' 2>/dev/null)
        echo -e "    ${GREEN}✅ الخادم يعمل (DB: ${db_status})${NC}" >&2
    else
        echo -e "${RED}❌ الخادم لا يستجيب! تأكد أن المنصة تعمل على ${BASE_URL}${NC}" >&2
        exit 1
    fi
}

# ─── Cleanup ─────────────────────────────────────────────────────────
cleanup_test_data() {
    # Deactivate test users (soft delete via admin)
    if [ -n "${ADMIN_TOKEN:-}" ] && [ -n "${CONSULTANT_USER_ID:-}" ]; then
        api_patch "/admin/users" "$ADMIN_TOKEN" "{\"userId\":\"${CONSULTANT_USER_ID}\",\"isActive\":false}" > /dev/null 2>&1 || true
    fi
    if [ -n "${ADMIN_TOKEN:-}" ] && [ -n "${ENTREPRENEUR_USER_ID:-}" ]; then
        api_patch "/admin/users" "$ADMIN_TOKEN" "{\"userId\":\"${ENTREPRENEUR_USER_ID}\",\"isActive\":false}" > /dev/null 2>&1 || true
    fi
}