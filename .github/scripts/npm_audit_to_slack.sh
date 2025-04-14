#!/bin/bash

# Usage: ./npm_audit_to_slack.sh <repository> <branch> <run_link> [--include-dev]
REPO_NAME="$1"   # Notifycal/backend
BRANCH="$2"      # main
RUN_LINK="$3"    #
INCLUDE_DEV="$4" # [--include-dev]

REPO_URL="https://github.com/${REPO_NAME}"

# Validate required environment variables
if [[ -z "$SLACK_CHANNEL" || -z "$SLACK_BOT_TOKEN" ]]; then
  echo "❌ SLACK_CHANNEL and SLACK_BOT_TOKEN and REPO_URL environment variables must be set."
  exit 1
fi

# Run npm audit and capture JSON output
if [[ "$INCLUDE_DEV" == "--include-dev" ]]; then
  AUDIT_JSON=$(npm audit --json)
else
  AUDIT_JSON=$(npm audit --omit=dev --json)
fi

# Parse vulnerability counts
CRITICAL=$(echo "$AUDIT_JSON" | jq '.metadata.vulnerabilities.critical // 0')
HIGH=$(echo "$AUDIT_JSON" | jq '.metadata.vulnerabilities.high // 0')
MODERATE=$(echo "$AUDIT_JSON" | jq '.metadata.vulnerabilities.moderate // 0')
LOW=$(echo "$AUDIT_JSON" | jq '.metadata.vulnerabilities.low // 0')
TOTAL=$((CRITICAL + HIGH + MODERATE + LOW))

# Extract vulnerability details (truncated for readability)
DETAILS=$(echo "$AUDIT_JSON" | jq -r '.vulnerabilities | to_entries | map("- \(.key)[\(.value.range)]: \(.value.severity)") | join("\n")')
DETAILS_ESCAPED=$(echo "$DETAILS" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

SUMMARY="*Summary:* ${TOTAL} vulnerabilities found."

[[ "$CRITICAL" -gt 0 ]] && SUMMARY+="\\n🔥 ${CRITICAL} critical"
[[ "$HIGH" -gt 0 ]] && SUMMARY+="\\n🚨 ${HIGH} high"
[[ "$MODERATE" -gt 0 ]] && SUMMARY+="\\n⚠️ ${MODERATE} moderate"
[[ "$LOW" -gt 0 ]] && SUMMARY+="\\n🟡 ${LOW} low"

if [ "$TOTAL" -eq 0 ]; then
  echo "✅ No vulnerabilities found. Exiting."
  exit 0
fi

# Generate Slack payload
PAYLOAD=$(
  cat <<EOF
{
  "channel": "${SLACK_CHANNEL}",
	"blocks": [
		{
			"type": "header",
			"text": {
				"type": "plain_text",
				"text": "🔍 NPM Audit Security Report",
				"emoji": true
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "*Repository:* <${REPO_URL}|${REPO_NAME}>\\n*Branch:* ${BRANCH}\\n*<${RUN_LINK}|Run link>*"
			}
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "${SUMMARY}"
			}
		},
		{
			"type": "divider"
		},
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "*Vulnerabilities:*\\n\n${DETAILS_ESCAPED}\n"
			}
		},
		{
			"type": "context",
			"elements": [
				{
					"type": "mrkdwn",
					"text": "Run \`npm audit fix\` to address these issues. For more details, see <https://github.com/${REPO_NAME}/security/dependabot|Dependabot alerts> or the <${RUN_LINK}|run that produced this alert.>"
				}
			]
		}
	]
}
EOF
)

# Send to Slack using chat.postMessage
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer ${SLACK_BOT_TOKEN}" \
  -H 'Content-type: application/json' \
  --data "${PAYLOAD}"
