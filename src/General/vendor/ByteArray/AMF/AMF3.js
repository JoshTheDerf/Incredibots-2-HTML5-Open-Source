/*
AMF JavaScript library by Emil Malinov https://github.com/emilkm/amfjs
Modified by Zaseth for ByteArray.js https://github.com/Zaseth/ByteArray.js
*/

const AMF3Types = {
  kUndefinedType: 0,
  kNullType: 1,
  kFalseType: 2,
  kTrueType: 3,
  kIntegerType: 4,
  kDoubleType: 5,
  kStringType: 6,
  kXMLType: 7,
  kDateType: 8,
  kArrayType: 9,
  kObjectType: 10,
  kAvmPlusXmlType: 11,
  kByteArrayType: 12,
};

amf3 = {
	classes: {},
	const: {
		CLASS_ALIAS: "_explicitType",
		EXTERNALIZED_FIELD: "_externalizedData",
	},

	registerClass: function (aliasName, classObject) {
		if (aliasName == null || classObject == 0) {
			throw new Error(`amf3::registerClassAlias - Error: Invalid arguments: ${aliasName} | ${classObject}`)
		}
		this.classes[aliasName] = classObject
	}
}

amf3.Writer = function () {
	this.data = []
	this.objects = []
	this.traits = {}
	this.strings = {}
	this.stringCount = 0
	this.traitCount = 0
	this.objectCount = 0
}
/* References. */
amf3.Writer.prototype.reset = function () {
	this.objects = []
	this.objectCount = 0
	this.traits = {}
	this.traitCount = 0
	this.strings = {}
	this.stringCount = 0
}
amf3.Writer.prototype.objectByReference = function (v) {
	let ref = 0, found = false
	for (; ref < this.objects.length; ref++) {
		if (this.objects[ref] === v) {
			found = true
			break
		}
	}
	if (found) {
		this.writeUInt29(ref << 1)
	} else {
		this.objects.push(v)
		this.objectCount++
	}
	return found ? ref : null
}
amf3.Writer.prototype.traitsByReference = function (v, alias) {
	let s = alias + "|"
	for (let i = 0; i < v.length; i++) {
		s += v[i] + "|"
	}
	let ref = this.traits[s]
	if (ref) {
		this.writeUInt29((ref << 2) | 1)
	} else {
		this.traits[s] = this.traitCount++
	}
	return ref
}
amf3.Writer.prototype.stringByReference = function (v) {
	let ref = this.strings[v]
	if (ref) {
		this.writeUInt29(ref << 1)
	} else {
		this.strings[v] = this.stringCount++
	}
	return ref
}
/* Writers. */
amf3.Writer.prototype.write = function (v) {
	this.data.push(v)
}
amf3.Writer.prototype.writeUInt32 = function (v) {
	v < 0 && (v = -(v ^ 4294967295) - 1)
	v &= 4294967295
	this.write((v >>> 24) & 255)
	this.write((v >>> 16) & 255)
	this.write((v >>> 8) & 255)
	this.write((v & 255))
}
amf3.Writer.prototype.writeInt32 = function (v) {
	this.write((v >>> 24) & 255)
	this.write((v >>> 16) & 255)
	this.write((v >>> 8) & 255)
	this.write((v >>> 0) & 255)
}
amf3.Writer.prototype.writeUInt29 = function (v) {
	if (v < 128) {
		this.write(v)
	} else if (v < 16384) {
		this.write(((v >> 7) & 127) | 128)
		this.write(v & 127)
	} else if (v < 2097152) {
		this.write(((v >> 14) & 127) | 128)
		this.write(((v >> 7) & 127) | 128)
		this.write(v & 127)
	} else if (v < 0x40000000) {
		this.write(((v >> 22) & 127) | 128)
		this.write(((v >> 15) & 127) | 128)
		this.write(((v >> 8) & 127) | 128)
		this.write(v & 255)
	} else {
		throw new RangeError(`amf3.Writer::writeUInt29 - Error: ${v} is out of range`)
	}
}
amf3.Writer.prototype.writeUTF = function (v, asAmf) {
	let bytearr = [], strlen = v.length, utflen = 0
	for (let i = 0; i < strlen; i++) {
		let c1 = v.charCodeAt(i)
		if (c1 < 128) {
			utflen++
			bytearr.push(c1)
		} else if (c1 > 127 && c1 < 2048) {
			utflen += 2
			bytearr.push(192 | (c1 >> 6))
			if (asAmf) {
				bytearr.push(128 | ((c1 >> 0) & 63))
			} else {
				bytearr.push(128 | (c1 & 63))
			}
		} else if ((c1 & 0xF800) !== 0xD800) {
			utflen += 3
			bytearr.push(224 | (c1 >> 12))
			bytearr.push(128 | ((c1 >> 6) & 63))
			if (asAmf) {
				bytearr.push(128 | ((c1 >> 0) & 63))
			} else {
				bytearr.push(128 | (c1 & 63))
			}
		} else {
			utflen += 4
			if ((c1 & 0xFC00) !== 0xD800) {
				throw new RangeError(`amf3.Writer::writeUTF - Error: Unmatched trail surrogate at: ${i}`)
			}
			let c2 = v.charCodeAt(i++)
			if ((c2 & 0xFC00) !== 0xDC00) {
				throw new RangeError(`amf3.Writer::writeUTF - Error: Unmatched lead surrogate at: ${i - 1}`)
			}
			c1 = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000
			bytearr.push(240 | (c1 >> 18))
			bytearr.push(128 | ((c1 >> 12) & 63))
			bytearr.push((c1 >> 6) & 63)
			if (asAmf) {
				bytearr.push(128 | ((c1 >> 0) & 63))
			} else {
				bytearr.push(128 | (c1 & 63))
			}
		}
	}
	if (asAmf) {
		this.writeUInt29((utflen << 1) | 1)
	} else {
		bytearr.unshift(utflen & 255)
		bytearr.unshift((utflen >>> 8) & 255)
	}
	for (let i = 0; i < bytearr.length; i++) {
		this.write(bytearr[i])
	}
	return asAmf ? utflen : utflen + 2
}
amf3.Writer.prototype.calculateDouble = function (v) {
	let r = [0, 0], e
	if (v != v) {
		return r[0] = -524288, r
	}
	let d = v < 0 || v === 0 && 1 / v < 0 ? -2147483648 : 0
	v = Math.abs(v)
	if (v === Number.POSITIVE_INFINITY) {
		return r[0] = d | 2146435072, r
	}
	for (e = 0; v >= 2 && e <= 1023;) {
		e++ , v /= 2
	}
	for (; v < 1 && e >= -1022;) {
		e-- , v *= 2
	}
	e += 1023
	if (e == 2047) {
		return r[0] = d | 2146435072, r
	}
	let i
	e == 0
		? (i = v * Math.pow(2, 23) / 2, v = Math.round(v * Math.pow(2, 52) / 2))
		: (i = v * Math.pow(2, 20) - Math.pow(2, 20), v = Math.round(v * Math.pow(2, 52) - Math.pow(2, 52)))
	r[0] = d | e << 20 & 2147418112 | i & 1048575
	r[1] = v
	return r
}
/* 3.1 Types. */
/* 3.2 Undefined Type. */
amf3.Writer.prototype.writeUndefined = function () {
	this.write(0x00)
}
/* 3.3 Null Type. */
amf3.Writer.prototype.writeNull = function () {
	this.write(0x01)
}
/* 3.4 | 3.5 Boolean Type. */
amf3.Writer.prototype.writeBoolean = function (v) {
	if (typeof v !== "boolean") {
		throw new TypeError(`amf3.Writer::writeBoolean - Error: ${v} is not a boolean`)
	}
	if (v) {
		this.write(0x03)
	} else {
		this.write(0x02)
	}
}
/* 3.6 Integer Type. */
amf3.Writer.prototype.writeInt = function (v) {
	if (v >= -268435456 && v <= 268435455 && (v % 1 == 0)) {
		v &= 0x1FFFFFFF // 2^29 - 1
		this.write(0x04)
		this.writeUInt29(v) // How many times can our integer fit?
	} else {
		this.write(0x05)
		this.writeDouble(v, true)
	}
}
/* 3.7 Double Type. */
amf3.Writer.prototype.writeDouble = function (v, wasLarger) {
	if (wasLarger === undefined) {
		wasLarger = false // The value didn't come from writeInt
	}
	if (wasLarger) {
		console.log(`amf3.Writer::writeDouble - Info: ${v} originated from 'writeInt'`)
	}
	v = this.calculateDouble(v)
	this.writeUInt32(v[0])
	this.writeUInt32(v[1])
}
/* 3.8 String Type. */
amf3.Writer.prototype.writeString = function (v) {
	if (v.length == 0) {
		this.writeUInt29(1)
	} else {
		if (!this.stringByReference(v)) {
			this.writeUTF(v, true)
		}
	}
}
/* 3.10 Date Type. */
amf3.Writer.prototype.writeDate = function (v) {
	this.write(0x08)
	if (!(v instanceof Date)) {
		v = new Date(v)
	}
	if (!this.objectByReference(v)) {
		this.writeUInt29(1)
		this.writeDouble(v.getTime())
	}
}
/* 3.11 Array Type. */
amf3.Writer.prototype.writeArray = function (v) {
	this.write(0x09)
	if (!this.objectByReference(v)) {
		this.writeUInt29((v.length << 1) | 1)
		this.writeUInt29(1)
		if (v.length > 0) {
			for (let i = 0; i < v.length; i++) {
				this.writeObject(v[i])
			}
		}
	}
}
/* 3.12 Object Type. */
amf3.Writer.prototype.writeObject = function (v) {
	if (v == null) {
		return this.writeNull()
	}
	if (v == undefined) {
		return this.writeUndefined()
	}
	if (v.constructor === String) {
		this.write(0x06)
		this.writeString(v)
	} else if (v.constructor === Number) {
		if (v === +v && v === (v | 0)) {
			this.writeInt(v)
		} else {
			this.write(0x05)
			this.writeDouble(v)
		}
	} else if (v.constructor === Boolean) {
		this.writeBoolean(v)
	} else if (v.constructor === Date) {
		this.writeDate(v)
	} else if (Object.keys(v).indexOf("weakKeys") > -1) {
		this.writeDictionary(v)
	} else {
		if (v.constructor === Array) {
			if (v.toString().indexOf("[Vector") == 0) {
				this.writeVector(v)
			} else {
				this.writeArray(v)
			}
		} else if (amf3.const.CLASS_ALIAS in v) {
			this.writeCustomObject(v)
		} else {
			this.writeMap(v)
		}
	}
}
amf3.Writer.prototype.writeCustomObject = function (v) {
	this.write(0x0A)
	if (!this.objectByReference(v)) {
		let traits = this.writeTraits(v)
		for (let i = 0; i < traits.length; i++) {
			let prop = traits[i]
			this.writeObject(v[prop])
		}
	}
}
amf3.Writer.prototype.writeTraits = function (v) {
	let traits = [], count = 0, externalizable = false, dynamic = false
	for (let t in v) {
		if (t != amf3.const.CLASS_ALIAS) {
			traits.push(t)
			count++
		}
	}
	if (!this.traitsByReference(traits, v[amf3.const.CLASS_ALIAS])) {
		this.writeUInt29(3 | (externalizable ? 4 : 0) | (dynamic ? 8 : 0) | (count << 4))
		this.writeString(v[amf3.const.CLASS_ALIAS])
		if (count > 0) {
			for (let prop in traits) {
				this.writeString(traits[prop])
			}
		}
	}
	return traits
}
/* 3.14 ByteArray Type. */
amf3.Writer.prototype.writeByteArray = function (v) {
	this.write(0x0C)
	if (!this.objectByReference(v)) {
		this.writeUInt29((v.length << 1) | 1)
		for (let i = 0; i < v.length; i++) {
			this.write(v[i])
		}
	}
}
/* 3.15 Vector Type. */
amf3.Writer.prototype.writeVector = function (v) {
	this.write(v.type)
	let i, len = v.length
	if (!this.objectByReference(v)) {
		this.writeUInt29((len << 1) | 1)
		this.writeBoolean(v.fixed)
	}
	if (v.type == 16) {
		let className = ""
		if (len > 0) {
			className = v[0].constructor.name
		}
		this.writeString(className)
		for (i = 0; i < len; i++) {
			this.writeObject(v[i])
		}
	} else if (v.type == 13) {
		for (i = 0; i < len; i++) {
			this.writeInt32(v[i])
		}
	} else if (v.type == 14) {
		for (i = 0; i < len; i++) {
			this.writeUInt32(v[i])
		}
	} else if (v.type == 15) {
		for (i = 0; i < len; i++) {
			this.writeDouble(v[i])
		}
	}
}
/* 3.16 Dictionary Type. */
amf3.Writer.prototype.writeDictionary = function (v) {
	this.write(0x11)
	if (!this.objectByReference(v)) {
		this.writeUInt29((v.length << 1) | 1)
		this.writeBoolean(v.weakKeys)
		for (let i = 0; i < v.length; i++) {
			this.writeObject(v[i].value.Key)
			this.writeObject(v[i].value.Value)
		}
	}
}
/* 3.17 Map Type. */
amf3.Writer.prototype.writeMap = function (v) {
	this.write(0x0A)
	if (!this.objectByReference(v)) {
		this.writeUInt29(11)
		this.traitCount++
		this.writeString("")
		for (let key in v) {
			// FIX: Ignore private properties.
			if (key.startsWith('m_')) continue;
			if (key) {
				this.writeString(key)
			} else {
				this.writeString("")
			}
			this.writeObject(v[key])
		}
		this.writeString("")
	}
}

amf3.Reader = function (data, parent) {
	this.objects = []
	this.traits = []
	this.strings = []
	this.data = data
	this.parent = parent
	this.offset = parent.offset
	Object.defineProperty(this, 'pos', {
		get() { return this.parent.offset },
		set(value) { this.parent.offset = value }
	})
}


/* References. */
amf3.Reader.prototype.reset = function () {
	this.objects = []
	this.traits = []
	this.strings = []
}
amf3.Reader.prototype.rememberObject = function (v) {
	this.objects.push(v)
}
amf3.Reader.prototype.rememberTraits = function (v) {
	this.traits.push(v)
}
amf3.Reader.prototype.rememberString = function (v) {
	this.strings.push(v)
}
amf3.Reader.prototype.getObject = function (v) {
	return this.objects[v]
}
amf3.Reader.prototype.getTraits = function (v) {
	return this.traits[v]
}
amf3.Reader.prototype.getString = function (v) {
	return this.strings[v]
}
/* Readers. */
amf3.Reader.prototype.read = function () {
	return this.data[this.pos++]
}
amf3.Reader.prototype.readUnsignedShort = function () {
	let c1 = this.read(), c2 = this.read()
	return ((c1 << 8) + (c2 << 0))
}
amf3.Reader.prototype.readUInt32 = function () {
	let c1 = this.read(), c2 = this.read(), c3 = this.read(), c4 = this.read()
	return (c1 * 0x1000000) + ((c2 << 16) | (c3 << 8) | c4)
}
amf3.Reader.prototype.readInt32 = function () {
	let c1 = this.read(), c2 = this.read(), c3 = this.read(), c4 = this.read()
	return ((c1 << 24) + (c2 << 16) + (c3 << 8) + (c4 << 0))
}
amf3.Reader.prototype.readUInt29 = function () {
	let b = this.read() & 255
	if (b < 128) {
		return b
	}
	let value = (b & 127) << 7
	b = this.read() & 255
	if (b < 128) {
		return (value | b)
	}
	value = (value | (b & 127)) << 7
	b = this.read() & 255
	if (b < 128) {
		return (value | b)
	}
	value = (value | (b & 127)) << 8
	b = this.read() & 255
	return (value | b)
}
amf3.Reader.prototype.readUTF = function (length) {
	let utflen = length ? length : this.readUnsignedShort()
	let len = this.pos + utflen
	let chararr = []
	let c1 = 0
	let seqlen = 0
	while (this.pos < len) {
		c1 = this.read() & 0xFF
		seqlen = 0
		if (c1 <= 0xBF) {
			c1 = c1 & 0x7F
			seqlen = 1
		} else if (c1 <= 0xDF) {
			c1 = c1 & 0x1F
			seqlen = 2
		} else if (c1 <= 0xEF) {
			c1 = c1 & 0x0F
			seqlen = 3
		} else {
			c1 = c1 & 0x07
			seqlen = 4
		}
		for (let i = 1; i < seqlen; i++) {
			c1 = c1 << 0x06 | this.read() & 0x3F
		}
		if (seqlen === 4) {
			c1 -= 0x10000
			chararr.push(String.fromCharCode(0xD800 | c1 >> 10 & 0x3FF))
			chararr.push(String.fromCharCode(0xDC00 | c1 & 0x3FF))
		} else {
			chararr.push(String.fromCharCode(c1))
		}
	}
	return chararr.join("")
}
/* 3.1 Types. */
/* 3.2 Undefined Type. */
amf3.Reader.prototype.readUndefined = function () {
	return undefined
}
/* 3.3 Null Type. */
amf3.Reader.prototype.readNull = function () {
	return null
}
/* 3.4 | 3.5 Boolean Type. */
amf3.Reader.prototype.readBoolean = function (bool) {
	if (this.read() == 0x03) {
		return true
	} else {
		return false
	}
}
/* 3.6 Integer Type. */
amf3.Reader.prototype.readInt = function () {
	let value = this.readUInt29()
	return (value << 3) >> 3
}
/* 3.7 Double Type. */
amf3.Reader.prototype.readDouble = function () {
	let c1 = this.read() & 255, c2 = this.read() & 255
	if (c1 === 255) {
		if (c2 === 248) {
			return Number.NaN
		}
		if (c2 === 240) {
			return Number.NEGATIVE_INFINITY
		}
	} else if (c1 === 127 && c2 === 240) {
		return Number.POSITIVE_INFINITY
	}
	let c3 = this.read() & 255, c4 = this.read() & 255, c5 = this.read() & 255,
		c6 = this.read() & 255, c7 = this.read() & 255, c8 = this.read() & 255
	if (!c1 && !c2 && !c3 && !c4) {
		return 0
	}
	let d = (c1 << 4 & 2047 | c2 >> 4) - 1023
	let e = ((c2 & 15) << 16 | c3 << 8 | c4).toString(2)
	for (let i = e.length; i < 20; i++) {
		e = "0" + e
	}
	let f = ((c5 & 127) << 24 | c6 << 16 | c7 << 8 | c8).toString(2)
	for (let j = f.length; j < 31; j++) {
		f = "0" + f
	}
	let g = parseInt(e + (c5 >> 7 ? "1" : "0") + f, 2)
	if (g == 0 && d == -1023) {
		return 0
	}
	return (1 - (c1 >> 7 << 1)) * (1 + Math.pow(2, -52) * g) * Math.pow(2, d)
}
/* 3.8 String Type. */
amf3.Reader.prototype.readString = function () {
	let ref = this.readUInt29()
	if ((ref & 1) == 0) {
		return this.getString(ref >> 1)
	} else {
		let len = (ref >> 1)
		if (len == 0) {
			return ""
		}
		let str = this.readUTF(len)
		this.rememberString(str)
		return str
	}
}
/* 3.10 Date Type. */
amf3.Reader.prototype.readDate = function () {
	let ref = this.readUInt29()
	if ((ref & 1) == 0) {
		return this.getObject(ref >> 1)
	}
	let time = this.readDouble()
	let date = new Date(time)
	this.rememberObject(date)
	return date
}

/* 3.11 Array Type. */
amf3.Reader.prototype.readArray = function () {
	let ref = this.readUInt29()
	if ((ref & 1) == 0) {
		return this.getObject(ref >> 1)
	}
	let len = (ref >> 1)
	let map = null, i = 0
	while (true) {
		let name = this.readString()
		if (!name) {
			break
		}
		if (!map) {
			map = {}
			this.rememberObject(map)
		}
		map[name] = this.readObject()
	}
	if (!map) {
		let array = new Array(len)
		this.rememberObject(array)
		for (i = 0; i < len; i++) {
			array[i] = this.readObject()
		}
		return array
	} else {
		for (i = 0; i < len; i++) {
			map[i] = this.readObject()
		}
		return map
	}
}
/* 3.12 Object Type. */
amf3.Reader.prototype.readObject = function () {
	let value = undefined
	let type = this.read()
	switch (type) {
		case AMF3Types.kUndefinedType:
			value = this.readUndefined()
			break
		case AMF3Types.kNullType:
			value = this.readNull()
			break
		case AMF3Types.kFalseType:
			value = false
			break
		case AMF3Types.kTrueType:
			value = true
			break
		case AMF3Types.kIntegerType:
			value = this.readInt();
			break
		case AMF3Types.kDoubleType:
			value = this.readDouble()
			break
		case AMF3Types.kStringType:
			value = this.readString()
			break
		case AMF3Types.kXMLType:
			value = this.readXML()
			break
		case AMF3Types.kDateType:
			value = this.readDate()
			break
		case AMF3Types.kArrayType:
			value = this.readArray()
			break
		case AMF3Types.kObjectType:
			try {
				value = this.readScriptObject()
			} catch (e) {
				throw new Error(`amf3.Reader::readObject - Error: Failed to deserialize: ${e}`)
			}
			break
		case AMF3Types.kByteArrayType:
			value = this.readByteArray()
			break
		case 13:
		case 14:
		case 15:
		case 16:
			value = this.readVector()
			break
		case 17:
			value = this.readDictionary()
			break
		default:
			throw new Error(`amf3.Reader::readObject - Error: Unsupported AMF type: ${type}`)
	}
	return value
}

amf3.Reader.prototype.readScriptObject = function () {
	let ref = this.readUInt29()
	if ((ref & 1) == 0) {
		return this.getObject(ref >> 1)
	} else {
		let traits = this.readTraits(ref)
		let obj
		if (amf3.const.CLASS_ALIAS in traits) {
			if (amf3.classes[traits[amf3.const.CLASS_ALIAS]]) {
				obj = new amf3.classes[traits[amf3.const.CLASS_ALIAS]]
			} else {
				obj = {}
				obj[amf3.const.CLASS_ALIAS] = traits[amf3.const.CLASS_ALIAS]
			}
		} else {
			obj = {}
		}
		this.rememberObject(obj)
		if (traits.externalizable) {
			if (obj[amf3.const.CLASS_ALIAS] == "flex.messaging.io.ArrayCollection" || obj[amf3.const.CLASS_ALIAS] == "flex.messaging.io.ObjectProxy") {
				return this.readObject()
			} else {
				obj[amf3.const.EXTERNALIZED_FIELD] = this.readObject()
			}
		} else {
			for (let i in traits.props) {
				obj[traits.props[i]] = this.readObject()
			}
			if (traits.dynamic) {
				for (; ;) {
					let name = this.readString()
					if (name == null || name.length == 0) {
						break
					}
					obj[name] = this.readObject()
				}
			}
		}
		return obj
	}
}
amf3.Reader.prototype.readTraits = function (ref) {
	if ((ref & 3) == 1) {
		return this.getTraits(ref >> 2)
	} else {
		let ti = {
			externalizable: ((ref & 4) == 4),
			dynamic: ((ref & 8) == 8),
			count: (ref >> 4)
		}
		let className = this.readString()
		if (className != null && className != "") {
			ti[amf3.const.CLASS_ALIAS] = className
		}
		ti.props = []
		for (let i = 0; i < ti.count; i++) {
			ti.props.push(this.readString())
		}
		this.rememberTraits(ti)
		return ti
	}
}
/* 3.14 ByteArray Type. */
amf3.Reader.prototype.readByteArray = function () {
	let ref = this.readUInt29()
	if ((ref & 1) == 0) {
		return this.getObject(ref >> 1)
	} else {
		let len = (ref >> 1)
		let ba = []
		for (let i = 0; i < len; i++) {
			ba[i] = this.read()
		}
		this.rememberObject(ba)
		return ba
	}
}
/* 3.15 Vector Type. */
amf3.Reader.prototype.readVector = function (type) {
	let ref = this.readUInt29()
	if ((ref & 1) == 0) {
		return this.getObject(ref >> 1)
	}
	let len = (ref >> 1)
	let vector = this.toVector(type, [], this.readBoolean())
	let i
	if (type === 16) {
		this.readString()
		for (i = 0; i < len; i++) {
			vector.push(this.readObject())
		}
	} else if (type === 13) {
		for (i = 0; i < len; i++) {
			vector.push(this.readInt32())
		}
	} else if (type === 14) {
		for (i = 0; i < len; i++) {
			vector.push(this.readUInt32())
		}
	} else if (type === 15) {
		for (i = 0; i < len; i++) {
			vector.push(this.readDouble())
		}
	}
	this.rememberObject(vector)
	return vector
}
amf3.Reader.prototype.toVector = function (type, array, fixed) {
	array = array || []
	array.type = type || 16
	array.fixed = fixed || false
	array.toString = function () {
		let typestr = "object"
		switch (this.type) {
			case 13:
				typestr = "int"
				break
			case 14:
				typestr = "uint"
				break
			case 15:
				typestr = "double"
				break
			case 16:
				typestr = "object"
				break
		}
		return "[Vector (" + typestr + ")" + (this.fixed ? " fixed" : "") + "]"
	}
	return array
}
/* 3.16 Dictionary Type. */
amf3.Reader.prototype.readDictionary = function () {
	let ref = this.readUInt29()
	if ((ref & 1) == 0) {
		return this.getObject(ref >> 1)
	}
	let len = (ref >> 1)
	let dict = new Array(len)
	let hasWeakKeys = this.readBoolean()
	for (let i = 0; i < len; i++) {
		dict[i] = { key: this.readObject(), value: this.readObject() }
	}
	let val = { value: dict, weakKeys: hasWeakKeys }
	this.rememberObject(val)
	return val
}
/* 3.17 Map Type. */
amf3.Reader.prototype.readMap = function () {
	let ref = this.readUInt29()
	if ((ref & 1) == 0) {
		return this.getObject(ref >> 1)
	}
	let len = (ref >> 1)
	let map = null
	if (len > 0) {
		map = {}
		this.rememberObject(map)
		let name = this.readObject()
		while (name != null) {
			map[name] = this.readObject()
			name = this.readObject()
		}
	}
	return map
}

export default amf3
