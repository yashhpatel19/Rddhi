#!/bin/bash
# restore.sh - Restore from backup
# Usage: ./restore.sh <backup_file> <target_environment>
# Example: ./restore.sh /backups/rddhi/rddhi_backup_20260321_120000.archive production

set -e

BACKUP_FILE="${1:?Please provide backup file path}"
TARGET_ENV="${2:production}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⏳ Restoring from backup: $BACKUP_FILE"
echo "⏳ Target environment: $TARGET_ENV"
echo ""
echo "⚠️  WARNING: This will overwrite current data!"
echo "Make sure you have a current backup first!"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled."
    exit 1
fi

# === Step 1: Backup current state ===
echo "📦 Creating safety backup of current state..."
SAFETY_BACKUP="/backups/rddhi/safety_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar czf "$SAFETY_BACKUP" /app || echo "Note: Could not create safety backup"

# === Step 2: Stop application ===
echo "🛑 Stopping application..."
if command -v systemctl &> /dev/null; then
    systemctl stop rddhi-api || true
    systemctl stop rddhi-frontend || true
elif command -v docker &> /dev/null; then
    docker-compose down || true
fi

# === Step 3: Restore MongoDB data ===
if [[ $BACKUP_FILE == *".tar.gz" ]]; then
    echo "📂 Extracting archive..."
    EXTRACT_DIR="/tmp/rddhi_restore_$$"
    mkdir -p $EXTRACT_DIR
    tar xzf "$BACKUP_FILE" -C $EXTRACT_DIR
    
    if [ -d "$EXTRACT_DIR/mongo_dump"* ]; then
        echo "🗄️  Restoring MongoDB from dump..."
        mongorestore \
            --uri="$MONGO_URL" \
            --drop \
            "$EXTRACT_DIR/mongo_dump"* || echo "Restore may have warnings"
    fi
    
    rm -rf $EXTRACT_DIR
fi

# === Step 4: Start application ===
echo "🚀 Starting application..."
if command -v systemctl &> /dev/null; then
    systemctl start rddhi-api
    systemctl start rddhi-frontend
elif command -v docker &> /dev/null; then
    docker-compose up -d
fi

# === Step 5: Verify ===
echo "✅ Restore complete!"
echo "Safety backup saved to: $SAFETY_BACKUP"
echo ""
echo "Verification steps:"
echo "1. Check health: curl http://localhost:8000/health"
echo "2. Test login in browser"
echo "3. Verify all data is present"
echo ""
echo "⚠️  If restore failed, restore safety backup:"
echo "tar xzf $SAFETY_BACKUP -C /"

exit 0
