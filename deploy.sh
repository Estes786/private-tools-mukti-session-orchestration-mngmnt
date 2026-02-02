#!/bin/bash

# 🚀 Quick Deploy Script - Multi-Session Orchestrator
# This script automates the deployment process to Cloudflare Pages

set -e  # Exit on error

echo "🚀 Multi-Session Orchestrator - Deployment Script"
echo "=================================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /home/user/webapp

echo ""
echo "📋 Step 1: Cleaning up..."
fuser -k 3000/tcp 2>/dev/null || true
pm2 delete multi-session-orchestrator 2>/dev/null || true

echo ""
echo "🔨 Step 2: Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful!${NC}"
else
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo ""
echo "🗄️ Step 3: Applying D1 migrations locally..."
npm run db:migrate:local

echo ""
echo "🌐 Step 4: Starting local development server..."
pm2 start ecosystem.config.cjs

echo ""
echo "⏳ Waiting for server to start..."
sleep 5

echo ""
echo "🧪 Step 5: Testing local server..."
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Local server is running!${NC}"
    echo "🌐 Sandbox URL: https://3000-ixp9qpckioxl1suhoboj7-583b4d74.sandbox.novita.ai"
else
    echo -e "${RED}❌ Local server failed to start!${NC}"
    pm2 logs multi-session-orchestrator --nostream --lines 50
    exit 1
fi

echo ""
echo "📊 Step 6: Checking PM2 status..."
pm2 list

echo ""
echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}⚠️  MANUAL ACTIONS REQUIRED:${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""
echo "1. Setup GitHub Authentication:"
echo "   - Go to #github tab"
echo "   - Complete GitHub authorization"
echo ""
echo "2. Setup Cloudflare Credentials:"
echo "   - Go to Deploy tab"
echo "   - Configure Cloudflare API Key"
echo "   - Account ID: a51295a10bce67facf2e15cb66293a7e"
echo ""
echo "3. Update Cloudflare Pages Build Settings:"
echo "   - Go to: https://dash.cloudflare.com"
echo "   - Navigate to: Workers & Pages > Pages > private-tools-multi-session-orchestration"
echo "   - Settings > Builds & deployments"
echo "   - Build command: npm run build"
echo "   - Build output directory: dist"
echo ""
echo "4. Deploy to Production:"
echo "   After credentials setup, run:"
echo "   $ npm run db:migrate:prod"
echo "   $ npx wrangler pages deploy dist --project-name private-tools-multi-session-orchestration"
echo ""
echo -e "${GREEN}✅ Local environment is ready!${NC}"
echo -e "${GREEN}📖 Read DEPLOYMENT_GUIDE.md for detailed instructions${NC}"
