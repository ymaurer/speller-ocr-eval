# speller-ocr-eval
Evaluate OCR correctness by identifying the language and then running a spell checker
# Usage
- npm init
- put the list of files to analyse into files.txt
- run `node index.js`
## Source Data
Download https://data.bnl.lu/open-data/digitization/newspapers/export01-newspapers1841-1878.zip from the eluxemburgensia open data set as source data.
## Identifying the language
Using https://github.com/CLD2Owners/cld2/
## Spelling
Using hunspell with dictionaries from Libreoffice and spellchecker.lu
