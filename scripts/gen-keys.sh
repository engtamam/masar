#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# Masar Platform - Secure Key Generator
# Generates random keys for JWT_SECRET and ENCRYPTION_KEY
# and updates .env file automatically
# ═══════════════════════════════════════════════════════════

set -e

ENV_FILE=".env"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "🔐 Masar Platform - Secure Key Generator"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Generate keys
JWT_KEY=$(openssl rand -hex 32)
ENC_KEY=$(openssl rand -hex 32)

# Show generated keys
echo -e "${CYAN}Generated Keys:${NC}"
echo ""
echo -e "  JWT_SECRET     = ${GREEN}${JWT_KEY}${NC}"
echo -e "  ENCRYPTION_KEY = ${GREEN}${ENC_KEY}${NC}"
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠  No .env file found. Creating from .env.example...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ .env created from .env.example${NC}"
    else
        echo -e "${RED}❌ .env.example not found either! Creating minimal .env...${NC}"
        cat > .env << EOF
DATABASE_URL=file:./dev.db
JWT_SECRET=${JWT_KEY}
ADMIN_EMAIL=admin@masar.sa
ADMIN_PASSWORD=admin123
ADMIN_NAME=مدير المنصة
ENCRYPTION_KEY=${ENC_KEY}
EOF
        echo -e "${GREEN}✅ Minimal .env created with generated keys${NC}"
        echo ""
        exit 0
    fi
fi

# Update .env file
echo -e "${CYAN}Updating .env file...${NC}"

# Update or add JWT_SECRET
if grep -q "^JWT_SECRET=" "$ENV_FILE"; then
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_KEY}|" "$ENV_FILE"
    echo -e "  ${GREEN}✅ JWT_SECRET updated${NC}"
else
    echo "JWT_SECRET=${JWT_KEY}" >> "$ENV_FILE"
    echo -e "  ${GREEN}✅ JWT_SECRET added${NC}"
fi

# Update or add ENCRYPTION_KEY
if grep -q "^ENCRYPTION_KEY=" "$ENV_FILE"; then
    sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${ENC_KEY}|" "$ENV_FILE"
    echo -e "  ${GREEN}✅ ENCRYPTION_KEY updated${NC}"
else
    echo "ENCRYPTION_KEY=${ENC_KEY}" >> "$ENV_FILE"
    echo -e "  ${GREEN}✅ ENCRYPTION_KEY added${NC}"
fi

echo ""
echo -e "${GREEN}✅ Done! Your .env now has secure random keys.${NC}"
echo -e "${YELLOW}⚠  Restart your server for changes to take effect.${NC}"
echo ""
