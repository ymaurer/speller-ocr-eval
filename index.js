const Nodehun = require('nodehun')
const fs = require('fs')
const cldOrig = require('cld')
const util = require('util')
const libxml = require("libxmljs")

const readFile = util.promisify(fs.readFile)
const cld = util.promisify(cldOrig.detect)

// Regular expressions for parsing the dublin core values
var reARK = /ark:\/(.*)$/
var reSource = /.*\/([^\/]*)\/(\d\d\d\d)-(\d\d)-(\d\d)/
var reLink = /issue:(\d+).*article:(.*)$/;
// Regular expression for tokenization
var reToken = /([\-\/\'aAáàâÅäÄãæbBcCçdDeEéÉèÈêëËfFgGhHiIíîÎïjJkKlLmMnNńñoOóôöÖœŒpPqQrRsSśßtTuUùûüÜvVwWxXyYÿzZ]*)/g;
var reDigits = /[0-9]+/g;

// Good example in French
// data/export01-newspapers1841-1878/371/3060371/3060371-MODSMD_ARTICLE11-DTL45.xml

(async () => {
	let config = await loadConfig("config.json")
	config = await loadSpellers(config)
	files = await loadFileList('files.txt')
	for (i in files) {
		await evaluateDublinCoreFile(files[i], config)
	}
})().catch((e) => console.log(e));

async function loadConfig(fname)
{
	var c = await readFile(fname)
	c = JSON.parse(c)
	var cldLangs = {}
	for (i in c) {
		if (c[i].cld && c[i].cld.code) {
			for (o in c[i].cld.code) {
				cldLangs[c[i].cld.code[o]] = i
			}
		}
	}
	return { "config" : c, "cld2code" : cldLangs}
}

async function loadSpellers(configObject)
{
	var res = { "cld2code" : configObject.cld2code, "hunspell" : {} }
	for (i in configObject.config) {
		res.hunspell[i] = {}
		res.hunspell[i].aff = await readFile(configObject.config[i].hunspell.aff)
		res.hunspell[i].dic = await readFile(configObject.config[i].hunspell.dic)
		res.hunspell[i].speller = new Nodehun(res.hunspell[i].aff, res.hunspell[i].dic)
	}
	return res
}

async function loadFileList(fname)
{
	var list = await readFile(fname)
	var res = list.toString().split("\n")
	res.pop()
	return res
}

function safeGet(xml, xpath, opts)
{
	var node = xml.get(xpath, opts);
	if (node) {
		return node.text();
	} else {
		return "";
	}
}

async function evaluateDublinCoreFile(fname, config)
{
	var file = await readFile(fname)
	var xmlDoc = libxml.parseXmlString(file)
	var desc = safeGet(xmlDoc, '//dc:description', { dc : 'http://purl.org/dc/elements/1.1/'})
	var identifier = safeGet(xmlDoc, '//dc:identifier', { dc : 'http://purl.org/dc/elements/1.1/'})
	var source = safeGet(xmlDoc, '//dc:source', { dc : 'http://purl.org/dc/elements/1.1/'})
	var type = safeGet(xmlDoc, '//dc:type', { dc : 'http://purl.org/dc/elements/1.1/'})
	var link = safeGet(xmlDoc, '//dcterms:hasVersion', { dcterms : 'http://purl.org/dc/terms/'})
	var ark = identifier.length ? identifier.match(reARK)[1] : "-";
	var date = safeGet(xmlDoc, '//dc:date', { dc : 'http://purl.org/dc/elements/1.1/'})
	var mSource = source.match(reSource)
	var t, paperid
	if (mSource) {
		[t, paperid] = mSource
	}
	var mLink = link.match(reLink)
	var pid, article
	if (mLink) {
		[t, pid, article] = mLink
	}

	var res = [fname, paperid, date, type, pid, article, ark, desc.length]
	var lang
	try {
		lang = await cld(desc)
	} catch (err) {
	}
	if (desc.length < 100 || !lang || !lang.languages[0] || lang.languages[0].percent < 25) {
		res.push('false')
	} else {
		res.push('true', lang.reliable, lang.languages[0].code, lang.languages[0].percent)
		var tok = simpleTokenizer(desc)
		var totalWords = tok.length
		var wordChars = 0
		var digitChars = countDigits(desc);
		if (config.hunspell[lang.languages[0].code]) {
			res.push('true')
			const speller = config.hunspell[lang.languages[0].code].speller
			// console.log('tokenized desc:', desc.length, tok.length, '"' + desc +'"')
			var correctWords = 0
			var correctChars = 0
			for (i in tok) {
				wordChars += tok[i].length
				var isOK = await speller.spell(tok[i])
				// console.log(isOK, tok[i])
				if (isOK) {
					correctChars += tok[i].length
					correctWords++;
				}
			}
			res.push(wordChars, correctChars, digitChars, wordChars - correctChars, desc.length - wordChars - digitChars, totalWords, correctWords)
		} else {
			for (i in tok) {
				wordChars += tok[i].length
			}
			res.push('false', wordChars, 0, digitChars, wordChars, desc.length - wordChars - digitChars, totalWords, 0)
		}
	}
	console.log(res.join(' '))
}

function simpleTokenizer(text)
{
	var arr = [...text.matchAll(reToken)]
	var res = []
	for (i in arr) {
		if (arr[i] && arr[i][0]) {
			res.push(arr[i][0])
		}
	}
	return res
}

function countDigits(text)
{
        var arr = [...text.matchAll(reDigits)]
        var res = 0
        for (i in arr) {
                if (arr[i] && arr[i][0]) {
                        res += arr[i][0].length
                }
        }
        return res;
}

