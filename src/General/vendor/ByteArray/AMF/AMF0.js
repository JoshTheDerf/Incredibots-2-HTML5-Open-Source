const amf0 = {
	toString: function (buffer) {
		return buffer.toString("utf8", 0, Buffer.byteLength(buffer))
	},
	isStrict: function (value) {
		let l = value.length, c = 0
		for (let key in value) c++
		return (c == l)
	},
	hasItem: function (array, item) {
		let i = array.length
		while (i--) {
			if (this.isSame(array[i], item)) {
				return i
			}
		}
		return -1
	},
	isSame: function (item1, item2) {
		if (typeof item1 === "object" && typeof item2 === "object") {
			if (Object(item1).constructor === Object(item2).constructor) {
				for (let i in item1) {
					if (typeof item1[i] === "object") {
						if (!this.isSame(item1[i], item2[i])) {
							return false
						}
					} else if (item1[i] !== item2[i]) {
						return false
					}
				}
				return true
			} else {
				return false
			}
		}
		return (item1 === item2)
	}
}

amf0.Writer = function () {
	this.writeObjectCache = []
}

/* References. */
amf0.Writer.prototype.setObjectReference = function (o) {
	let refNum
	if (this.writeObjectCache !== null && (refNum = amf0.hasItem(this.writeObjectCache, o)) !== -1) {
		let buffer = Buffer.alloc(3)
		buffer.writeUInt8(7, 0)
		buffer.writeUInt16BE(refNum, 1)
		return false
	} else {
		if (this.writeObjectCache === null) {
			this.writeObjectCache = []
		}
		this.writeObjectCache.push(o)
		return true
	}
}
/* Writers. */
/* 2.1 Types. */
amf0.Writer.prototype.writeValue = function (value) {
	let className = value.constructor.name.toLowerCase()
	if (className === "stdclass") {
		return this.writeObject(value)
	}
	if (typeof value == "object" && className != "Object") {
		return this.writeTypedObject(value)
	}
	if (value instanceof Date) {
		return this.writeDate(value)
	}
	if (typeof value === "string" && value.startsWith("<") && value.endsWith(">")) {
		return this.writeXMLDoc(value)
	}
	if (Array.isArray(value)) {
		if (amf0.isStrict(value)) {
			return this.writeStrictArray(value)
		} else {
			return this.writeECMAArray(value)
		}
	}
	if (value == null) {
		return this.writeNull()
	}
	if (value == undefined) {
		return this.writeUndefined()
	}
	switch (typeof value) {
		case "number":
			return this.writeNumber(value)
			break
		case "boolean":
			return this.writeBoolean(value)
			break
		case "string":
			if (value.length < 65535) {
				return this.writeString(value)
			} else {
				return this.writeLongString(value)
			}
			break
		case "object":
			return this.writeObject(value)
			break
		default:
			throw new Error(`amf0.Writer::writeValue - Error: Unknown type`)
	}
}
/* 2.2 Number Type. */
amf0.Writer.prototype.writeNumber = function (value) {
	let buffer = Buffer.alloc(9)
	buffer.writeUInt8(0x00, 0)
	buffer.writeDoubleBE(value, 1)
	return buffer
}
/* 2.3 Boolean Type. */
amf0.Writer.prototype.writeBoolean = function (value) {
	let buffer = Buffer.alloc(2)
	buffer.writeUInt8(0x01, 0)
	buffer.writeUInt8((value ? 1 : 0), 1)
	return buffer
}
/* 2.4 String Type. */
amf0.Writer.prototype.writeString = function (value) {
	if (value.length < 65535) {
		let buffer = Buffer.alloc(1)
		buffer.writeUInt8(0x02)
		let buffer2 = Buffer.alloc(2)
		buffer2.writeUInt16BE(Buffer.byteLength(value), 0)
		return Buffer.concat([buffer, buffer2, Buffer.from(value, "utf8")])
	} else {
		return this.writeLongString(value)
	}
}
amf0.Writer.prototype.writeStringWithoutType = function (value) {
	if (value.length < 65535) {
		let buffer = Buffer.alloc(2)
		buffer.writeUInt16BE(Buffer.byteLength(value), 0)
		return Buffer.concat([buffer, Buffer.from(value, "utf8")])
	} else {
		return this.writeLongStringWithoutType(value)
	}
}
/* 2.5 Object Type. */
amf0.Writer.prototype.writeObject = function (value) {
	if (this.setObjectReference(value)) {
		let buffer = Buffer.alloc(1)
		buffer.writeUInt8(0x03, 0)
		for (let key in value) {
			if (typeof value[key] !== "function") {
				buffer = Buffer.concat([buffer, this.writeStringWithoutType(key), this.writeValue(value[key])])
			}
		}
		let endObject = Buffer.alloc(3)
		endObject.writeUInt16BE(0x00, 0)
		endObject.writeUInt8(0x09, 2)
		return Buffer.concat([buffer, endObject])
	}
}
/* 2.7 Null Type. */
amf0.Writer.prototype.writeNull = function () {
	let buffer = Buffer.alloc(1)
	buffer.writeUInt8(0x05, 0)
	return buffer
}
/* 2.8 Undefined Type. */
amf0.Writer.prototype.writeUndefined = function () {
	let buffer = Buffer.alloc(1)
	buffer.writeUInt8(0x06, 0)
	return buffer
}
/* 2.9 Reference Type. */
amf0.Writer.prototype.writeReference = function (value) {
	let buffer = Buffer.alloc(3)
	buffer.writeUInt8(0x07, 0)
	buffer.writeUInt16BE(value, 1)
	return buffer
}
/* 2.10 ECMA Array Type. */
amf0.Writer.prototype.writeECMAArray = function (value) {
	if (this.setObjectReference(value)) {
		let l = value.length
		let buffer = Buffer.alloc(5)
		buffer.writeUInt8(0x08, 0)
		buffer.writeUInt32BE(l, 1)
		for (let key in value) {
			buffer = Buffer.concat([buffer, this.writeStringWithoutType(key), this.writeValue(value[key])])
		}
		let buffer2 = Buffer.alloc(3)
		buffer2.writeUInt8(0x00, 0)
		buffer2.writeUInt8(0x00, 1)
		buffer2.writeUInt8(0x09, 2)
		return Buffer.concat([buffer, buffer2])
	}
}
/* 2.12 Strict Array Type. */
amf0.Writer.prototype.writeStrictArray = function (value) {
	if (this.setObjectReference(value)) {
		let buffer = Buffer.alloc(5)
		buffer.writeUInt8(0x0a, 0)
		buffer.writeUInt32BE(value.length, 1)
		value.forEach(values => {
			buffer = Buffer.concat([buffer, this.writeValue(values)])
		})
		return buffer
	}
}
/* 2.13 Date Type. */
amf0.Writer.prototype.writeDate = function (value) {
	let buffer = Buffer.alloc(11)
	buffer.writeUInt8(0x0b, 0)
	buffer.writeInt16BE(0, 1)
	buffer.writeDoubleBE(value.getTime(), 3)
	return buffer
}
/* 2.14 Long String Type. */
amf0.Writer.prototype.writeLongString = function (value) {
	if (value.length > 65535) {
		let buffer = Buffer.alloc(1)
		buffer.writeUInt8(0x0C)
		let buffer2 = Buffer.alloc(4)
		buffer2.writeUInt32BE(Buffer.byteLength(value), 0)
		return Buffer.concat([buffer, buffer2, Buffer.from(value, "utf8")])
	} else {
		return this.writeString(value)
	}
}
amf0.Writer.prototype.writeLongStringWithoutType = function (value) {
	if (value.length > 65535) {
		let buffer = Buffer.alloc(4)
		buffer.writeUInt32BE(Buffer.byteLength(value), 0)
		return Buffer.concat([buffer, Buffer.from(value, "utf8")])
	} else {
		return this.writeStringWithoutType(value)
	}
}
/* 2.17 XML Document Type. */
amf0.Writer.prototype.writeXMLDoc = function (value) {
	if (this.setObjectReference(value)) {
		let buffer = Buffer.alloc(3)
		buffer.writeUInt8(0x0f, 0)
		buffer.writeUInt16BE(value.length, 1)
		return Buffer.concat([buffer, Buffer.from(value, "utf8")])
	}
}
/* 2.18 Typed Object Type. */
amf0.Writer.prototype.writeTypedObject = function (value) {
	if (this.setObjectReference(value)) {
		let buffer = Buffer.alloc(1)
		buffer.writeUInt8(0x10, 0)
		for (let key in value) {
			if (!key.startsWith("_")) {
				buffer = Buffer.concat([buffer, this.writeStringWithoutType(key.constructor.name), this.writeValue(value[key])])
			}
		}
		let endTypedObject = Buffer.alloc(3)
		endTypedObject.writeUInt16BE(0x00, 0)
		endTypedObject.writeUInt8(0x09, 2)
		return Buffer.concat([buffer, endTypedObject])
	}
}

amf0.Reader = function () {
	this.readObjectCache = []
}

/* Readers. */
/* 2.1 Types. */
amf0.Reader.prototype.readValue = function (buffer) {
	let value = buffer.readUInt8(0)
	switch (value) {
		case 0x00:
			return this.readNumber(buffer)
			break
		case 0x01:
			return this.readBoolean(buffer)
			break
		case 0x02:
			return this.readString(buffer)
			break
		case 0x03:
			return this.readObject(buffer)
			break
		case 0x05:
			return this.readNull()
			break
		case 0x06:
			return this.readUndefined()
			break
		case 0x07:
			return this.readReference(buffer)
			break
		case 0x08:
			return this.readECMAArray(buffer)
			break
		case 0x0a:
			return this.readStrictArray(buffer)
			break
		case 0x0b:
			return this.readDate(buffer)
			break
		case 0x0c:
			return this.readLongString(buffer)
			break
		case 0x0f:
			return this.readXMLDoc(buffer)
			break
		case 0x10:
			return this.readTypedObject(buffer)
			break
		default:
			throw new Error(`amf0.Reader::readData - Error: Undefined AMF0 type encountered: ${value}`)
	}
}
/* 2.2 Number Type. */
amf0.Reader.prototype.readNumber = function (buffer) {
	return { len: 9, value: buffer.readDoubleBE(1) }
}
/* 2.3 Boolean Type. */
amf0.Reader.prototype.readBoolean = function (buffer) {
	return { len: 2, value: (buffer.readUInt8(1) != 0) }
}
/* 2.4 String Type. */
amf0.Reader.prototype.readString = function (buffer) {
	let length = buffer.readUInt16BE(1)
	return { len: 3 + length, value: buffer.toString("utf8", 3, 3 + length) }
}
amf0.Reader.prototype.readStringWithoutType = function (buffer) {
	let length = buffer.readUInt16BE(0)
	return { len: 2 + length, value: buffer.toString("utf8", 2, 2 + length) }
}
/* 2.5 Object Type. */
amf0.Reader.prototype.readObject = function (buffer) {
	let rules = { 0x00: this.readNumber, 0x01: this.readBoolean, 0x02: this.readString, 0x03: this.readObject, 0x05: this.readNull, 0x06: this.readUndefined, 0x07: this.readReference, 0x08: this.readECMAArray, 0x0a: this.readStrictArray, 0x0b: this.readDate, 0x0c: this.readLongString, 0x0f: this.readXMLDoc, 0x10: this.readTypedObject }
	let object = {}
	let iBuf = buffer.slice(1)
	let length = 1
	while (iBuf.readUInt8(0) != 0x09) {
		let prop = this.readStringWithoutType(iBuf)
		length += prop.len
		if (iBuf.slice(prop.len).readUInt8(0) == 0x09) {
			length++
			break
		}
		if (prop.value == "") {
			break
		}
		let buffer2 = iBuf.slice(prop.len)
		if (!rules[buffer2.readUInt8(0)]) {
			throw new Error(`amf0.Reader::readObject - Error: Unknown field`)
		}
		let val = rules[buffer2.readUInt8(0)](buffer2)
		object[prop.value] = val.value
		length += val.len
		iBuf = iBuf.slice(prop.len + val.len)
	}
	this.readObjectCache.push({ len: length, value: object })
	return { len: length, value: object }
}
/* 2.7 Null Type. */
amf0.Reader.prototype.readNull = function () {
	return { len: 1, value: null }
}
/* 2.8 Undefined Type. */
amf0.Reader.prototype.readUndefined = function () {
	return { len: 1, value: undefined }
}
/* 2.9 Reference Type. */
amf0.Reader.prototype.readReference = function (buffer) {
	return { len: 3, value: "ref" + buffer.readUInt16BE(1) }
}
/* 2.10 ECMA Array Type. */
amf0.Reader.prototype.readECMAArray = function (buffer) {
	let obj = this.readObject(buffer.slice(4))
	this.readObjectCache.push({ len: 5 + obj.len, value: obj.value })
	return { len: 5 + obj.len, value: obj.value }
}
/* 2.12 Strict Array Type. */
amf0.Reader.prototype.readStrictArray = function (buffer) {
	let rules = { 0x00: this.readNumber, 0x01: this.readBoolean, 0x02: this.readString, 0x03: this.readObject, 0x05: this.readNull, 0x06: this.readUndefined, 0x07: this.readReference, 0x08: this.readECMAArray, 0x0a: this.readStrictArray, 0x0b: this.readDate, 0x0c: this.readLongString, 0x0f: this.readXMLDoc, 0x10: this.readTypedObject }
	let array = []
	let length = 5
	let ret
	for (let count = buffer.readUInt32BE(1); count; count--) {
		let buffer2 = buffer.slice(length)
		if (!rules[buffer2.readUInt8(0)]) {
			throw new Error(`amf0.Reader::readStrictArray - Error: Unknown field`)
		}
		ret = rules[buffer2.readUInt8(0)](buffer2)
		array.push(ret.value)
		length += ret.len
	}
	this.readObjectCache.push({ len: len, value: Object.defineProperty(array, "sarray", { value: true }) })
	return { len: len, value: Object.defineProperty(array, "sarray", { value: true }) }
}
/* 2.13 Date Type. */
amf0.Reader.prototype.readDate = function (buffer) {
	return { s16: buffer.readUInt16BE(1), len: 11, value: buffer.readDoubleBE(3) }
}
/* 2.14 Long String Type. */
amf0.Reader.prototype.readLongString = function (buffer) {
	let length = buffer.readUInt32BE(1)
	return { len: 5 + length, value: buffer.toString("utf8", 5, 5 + length) }
}
amf0.Reader.prototype.readLongStringWithoutType = function (buffer) {
	let length = buffer.readUInt32BE(0)
	return { len: 4 + length, value: buffer.toString("utf8", 4, 4 + length) }
}
/* 2.17 XML Document Type. */
amf0.Reader.prototype.readXMLDoc = function (buffer) {
	let length = buffer.readUInt16BE(1)
	return { len: 3 + length, value: buffer.toString("utf8", 3, 3 + length) }
}
/* 2.18 Typed Object Type. */
amf0.Reader.prototype.readTypedObject = function (buffer) {
	let className = this.readString(buffer)
	let object = this.readObject(buffer.slice(className.value.len - 1))
	object.value.__className__ = className.value
	this.readObjectCache.push({ len: className.len + object.len - 1, value: object.value })
	return { len: className.len + object.len - 1, value: object.value }
}

export default amf0
