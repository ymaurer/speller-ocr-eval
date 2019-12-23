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
var reToken = /([\-\/\.\'aAáàâÅäÄãæbBcCçdDeEéÉèÈêëËfFgGhHiIíîÎïjJkKlLmMnNńñoOóôöÖœŒpPqQrRsSśßtTuUùûüÜvVwWxXyYÿzZ]*)/g;

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

async function evaluateDublinCoreFile(fname, config)
{
	var file = await readFile(fname)
	var xmlDoc = libxml.parseXmlString(file)
	var desc = xmlDoc.get('//dc:description', { dc : 'http://purl.org/dc/elements/1.1/'}).text()
	var identifier = xmlDoc.get('//dc:identifier', { dc : 'http://purl.org/dc/elements/1.1/'}).text()
	var source = xmlDoc.get('//dc:source', { dc : 'http://purl.org/dc/elements/1.1/'}).text()
	var type = xmlDoc.get('//dc:type', { dc : 'http://purl.org/dc/elements/1.1/'}).text()
	var link = xmlDoc.get('//dcterms:hasVersion', { dcterms : 'http://purl.org/dc/terms/'}).text()
	var ark = identifier.match(reARK)[1];
	var [t, paperid, year, month, day] = source.match(reSource);
	var [t, pid, article] = link.match(reLink)

	var res = [fname, paperid, year, month, day, type, pid, article, ark, desc.length]
	var lang
	try {
		lang = await cld(desc)
	} catch (err) {
	}
	if (desc.length < 100 || !lang || !lang.languages[0] || lang.languages[0].percent < 25) {
		res.push('false')
	} else {
		res.push('true', lang.reliable, lang.languages[0].code, lang.languages[0].percent)
		if (config.hunspell[lang.languages[0].code]) {
			res.push('true')
			const speller = config.hunspell[lang.languages[0].code].speller
			var tok = simpleTokenizer(desc)
			// console.log('tokenized desc:', desc.length, tok.length, '"' + desc +'"')
			var correctWords = 0
			var totalWords = tok.length
			var wordChars = 0
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
			res.push(wordChars, correctChars, totalWords, correctWords)
		} else {
			res.push('false')
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
