#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# Masar Platform - مُشغّل الاختبارات الشامل
# Master Test Runner - Runs all scenario files
# ═══════════════════════════════════════════════════════════════════════
# Usage:
#   ./tests/run-all.sh            # تشغيل جميع الاختبارات
#   ./tests/run-all.sh consultant # تشغيل اختبارات المستشار فقط
#   ./tests/run-all.sh entrepreneur # تشغيل اختبارات رائد الأعمال فقط
#   ./tests/run-all.sh admin      # تشغيل اختبارات الأدمن فقط
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# Results tracking
declare -A RESULTS
OVERALL_FAILED=0

# ─── Check Dependencies ─────────────────────────────────────────────
check_deps() {
    local missing=()
    command -v curl >/dev/null 2>&1 || missing+=("curl")
    command -v jq >/dev/null 2>&1 || missing+=("jq")

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${RED}❌ أدوات مفقودة: ${missing[*]}${NC}"
        echo -e "${YELLOW}ثبّتها بـ: apt-get install ${missing[*]}${NC}"
        exit 1
    fi
}

# ─── Run a test file ─────────────────────────────────────────────────
run_test_file() {
    local name="$1"
    local file="$2"

    echo ""
    echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║${NC}  ${BOLD}🚀 تشغيل: ${name}${NC}"
    echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}"

    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ الملف غير موجود: ${file}${NC}"
        RESULTS["$name"]="MISSING"
        OVERALL_FAILED=$((OVERALL_FAILED + 1))
        return
    fi

    # Run the test and capture exit code
    set +e
    bash "$file"
    local exit_code=$?
    set -e

    if [ $exit_code -eq 0 ]; then
        RESULTS["$name"]="PASSED"
    else
        RESULTS["$name"]="FAILED"
        OVERALL_FAILED=$((OVERALL_FAILED + 1))
    fi
}

# ─── Print Final Summary ─────────────────────────────────────────────
print_final_summary() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${BOLD}📊 ملخص النتائج النهائي - جميع الاختبارات${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    for name in "${!RESULTS[@]}"; do
        local status="${RESULTS[$name]}"
        case "$status" in
            PASSED)  echo -e "  ${GREEN}✅ ${name}: نجاح${NC}" ;;
            FAILED)  echo -e "  ${RED}❌ ${name}: فشل${NC}" ;;
            MISSING) echo -e "  ${YELLOW}⚠️  ${name}: ملف مفقود${NC}" ;;
        esac
    done

    echo ""

    if [ "$OVERALL_FAILED" -eq 0 ]; then
        echo -e "${GREEN}  🎉🎉🎉 جميع الاختبارات نجحت بنسبة 100%! 🎉🎉🎉${NC}"
    else
        echo -e "${RED}  ⚠️  هناك ${OVERALL_FAILED} مجموعة اختبارات فاشلة${NC}"
    fi
    echo ""

    return $OVERALL_FAILED
}

# ─── Main ─────────────────────────────────────────────────────────────
check_deps

TARGET="${1:-all}"
BASE_URL="${BASE_URL:-http://localhost:3000/api}"

echo -e "${BOLD}🧪 مُشغّل اختبارات مَسَار${NC}"
echo -e "🎯 الهدف: ${TARGET}"
echo -e "🌐 الخادم: ${BASE_URL}"
echo ""

case "$TARGET" in
    consultant)
        run_test_file "سيناريوهات المستشار" "${SCRIPT_DIR}/consultant-scenarios.sh"
        ;;
    entrepreneur)
        run_test_file "سيناريوهات رائد الأعمال" "${SCRIPT_DIR}/entrepreneur-scenarios.sh"
        ;;
    admin)
        run_test_file "سيناريوهات الأدمن" "${SCRIPT_DIR}/admin-scenarios.sh"
        ;;
    all)
        run_test_file "سيناريوهات الأدمن" "${SCRIPT_DIR}/admin-scenarios.sh"
        run_test_file "سيناريوهات المستشار" "${SCRIPT_DIR}/consultant-scenarios.sh"
        run_test_file "سيناريوهات رائد الأعمال" "${SCRIPT_DIR}/entrepreneur-scenarios.sh"
        ;;
    *)
        echo -e "${RED}❌ هدف غير معروف: ${TARGET}${NC}"
        echo ""
        echo "الاستخدام:"
        echo "  $0 all            تشغيل جميع الاختبارات"
        echo "  $0 admin          تشغيل اختبارات الأدمن فقط"
        echo "  $0 consultant     تشغيل اختبارات المستشار فقط"
        echo "  $0 entrepreneur   تشغيل اختبارات رائد الأعمال فقط"
        echo ""
        echo "متغيرات البيئة:"
        echo "  BASE_URL  عنوان API (افتراضي: http://localhost:3000/api)"
        exit 1
        ;;
esac

print_final_summary
