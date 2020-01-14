#!/bin/bash
INDEXNAME="ocr-detailed-opendata"
ELASTICHOST="127.0.0.1:9200"

if [ ! -f "$1" ]; then
	echo "usage: result2elastic.sh resultsfile [-reset]"
	echo "  -reset will clear the index and create a mapping for it"
	exit 0
fi

if [ "$2" == "-reset" ]; then
	echo "Clearing index and re-creating it"
	curl -XDELETE "$ELASTICHOST/$INDEXNAME/?pretty=true"
	curl -X PUT "$ELASTICHOST/$INDEXNAME/?pretty=true"  -H 'Content-Type: application/json' --data-binary @mappings-detailed.json
fi

cat "$1" | awk '{print "{\"index\":{}}\n{\"file_name\":\""$1"\",\"paperid\":\""$2"\",\"date\":\""$3"\",\"article_type\":\""$4"\",\"pid\":\""$5"\",\"article_id\":\""$6"\",\"ark\":\""$7"\",\"chars_total\":\""$8"\",\"is_langdetected\":\""$9"\",\"is_langreliable\":\""$10"\",\"lang_code\":\""$11"\",\"lang_percent\":\""$12"\",\"is_spellerpresent\":\""$13"\",\"chars_inwords\":\""$14"\",\"chars_correct\":\""$15"\",\"chars_indigits\":\""$16"\",\"chars_incorrect\":\""$17"\",\"chars_punctuation\":\""$18"\",\"words_total\":\""$19"\",\"words_correct\":\""$20"\"}"}' > tempfile4elaastic.json
echo "" >> tempfile4elaastic.json
rm -f temp4e*
split -10000 tempfile4elaastic.json temp4e
for f in temp4e*; do
        echo "processing $f"
        curl -X POST "$ELASTICHOST/$INDEXNAME/_bulk?pretty"  -H 'Content-Type: application/json' --data-binary @$f -s | jq '.errors'
done
