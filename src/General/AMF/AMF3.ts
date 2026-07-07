/*
AMF JavaScript library by Emil Malinov https://github.com/emilkm/amfjs
Modified by Zaseth for ByteArray.js https://github.com/Zaseth/ByteArray.js
*/
// Mechanical TypeScript port of the hand-maintained AMF3.js codec.
// Behavior (and byte output) must remain identical to the original .js file.
// Writer/Reader are classes with the same prototype methods; the default
// export shape is unchanged: { classes, const, registerClass, Writer, Reader }.

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

const UINT29_MASK     = 2^29 - 1;
const INT28_MAX_VALUE = 0x0FFFFFFF; // 2^28 - 1
const INT28_MIN_VALUE = 0xF0000000; // -2^28 in 2^29 scheme

/* 3.17 Map Type. */
// Runtime-only Part fields that must never be persisted (Wave 3a). Flash
// serialized these junk public vars too (harmlessly — no reader consumes
// them), but Cannon.cannonballs holds LIVE b2Body objects after a sim run,
// which would drag the whole physics graph into the export. The rest are
// per-play trigger/highlight state.
const RUNTIME_ONLY_KEYS = new Set([
	'cannonballs', 'cannonballCounters', 'createCannonball',
	'checkedCollisionGroup',
	'triggerTouches', 'triggerTouches_2',
	'triggerMotorCW', 'triggerMotorCCW', 'triggerMotorExpand', 'triggerMotorContract',
	'triggerThruster', 'triggerInitted',
	'isDestroyed', 'isTriggered',
	'highlightForJV', 'highlightForJoint',
])

class Writer {
	data: number[]
	objects: any[]
	traits: { [key: string]: number }
	strings: { [key: string]: number }
	stringCount: number
	traitCount: number
	objectCount: number

	constructor() {
		this.data = []
		this.objects = []
		this.traits = {}
		this.strings = {}
		this.stringCount = 0
		this.traitCount = 0
		this.objectCount = 0
	}
	/* References. */
	reset(): void {
		this.objects = []
		this.objectCount = 0
		this.traits = {}
		this.traitCount = 0
		this.strings = {}
		this.stringCount = 0
	}
	objectByReference(v: any): boolean {
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
		// Return a boolean: index 0 is a valid reference and must stay truthy for
		// the `if (!writer.objectByReference(v))` caller pattern.
		return found
	}
	traitsByReference(v: any[], alias: string): boolean {
		let s = alias + "|"
		for (let i = 0; i < v.length; i++) {
			s += v[i] + "|"
		}
		let ref = this.traits[s]
		if (ref !== undefined) {
			this.writeUInt29((ref << 2) | 1)
		} else {
			this.traits[s] = this.traitCount++
		}
		return ref !== undefined
	}
	stringByReference(v: string): boolean {
		let ref = this.strings[v]
		if (ref !== undefined) {
			this.writeUInt29(ref << 1)
		} else {
			this.strings[v] = this.stringCount++
		}
		return ref !== undefined
	}
	/* Writers. */
	write(v: number): void {
		this.data.push(v)
	}
	writeUInt32(v: number): void {
		v < 0 && (v = -(v ^ 4294967295) - 1)
		v &= 4294967295
		this.write((v >>> 24) & 255)
		this.write((v >>> 16) & 255)
		this.write((v >>> 8) & 255)
		this.write((v & 255))
	}
	writeInt32(v: number): void {
		this.write((v >>> 24) & 255)
		this.write((v >>> 16) & 255)
		this.write((v >>> 8) & 255)
		this.write((v >>> 0) & 255)
	}
	writeUInt29(v: number): void {
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
	writeUTF(v: string, asAmf?: boolean): number {
		let bytearr: number[] = [], strlen = v.length, utflen = 0
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
				let c2 = v.charCodeAt(++i)
				if ((c2 & 0xFC00) !== 0xDC00) {
					throw new RangeError(`amf3.Writer::writeUTF - Error: Unmatched lead surrogate at: ${i - 1}`)
				}
				c1 = ((c1 & 0x3FF) << 10) + (c2 & 0x3FF) + 0x10000
				bytearr.push(240 | (c1 >> 18))
				bytearr.push(128 | ((c1 >> 12) & 63))
				bytearr.push(128 | ((c1 >> 6) & 63))
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
	calculateDouble(v: number): number[] {
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
	writeUndefined(): void {
		this.write(0x00)
	}
	/* 3.3 Null Type. */
	writeNull(): void {
		this.write(0x01)
	}
	/* 3.4 | 3.5 Boolean Type. */
	writeBoolean(v: boolean): void {
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
	writeInt(v: number): void {
		if (v >= INT28_MIN_VALUE && v <= INT28_MAX_VALUE) {
			// v &= 0x0FFFFFFF // 2^29 - 1
			this.write(0x04)
			this.writeUInt29(v & UINT29_MASK) // How many times can our integer fit?
		} else {
			this.write(0x05)
			this.writeDouble(v, true)
		}
	}
	/* 3.7 Double Type. */
	writeDouble(v: number, wasLarger?: boolean): void {
		if (wasLarger === undefined) {
			wasLarger = false // The value didn't come from writeInt
		}
		if (wasLarger) {
			console.log(`amf3.Writer::writeDouble - Info: ${v} originated from 'writeInt'`)
		}
		let r = this.calculateDouble(v)
		this.writeUInt32(r[0])
		this.writeUInt32(r[1])
	}
	/* 3.8 String Type. */
	writeString(v: string): void {
		if (v.length == 0) {
			this.writeUInt29(1)
		} else {
			if (!this.stringByReference(v)) {
				this.writeUTF(v, true)
			}
		}
	}
	/* 3.10 Date Type. */
	writeDate(v: any): void {
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
	writeArray(v: any[]): void {
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
	writeObject(v: any): any {
		if (v == null) {
			return this.writeNull()
		}
		if (v == undefined) {
			return this.writeUndefined()
		}
		if (v.constructor === String) {
			this.write(0x06)
			this.writeString(v as string)
		} else if (v.constructor === Number) {
			if (v === +v && v === ((v as number) | 0)) {
				this.writeInt(v as number)
			} else {
				this.write(0x05)
				this.writeDouble(v as number)
			}
		} else if (v.constructor === Boolean) {
			this.writeBoolean(v as boolean)
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
	writeCustomObject(v: any): void {
		this.write(0x0A)
		if (!this.objectByReference(v)) {
			let traits = this.writeTraits(v)
			for (let i = 0; i < traits.length; i++) {
				let prop = traits[i]
				this.writeObject(v[prop])
			}
		}
	}
	writeTraits(v: any): any {
		let traits: any = [], count = 0, externalizable = false, dynamic = false
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
	writeByteArray(v: any): void {
		this.write(0x0C)
		if (!this.objectByReference(v)) {
			this.writeUInt29((v.length << 1) | 1)
			for (let i = 0; i < v.length; i++) {
				this.write(v[i])
			}
		}
	}
	/* 3.15 Vector Type. */
	writeVector(v: any): void {
		this.write(v.type)
		let i, len = v.length
		if (!this.objectByReference(v)) {
			this.writeUInt29((len << 1) | 1)
			this.writeBoolean(v.fixed)
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
	}
	/* 3.16 Dictionary Type. */
	writeDictionary(v: any): void {
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
	// (RUNTIME_ONLY_KEYS is declared at module scope above.)
	writeMap(v: any): void {
		this.write(0x0A)
		if (!this.objectByReference(v)) {
			this.writeUInt29(11)
			this.traitCount++
			this.writeString("")
			for (let key in v) {
				// FIX: Ignore private properties.
				if (key.startsWith('m_')) continue;
				// FIX: Ignore runtime-only part state (see RUNTIME_ONLY_KEYS above).
				if (RUNTIME_ONLY_KEYS.has(key)) continue;
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
}

class Reader {
	objects: any[]
	traits: any[]
	strings: string[]
	data: any
	parent: any
	offset: number

	constructor(data: any, parent: any) {
		this.objects = []
		this.traits = []
		this.strings = []
		this.data = data
		this.parent = parent
		this.offset = parent.offset
	}

	// Ported from the original's Object.defineProperty(this, 'pos', ...):
	// `pos` proxies the parent's offset.
	get pos(): number { return this.parent.offset }
	set pos(value: number) { this.parent.offset = value }

	/* References. */
	reset(): void {
		this.objects = []
		this.traits = []
		this.strings = []
	}
	rememberObject(v: any): void {
		this.objects.push(v)
	}
	rememberTraits(v: any): void {
		this.traits.push(v)
	}
	rememberString(v: string): void {
		this.strings.push(v)
	}
	getObject(v: number): any {
		return this.objects[v]
	}
	getTraits(v: number): any {
		return this.traits[v]
	}
	getString(v: number): string {
		return this.strings[v]
	}
	/* Readers. */
	read(): number {
		return this.data[this.pos++]
	}
	readUnsignedShort(): number {
		let c1 = this.read(), c2 = this.read()
		return ((c1 << 8) + (c2 << 0))
	}
	readUInt32(): number {
		let c1 = this.read(), c2 = this.read(), c3 = this.read(), c4 = this.read()
		return (c1 * 0x1000000) + ((c2 << 16) | (c3 << 8) | c4)
	}
	readInt32(): number {
		let c1 = this.read(), c2 = this.read(), c3 = this.read(), c4 = this.read()
		return ((c1 << 24) + (c2 << 16) + (c3 << 8) + (c4 << 0))
	}
	readUInt29(): number {
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
	readUTF(length?: number): string {
		let utflen = length ? length : this.readUnsignedShort()
		let len = this.pos + utflen
		let chararr: string[] = []
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
	readUndefined(): undefined {
		return undefined
	}
	/* 3.3 Null Type. */
	readNull(): null {
		return null
	}
	/* 3.4 | 3.5 Boolean Type. */
	readBoolean(bool?: any): boolean {
		if (this.read() == 0x03) {
			return true
		} else {
			return false
		}
	}
	/* 3.6 Integer Type. */
	readInt(): number {
		let value = this.readUInt29()
		return (value << 3) >> 3
	}
	/* 3.7 Double Type. */
	readDouble(): number {
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
	readString(): string {
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
	readDate(): any {
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
	readArray(): any {
		let ref = this.readUInt29()
		if ((ref & 1) == 0) {
			return this.getObject(ref >> 1)
		}
		let len = (ref >> 1)
		let map: any = null, i = 0
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
	readObject(): any {
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
				value = (this as any).readXML()
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

	readScriptObject(): any {
		let ref = this.readUInt29()
		if ((ref & 1) == 0) {
			return this.getObject(ref >> 1)
		} else {
			let traits = this.readTraits(ref)
			let obj: any
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
	readTraits(ref: number): any {
		if ((ref & 3) == 1) {
			return this.getTraits(ref >> 2)
		} else {
			let ti: any = {
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
	readByteArray(): any {
		let ref = this.readUInt29()
		if ((ref & 1) == 0) {
			return this.getObject(ref >> 1)
		} else {
			let len = (ref >> 1)
			let ba: number[] = []
			for (let i = 0; i < len; i++) {
				ba[i] = this.read()
			}
			this.rememberObject(ba)
			return ba
		}
	}
	/* 3.15 Vector Type. */
	readVector(type?: number): any {
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
	toVector(type?: number, array?: any, fixed?: boolean): any {
		array = array || []
		array.type = type || 16
		array.fixed = fixed || false
		array.toString = function (this: any) {
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
	readDictionary(): any {
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
	readMap(): any {
		let ref = this.readUInt29()
		if ((ref & 1) == 0) {
			return this.getObject(ref >> 1)
		}
		let len = (ref >> 1)
		let map: any = null
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
}

const amf3 = {
	classes: {} as { [alias: string]: any },
	const: {
		CLASS_ALIAS: "_explicitType",
		EXTERNALIZED_FIELD: "_externalizedData",
	},

	registerClass: function (aliasName: string, classObject: any) {
		if (aliasName == null || classObject == 0) {
			throw new Error(`amf3::registerClassAlias - Error: Invalid arguments: ${aliasName} | ${classObject}`)
		}
		this.classes[aliasName] = classObject
	},

	Writer,
	Reader,
}

export default amf3
