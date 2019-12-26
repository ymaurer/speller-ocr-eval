#/bin/bash
if [ ! -f "$1" ]; then
	echo "usage: summarize.sh resultsfile"
	exit 0
fi
cut -d\  -f2,3,4,10,16,17 "$1" | sort | awk 'BEGIN{A=0;B=0;C=0;V1=0;V2=0;V3=0}{if(V1==$1&&V2==$2&&V3==$3){A=A+$4;B=B+$5;C=C+$6}else{print V1" "V2" "V3" "A" "B" "C;A=$4;B=$5;C=$6;V1=$1;V2=$2;V3=$3}}END{print V1" "V2" "V3" "A " " B " "C}'
