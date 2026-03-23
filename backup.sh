#!/bin/bash
# backup.sh - Automated backup script for Rddhi production database
# Usage: ./backup.sh
# Run via cron: 0 2 * * * /path/to/backup.sh (Daily at 2 AM)

set -e

# Configuration
BACKUP_DIR="/backups/rddhi"
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/rddhi_backup_$BACKUP_DATE.archive"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Logging
LOG_FILE="$BACKUP_DIR/backup.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..." | tee -a $LOG_FILE

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# === Method 1: MongoDB Atlas (Cloud) - Automatically handled ===
# If using MongoDB Atlas, backups are automatic!
# You can also trigger on-demand backups via their API:
# See: https://docs.atlas.mongodb.com/reference/api/backup-restore-restore/

# === Method 2: Self-Hosted MongoDB ===
# Uncomment if using self-hosted MongoDB
# mongodump \
#   --uri="$MONGO_URL" \
#   --out="$BACKUP_DIR/mongo_dump_$BACKUP_DATE" \
#   --gzip 2>&1 | tee -a $LOG_FILE

# === Method 3: Full Docker container backup ===
if command -v docker &> /dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backing up Docker volumes..." | tee -a $LOG_FILE
    
    # Backup MongoDB container volume
    docker run --rm \
        -v rddhi-mongodb-data:/data \
        -v $BACKUP_DIR:/backup \
        alpine tar czf /backup/mongodb_volume_$BACKUP_DATE.tar.gz -C /data . \
        2>&1 | tee -a $LOG_FILE || true
fi

# === Method 4: Application state backup ===
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Creating application backup..." | tee -a $LOG_FILE

# Backup current app state
if [ -d "/app" ]; then
    tar --exclude=node_modules --exclude=.git --exclude=venv \
        -czf "$BACKUP_DIR/app_state_$BACKUP_DATE.tar.gz" \
        /app 2>&1 | tee -a $LOG_FILE || true
fi

# === Encryption (Optional but recommended) ===
if command -v gpg &> /dev/null && [ ! -z "$GPG_RECIPIENT" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Encrypting backups..." | tee -a $LOG_FILE
    for file in $BACKUP_DIR/*_$BACKUP_DATE.*; do
        gpg --encrypt --recipient "$GPG_RECIPIENT" "$file" 2>&1 | tee -a $LOG_FILE || true
        rm "$file"
    done
fi

# === Upload to S3 (Optional) ===
if command -v aws &> /dev/null && [ ! -z "$AWS_S3_BUCKET" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploading to S3..." | tee -a $LOG_FILE
    aws s3 cp "$BACKUP_DIR/" "s3://$AWS_S3_BUCKET/rddhi-backups/" \
        --recursive \
        --include "*_$BACKUP_DATE.*" \
        2>&1 | tee -a $LOG_FILE || true
fi

# === Cleanup old backups ===
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning up old backups (older than $RETENTION_DAYS days)..." | tee -a $LOG_FILE
find $BACKUP_DIR -type f -name "*.archive" -o -name "*.tar.gz" -o -name "*.dump" | \
    while read file; do
        if [ $(find "$file" -mtime +$RETENTION_DAYS) ]; then
            rm "$file" && echo "Deleted: $file" | tee -a $LOG_FILE
        fi
    done

# === Backup verification ===
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup verification..." | tee -a $LOG_FILE
BACKUP_SIZE=$(du -sh $BACKUP_DIR | cut -f1)
BACKUP_COUNT=$(find $BACKUP_DIR -type f ! -name "*.log" | wc -l)

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Backup complete!" | tee -a $LOG_FILE
echo "Backup directory size: $BACKUP_SIZE" | tee -a $LOG_FILE
echo "Backup files: $BACKUP_COUNT" | tee -a $LOG_FILE

# === Send notification (Optional) ===
if [ ! -z "$ADMIN_EMAIL" ]; then
    # Send success email (requires mail/sendmail configured)
    echo "Rddhi backup completed: $BACKUP_SIZE ($BACKUP_COUNT files)" | \
        mail -s "✅ Rddhi Backup Success" "$ADMIN_EMAIL" || true
fi

exit 0
