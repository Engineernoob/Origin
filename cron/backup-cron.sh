#!/bin/bash

# Cron job wrapper for Origin platform backups
# This script is intended to be run via cron

# Set environment variables
export PATH="/usr/local/bin:/usr/bin:/bin"

# Configuration
SCRIPT_DIR="/opt/origin/scripts"
LOG_DIR="/var/log/origin-backups"
LOCK_FILE="/var/run/origin-backup.lock"

# Create lock file to prevent multiple instances
(
    flock -n 9 || {
        echo "Backup already running at $(date)" >> "${LOG_DIR}/backup-error.log"
        exit 1
    }

    # Make sure the backup directory exists
    mkdir -p "${LOG_DIR}"

    # Run backup script
    "${SCRIPT_DIR}/backup-script.sh" >> "${LOG_DIR}/backup-$(date +%Y%m%d).log" 2>&1

) 9> "${LOCK_FILE}"
