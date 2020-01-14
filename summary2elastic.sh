#!/bin/bash
INDEXNAME="ocr-summary-opendata"
ELASTICHOST="127.0.0.1:9200"

if [ ! -f "$1" ]; then
        echo "usage: summarize.sh resultsfile [-reset]"
	echo "  -reset will clear the index and create a mapping for it"
        exit 0
fi

if [ "$2" == "-reset" ]; then
	echo "Clearing index and re-creating it"
	curl -XDELETE "$ELASTICHOST/$INDEXNAME/?pretty=true"
	curl -X PUT "$ELASTICHOST/$INDEXNAME/?pretty=true"  -H 'Content-Type: application/json' --data-binary @mappings.json
fi

cat "$1" | awk '{print "{\"index\":{}}\n{\"paperid\":\"" $1 "\",\"date\":\""$2"-"$3"-01\",\"year\":\""$2"\",\"month\":\""$3"\",\"TCHAR\":\""$4"\",\"WCHAR\":\""$5"\",\"CCHAR\":\""$6"\",\"nonwordCHAR\":\""$4-$5"\",\"wrongwordCHAR\":\""$5-$6"\"}"}' > tempfile4elaastic.json
echo "" >> tempfile4elaastic.json
curl -X POST "$ELASTICHOST/$INDEXNAME/_bulk?pretty"  -H 'Content-Type: application/json' --data-binary @tempfile4elaastic.json -s | jq '.errors'
