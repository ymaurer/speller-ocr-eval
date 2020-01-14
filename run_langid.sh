#!/bin/bash

if [ ! -f "$1" ]; then
        echo "usage: run_langid.sh filelist"
        echo "  filelist is a file with 1 filename per line"
        exit 0
fi

cat "$1" | langid.py -b | sort | tr "," " " | tr -d "\r"
