#!/usr/bin/env bash
#
# Promotes /content/adkstvite/{fr,fr/fr,es,es/es} from nt:folder to cq:Page
# with jcr:language set, so Core XF v2 LanguageManager can auto-localize
# Experience Fragments based on the current page's language root.
#
# Idempotent: POSTing jcr:primaryType=cq:Page on an existing cq:Page is a no-op.
#
# Usage:
#   AEM_HOST=http://localhost:4502 AEM_CREDS=admin:admin ./scripts/setup-language-roots.sh
#
set -euo pipefail

AEM_HOST="${AEM_HOST:-http://localhost:4502}"
AEM_CREDS="${AEM_CREDS:-admin:admin}"

# Order matters: create parent country page before language page under it.
ROWS=(
  "fr:fr_FR:fr"
  "fr/fr:fr_FR:fr"
  "es:es_ES:es"
  "es/es:es_ES:es"
)

for row in "${ROWS[@]}"; do
  IFS=':' read -r path lang title <<< "$row"
  echo "--- /content/adkstvite/$path ($lang) ---"

  # 1) Ensure the node is a cq:Page (converts nt:folder -> cq:Page).
  curl -fsS -u "$AEM_CREDS" -X POST "$AEM_HOST/content/adkstvite/$path" \
    -F "jcr:primaryType=cq:Page" > /dev/null

  # 2) Create/update jcr:content with language + resource type.
  curl -fsS -u "$AEM_CREDS" -X POST "$AEM_HOST/content/adkstvite/$path/jcr:content" \
    -F "jcr:primaryType=cq:PageContent" \
    -F "sling:resourceType=adkstvite/components/page" \
    -F "jcr:title=$title" \
    -F "jcr:language=$lang" \
    -F "cq:template=/conf/adkstvite/settings/wcm/templates/page-content" > /dev/null

  echo "  ok"
done

echo "Done. Verify with:"
echo "  curl -u $AEM_CREDS $AEM_HOST/content/adkstvite/fr/fr/jcr:content.json"
