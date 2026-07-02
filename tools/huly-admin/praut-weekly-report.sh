#!/bin/zsh
# Cron wrapper: vygeneruje týdenní přehled pro vedení (pondělí ráno).
# Spouští se z import-tool (node_modules platformy). Loguje mimo git.
# Instalace do cronu (na Macu, kde běží import-tool):
#   0 7 * * 1 /Users/stepan/praut/huly-selfhost/tools/huly-admin/praut-weekly-report.sh
IMPORT_TOOL="/Users/stepan/praut/HulyPrautplatform/dev/import-tool"
SCRIPT="/Users/stepan/praut/huly-selfhost/tools/huly-admin/praut-weekly-report.cjs"
LOG="/Users/stepan/praut/praut-weekly-report.log"
cd "$IMPORT_TOOL" || exit 1
echo "----- $(date) -----" >> "$LOG"
NODE_PATH="$IMPORT_TOOL/node_modules" /opt/homebrew/bin/node "$SCRIPT" --apply 2>&1 \
  | grep -v "no document found" >> "$LOG" 2>&1
