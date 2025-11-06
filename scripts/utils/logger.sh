#!/usr/bin/env bash
set -euo pipefail
# ----------------------------
# 📘 logger.sh
# Logger functions
# ----------------------------

# source colors
source "${SCRIPT_DIR}/constants/colors.sh"

log_info() { echo -e "${BLUE}[INFO]${RESET} $*"; }
log_info() { echo -e "${BLUE}[INFO]${RESET} $*"; }
log_success() { echo -e "${GREEN}[SUCCESS]${RESET} $*"; }
log_warning() { echo -e "${YELLOW}[WARNING]${RESET} $*"; }
log_error() { echo -e "${RED}[ERROR]${RESET} $*" >&2; }


