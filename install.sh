#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd -P)"
PREFIX="${PREFIX:-}"
INSTALL_HOME="${PREFIX:-$HOME}"
WORKSPACE="${WORKSPACE:-$HOME/SISO_Workspace}"
SKILLS_DIR="$INSTALL_HOME/.claude/skills"
BIN_DIR="$INSTALL_HOME/bin"
LAUNCH_AGENTS_DIR="$INSTALL_HOME/Library/LaunchAgents"
CONFIG_DIR="$INSTALL_HOME/.config/siso-agent-playbook"
STATE_DIR="$INSTALL_HOME/.local/state/siso-agent-playbook"
BACKUP_DIR="$STATE_DIR/backups"
MANIFEST="$STATE_DIR/install.tsv"
WORKSPACE_RECORD="$STATE_DIR/workspace.path"
NEW_MANIFEST=""

case "$INSTALL_HOME$WORKSPACE" in
  *"'"*|*$'\t'*|*$'\n'*)
    echo "install.sh: paths containing quotes, tabs, or newlines are unsupported" >&2
    exit 64
    ;;
esac

say() { printf '%s\n' "$*"; }

previous_field() {
  field="$1"
  destination="$2"
  [ -f "$MANIFEST" ] || return 0
  awk -F '\t' -v destination="$destination" -v field="$field" '$2 == destination { print $field; exit }' "$MANIFEST"
}

record() {
  printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" >> "$NEW_MANIFEST"
}

backup_collision() {
  destination="$1"
  backup="$BACKUP_DIR/$(basename "$destination").$(date +%Y%m%dT%H%M%S).$$"
  mkdir -p "$BACKUP_DIR"
  mv "$destination" "$backup"
  say "BACKUP $destination -> $backup" >&2
  printf '%s\n' "$backup"
}

install_link() {
  source_path="$1"
  destination="$2"
  previous_backup="$(previous_field 4 "$destination")"
  mkdir -p "$(dirname "$destination")"

  if [ -L "$destination" ] && [ "$(readlink "$destination")" = "$source_path" ]; then
    say "KEEP   $destination -> $source_path"
  else
    if [ -e "$destination" ] || [ -L "$destination" ]; then
      if [ -n "$(previous_field 1 "$destination")" ]; then
        rm -rf "$destination"
      else
        previous_backup="$(backup_collision "$destination")"
      fi
    fi
    ln -s "$source_path" "$destination"
    say "LINK   $destination -> $source_path"
  fi
  record link "$destination" "$source_path" "$previous_backup"
}

install_file() {
  source_path="$1"
  destination="$2"
  previous_backup="$(previous_field 4 "$destination")"
  mkdir -p "$(dirname "$destination")"

  if [ -f "$destination" ] && cmp -s "$source_path" "$destination"; then
    say "KEEP   $destination"
  else
    if [ -e "$destination" ] || [ -L "$destination" ]; then
      if [ -z "$(previous_field 1 "$destination")" ]; then
        previous_backup="$(backup_collision "$destination")"
      else
        rm -rf "$destination"
      fi
    fi
    cp "$source_path" "$destination"
    chmod +x "$destination"
    say "COPY   $destination"
  fi
  record file "$destination" "$source_path" "$previous_backup"
}

install_generated() {
  source_path="$1"
  destination="$2"
  previous_backup="$(previous_field 4 "$destination")"
  mkdir -p "$(dirname "$destination")"

  if [ -f "$destination" ] && cmp -s "$source_path" "$destination"; then
    say "KEEP   $destination"
  else
    if [ -e "$destination" ] || [ -L "$destination" ]; then
      if [ -z "$(previous_field 1 "$destination")" ]; then
        previous_backup="$(backup_collision "$destination")"
      else
        rm -rf "$destination"
      fi
    fi
    cp "$source_path" "$destination"
    say "WRITE  $destination"
  fi
  record generated "$destination" generated "$previous_backup"
}

xml_escape() {
  printf '%s' "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g'
}

write_plist() {
  destination="$1"
  label="$2"
  schedule="$3"
  command="$4"
  stdout_path="$5"
  stderr_path="$6"
  temp_file="$(mktemp "$STATE_DIR/plist.XXXXXX")"
  escaped_command="$(xml_escape "$command")"
  escaped_stdout="$(xml_escape "$stdout_path")"
  escaped_stderr="$(xml_escape "$stderr_path")"
  cat > "$temp_file" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$label</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>$escaped_command</string>
  </array>
  $schedule
  <key>StandardOutPath</key>
  <string>$escaped_stdout</string>
  <key>StandardErrorPath</key>
  <string>$escaped_stderr</string>
</dict>
</plist>
EOF
  install_generated "$temp_file" "$destination"
  rm -f "$temp_file"
}

load_agent() {
  label="$1"
  plist="$2"
  domain="gui/$(id -u)"
  launchctl bootout "$domain/$label" >/dev/null 2>&1 || true
  if launchctl bootstrap "$domain" "$plist" >/dev/null 2>&1; then
    say "LOAD   $label"
  elif launchctl load -w "$plist" >/dev/null 2>&1; then
    say "LOAD   $label (legacy launchctl)"
  else
    echo "install.sh: could not load $label from $plist" >&2
    return 1
  fi
}

mkdir -p "$STATE_DIR" "$BACKUP_DIR" "$SKILLS_DIR" "$BIN_DIR" "$LAUNCH_AGENTS_DIR" "$CONFIG_DIR"
mkdir -p "$WORKSPACE/.agents/telemetry/events" "$WORKSPACE/.agents/telemetry/logs" "$WORKSPACE/.agents/telemetry/state"
say "MKDIR  $WORKSPACE/.agents/telemetry/{events,logs,state}"

NEW_MANIFEST="$(mktemp "$STATE_DIR/install.XXXXXX")"
trap 'rm -f "${NEW_MANIFEST:-}"' EXIT

for skill in "$REPO_ROOT"/skills/*; do
  [ -d "$skill" ] || continue
  install_link "$skill" "$SKILLS_DIR/$(basename "$skill")"
done

for tool in "$REPO_ROOT"/bin/*; do
  [ -f "$tool" ] || continue
  install_file "$tool" "$BIN_DIR/$(basename "$tool")"
done

workspace_env="$(mktemp "$STATE_DIR/workspace-env.XXXXXX")"
cat > "$workspace_env" <<EOF
export WORKSPACE='$WORKSPACE'
export SISO_BIN_DIR='$BIN_DIR'
export CLAUDE_SKILLS_DIR='$SKILLS_DIR'
EOF
install_generated "$workspace_env" "$CONFIG_DIR/workspace.env"
rm -f "$workspace_env"

secrets_template="$STATE_DIR/secrets.template"
cat > "$secrets_template" <<'EOF'
# Required by lane-health. Replace the empty value locally; never commit this file.
export BIFROST_VIRTUAL_KEY=''
EOF
if [ ! -e "$CONFIG_DIR/secrets.env" ]; then
  cp "$secrets_template" "$CONFIG_DIR/secrets.env"
  chmod 600 "$CONFIG_DIR/secrets.env"
  say "WRITE  $CONFIG_DIR/secrets.env"
fi
record secret "$CONFIG_DIR/secrets.env" "$secrets_template" ""

lane_command="source '$CONFIG_DIR/workspace.env'; source '$CONFIG_DIR/secrets.env'; exec '$BIN_DIR/lane-health'"
stack_command="source '$CONFIG_DIR/workspace.env'; exec '$BIN_DIR/stack-check'"
write_plist \
  "$LAUNCH_AGENTS_DIR/com.siso.lane-health.plist" \
  "com.siso.lane-health" \
  '<key>RunAtLoad</key><true/><key>StartInterval</key><integer>600</integer>' \
  "$lane_command" \
  "$WORKSPACE/.agents/telemetry/logs/lane-health.stdout.log" \
  "$WORKSPACE/.agents/telemetry/logs/lane-health.stderr.log"
write_plist \
  "$LAUNCH_AGENTS_DIR/com.siso.stack-check.plist" \
  "com.siso.stack-check" \
  '<key>StartCalendarInterval</key><dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>4</integer><key>Minute</key><integer>0</integer></dict>' \
  "$stack_command" \
  "$WORKSPACE/.agents/telemetry/logs/stack-check.stdout.log" \
  "$WORKSPACE/.agents/telemetry/logs/stack-check.stderr.log"

printf '%s\n' "$WORKSPACE" > "$WORKSPACE_RECORD"
mv "$NEW_MANIFEST" "$MANIFEST"
NEW_MANIFEST=""

if [ -n "$PREFIX" ]; then
  say "SKIP   launchctl loading because PREFIX=$PREFIX"
elif [ "$(uname -s)" = "Darwin" ] && command -v launchctl >/dev/null 2>&1; then
  load_agent com.siso.lane-health "$LAUNCH_AGENTS_DIR/com.siso.lane-health.plist"
  load_agent com.siso.stack-check "$LAUNCH_AGENTS_DIR/com.siso.stack-check.plist"
else
  say "SKIP   launchctl loading (macOS launchctl not available)"
fi

say ""
say "Installed SISO Agent Playbook."
say "Set your workspace when it differs from: $WORKSPACE"
say "Set BIFROST_VIRTUAL_KEY in: $CONFIG_DIR/secrets.env"
say "Add $BIN_DIR to PATH if it is not already present."
say "Re-run safely with the same WORKSPACE; uninstall with ./uninstall.sh."
