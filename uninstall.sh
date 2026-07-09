#!/bin/bash
set -euo pipefail

PREFIX="${PREFIX:-}"
INSTALL_HOME="${PREFIX:-$HOME}"
STATE_DIR="$INSTALL_HOME/.local/state/siso-agent-playbook"
MANIFEST="$STATE_DIR/install.tsv"
WORKSPACE_RECORD="$STATE_DIR/workspace.path"
LAUNCH_AGENTS_DIR="$INSTALL_HOME/Library/LaunchAgents"

say() { printf '%s\n' "$*"; }

unload_agent() {
  label="$1"
  plist="$2"
  domain="gui/$(id -u)"
  launchctl bootout "$domain/$label" >/dev/null 2>&1 || launchctl unload -w "$plist" >/dev/null 2>&1 || true
  say "UNLOAD $label"
}

if [ ! -f "$MANIFEST" ]; then
  say "Nothing to uninstall for install home: $INSTALL_HOME"
  exit 0
fi

if [ -n "$PREFIX" ]; then
  say "SKIP   launchctl unloading because PREFIX=$PREFIX"
elif [ "$(uname -s)" = "Darwin" ] && command -v launchctl >/dev/null 2>&1; then
  unload_agent com.siso.lane-health "$LAUNCH_AGENTS_DIR/com.siso.lane-health.plist"
  unload_agent com.siso.stack-check "$LAUNCH_AGENTS_DIR/com.siso.stack-check.plist"
fi

reversed_manifest="$(mktemp "$STATE_DIR/uninstall.XXXXXX")"
trap 'rm -f "$reversed_manifest"' EXIT
awk '{ lines[NR] = $0 } END { for (line = NR; line > 0; line--) print lines[line] }' "$MANIFEST" > "$reversed_manifest"

while IFS=$'\t' read -r kind destination source_path backup_path; do
  [ -n "$destination" ] || continue
  case "$kind" in
    link)
      if [ -L "$destination" ] && [ "$(readlink "$destination")" = "$source_path" ]; then
        rm "$destination"
        say "REMOVE $destination"
      fi
      ;;
    file|generated)
      if [ -e "$destination" ] || [ -L "$destination" ]; then
        rm -rf "$destination"
        say "REMOVE $destination"
      fi
      ;;
    secret)
      if [ -f "$destination" ] && [ -f "$source_path" ] && cmp -s "$destination" "$source_path"; then
        rm "$destination"
        say "REMOVE $destination"
      else
        say "KEEP   $destination (user-managed secret file)"
      fi
      ;;
  esac

  if [ -n "${backup_path:-}" ] && [ -e "$backup_path" ] && [ ! -e "$destination" ] && [ ! -L "$destination" ]; then
    mkdir -p "$(dirname "$destination")"
    mv "$backup_path" "$destination"
    say "RESTORE $destination"
  fi
done < "$reversed_manifest"

WORKSPACE="${WORKSPACE:-}"
if [ -z "$WORKSPACE" ] && [ -f "$WORKSPACE_RECORD" ]; then
  WORKSPACE="$(cat "$WORKSPACE_RECORD")"
fi

rm -f "$MANIFEST" "$WORKSPACE_RECORD" "$reversed_manifest" "$STATE_DIR/secrets.template"
trap - EXIT
find "$STATE_DIR/backups" -type d -empty -delete 2>/dev/null || true
rmdir "$STATE_DIR" 2>/dev/null || true
rmdir "$INSTALL_HOME/.local/state" "$INSTALL_HOME/.local" 2>/dev/null || true
rmdir "$INSTALL_HOME/.claude/skills" "$INSTALL_HOME/.claude" 2>/dev/null || true
rmdir "$INSTALL_HOME/bin" 2>/dev/null || true
rmdir "$INSTALL_HOME/Library/LaunchAgents" "$INSTALL_HOME/Library" 2>/dev/null || true
rmdir "$INSTALL_HOME/.config/siso-agent-playbook" "$INSTALL_HOME/.config" 2>/dev/null || true

if [ -n "$WORKSPACE" ]; then
  rmdir "$WORKSPACE/.agents/telemetry/events" "$WORKSPACE/.agents/telemetry/logs" "$WORKSPACE/.agents/telemetry/state" 2>/dev/null || true
  rmdir "$WORKSPACE/.agents/telemetry" "$WORKSPACE/.agents" "$WORKSPACE" 2>/dev/null || true
fi

say "Uninstalled SISO Agent Playbook from $INSTALL_HOME"
