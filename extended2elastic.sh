#!/bin/bash
INDEXNAME="ocr-extended-opendata"
ELASTICHOST="127.0.0.1:9200"

if [ ! -f "$1" ]; then
	echo "usage: extended2elastic.sh resultsfile [-reset]"
	echo "  -reset will clear the index and create a mapping for it"
	exit 0
fi

if [ "$2" == "-reset" ]; then
	echo "Clearing index and re-creating it"
	curl -XDELETE "$ELASTICHOST/$INDEXNAME/?pretty=true"
	curl -X PUT "$ELASTICHOST/$INDEXNAME/?pretty=true"  -H 'Content-Type: application/json' --data-binary @mappings-extended.json
fi

echo "Running langid.py on the same files"
cat "$1" | cut -d\  -f1 | langid.py -b | sort | tr "," " " | tr -d "\r" > temp_from_langid.txt
echo "Combining the two results files"
sort "$1" > temp_from_results.txt
paste temp_from_langid.txt temp_from_results.txt -d' ' | awk '{print $4" "$5" "$6" "$7" "$8" "$9" "$2" "$3" "$10" "$11" "$12" "$13" "$14" "$15" "$16" "$17" "$18" "$19" "$20" "$21" "$22" "$23" "$24}' > temp_joined.txt

cat temp_joined.txt | awk '{print "{\"index\":{}}\n{\"file_name\":\""$1"\",\"paperid\":\""$2"\",\"date\":\""$3"\",\"article_type\":\""$4"\",\"pid\":\""$5"\",\"article_id\":\""$6"\",\"ark\":\""$7"\",\"chars_total\":\""$8"\",\"lang_langid_code\":\""$9"\",\"lang_langid_sure\":\""$10"\",\"is_langdetected\":\""$11"\",\"is_langreliable\":\""$12"\",\"lang_code\":\""$13"\",\"lang_percent\":\""$14"\",\"is_spellerpresent\":\""$15"\",\"chars_inwords\":\""$16"\",\"chars_correct\":\""$17"\",\"chars_indigits\":\""$18"\",\"chars_incorrect\":\""$19"\",\"chars_punctuation\":\""$20"\",\"words_total\":\""$21"\",\"words_correct\":\""$22"\"}"}' > tempfile4elaastic.json
echo "" >> tempfile4elaastic.json
rm -f temp4e*
echo "Splitting files"
split -10000 tempfile4elaastic.json temp4e
for f in temp4e*; do
	echo "processing $f : errors?"
	curl -X POST "$ELASTICHOST/$INDEXNAME/_bulk?pretty"  -H 'Content-Type: application/json' --data-binary @$f -s | jq '.errors' 
done

