import { deflateSync, deflateRawSync, inflateSync, inflateRawSync } from "zlib";
import { LZMA } from "lzma/src/lzma_worker.js";

import amf0 from "./AMF/AMF0.js"
import amf3 from "./AMF/AMF3.js"

const Values = {
	MAX_BUFFER_SIZE: 4096,

	BIG_ENDIAN: true,
	LITTLE_ENDIAN: false,

	AMF_0: 0,
	AMF_3: 3,

	DEFLATE: "deflate",
	LZMA: "lzma",
	ZLIB: "zlib"
}

/**
 * @description Helper function that converts data types to a buffer
 * @param {Buffer|Array|Number} v
 * @returns {Buffer}
 */
 const convert = (v) => {
  if (Buffer.isBuffer(v)) return v;
  if (Array.isArray(v)) return Buffer.from(v);
  if (v instanceof ArrayBuffer) return Buffer.from(new Uint8Array(v));
  if (v instanceof Uint8Array) return Buffer.from(v);
  if (Number.isInteger(v)) return Buffer.alloc(v);
  return Buffer.alloc(0);
};


/** Class representing a ByteArray. */
export class ByteArray {
	/**
	 * Create a ByteArray.
	 * Standard values: {offset: 0, endian: BIG_ENDIAN, objectEncoding: AMF_3}
	 * @param {buffer} buff - Custom length or another ByteArray to read from.
	 * @param {boolean} isDataView - The buff parameter is a Buffer but we want to convert it into DataView.
	 */
	constructor(buff, isDataView = false) {
		this.offset = 0
		this.endian = Values.BIG_ENDIAN
		this._objectEncoding = Values.AMF_3

		this.buffer = convert(buff)
		// if (buff instanceof ByteArray) {
		// 	this.buffer = buff.buffer
		// } else if (buff instanceof Buffer) {
		// 	if (isDataView) { /* It is a Buffer, but we want to convert the Buffer to ArrayBuffer to be used by DataView. */
		// 		let a = new ArrayBuffer(buff.length)
		// 		buff.forEach(i => { new Uint8Array(a)[i] = buff[i] })
		// 		this.buffer = new DataView(a) /* It is now a DataView that we can use. Values could've been written using Buffer and can now be read by DataView. */
		// 	} else {
		// 		this.buffer = buff
		// 	}
		// } else {
		// 	this.buffer = Buffer.alloc(typeof (buff) === "number" ? Number(buff) : Values.MAX_BUFFER_SIZE) /** new Buffer is deprecated. */
		// }
	}
	/**
	 * Validates string.
	 * @param {string} value
	 * @returns {string/null}
	 */
	axCoerceString(value) {
		if (typeof value === "string") {
			return value
		} else if (value == undefined) {
			return null
		}
		return value + ""
	}
	/**
	 * Returns the position.
	 * @returns {number}
	 */
	get position() {
		return this.offset
	}
	/**
	 * Sets the position to value.
	 * @param {number} value
	 */
	set position(value) {
		this.offset = value
	}
	/**
	 * Returns the buffer length.
	 * @returns {number}
	 */
	get length() {
		return this.buffer.length
	}
	/**
	 * Sets the length of the buffer to value.
	 * @param {number} value
	 */
	set length(value) {
		this.buffer.length = value
	}
	/**
	 * Returns the buffer length minus the position.
	 * @returns {number}
	 */
	get bytesAvailable() {
		return this.length - this.offset
	}
	/**
	 * Returns the AMF version.
	 * @returns {number}
	 */
	get objectEncoding() {
		return this._objectEncoding
	}
	/**
	 * Sets the AMF version to AMFV.
	 * @param {number} AMFV
	 */
	set objectEncoding(AMFV) {
		if (AMFV == Values.AMF_0 || AMFV == Values.AMF_3) {
			this._objectEncoding = AMFV
		} else {
			throw new TypeError(`ByteArray.set::objectEncoding - Error: Invalid AMF version: ${AMFV}`)
		}
	}
	/**
	 * Resets the position to 0.
	 */
	reset() {
		this.offset = 0
	}
	/**
	 * Clears the buffer with 4096 zeros.
	 */
	clear() {
		this.buffer = Buffer.alloc(Values.MAX_BUFFER_SIZE)
	}
	/**
	 * Fills a specific part of the byte stream.
	 * @param {number} bytesToKeep
	 * @param {number} toFillWith
	 * @returns {buffer}
	 */
	fill(bytesToKeep, toFillWith) {
		for (let i = 0; i < bytesToKeep; i++) {
			this.buffer[i] = toFillWith
		}
		return this.buffer
	}
	/**
	 * Compresses the byte array.
	 * @param {string} type
	 */
	async compress(type = Values.ZLIB) {
		type = this.axCoerceString(type)
		let algorithm = ""
		if (type === Values.DEFLATE) algorithm = Values.DEFLATE
		if (type === Values.LZMA) algorithm = Values.LZMA
		if (type === Values.ZLIB) algorithm = Values.ZLIB
		switch (algorithm) {
			case Values.DEFLATE:
				this.buffer = deflateRawSync(this.buffer)
				break
			case Values.LZMA:
				this.buffer = await LZMA.compress(this.buffer, 1);
				break
			case Values.ZLIB:
				this.buffer = deflateSync(this.buffer)
				break
		}
	}
	/**
	 * Compresses the byte array using the deflate compression algorithm.
	 */
	deflate() {
		return this.compress(Values.DEFLATE)
	}
	/**
	 * Decompresses the byte array using the deflate compression algorithm.
	 */
	inflate() {
		return this.uncompress(Values.DEFLATE)
	}
	/**
	 * Returns a range within the supplied bounds.
	 * @param {number} length
	 * @returns {array}
	 */
	range(length) {
		return Array.from({ length: length }, (x, i) => i)
	}
	/**
	 * Updates the position.
	 * @param {number} n
	 * @returns {number}
	 */
	updatePosition(n) {
		if (n > Values.MAX_BUFFER_SIZE) {
			throw new RangeError(`ByteArray::updatePosition - Error: Trying to access beyond buffer length with position: ${n}`)
		}
		if (this.offset + n >= this.length) {
			this.buffer = Buffer.concat([this.buffer, Buffer.alloc(n)])
		}
		let a = this.offset
		this.offset += n
		return a
	}
	/**
	 * Reads a boolean from the byte stream.
	 * @returns {boolean}
	 */
	readBoolean() {
		return Boolean(this.buffer.readInt8(this.updatePosition(1)))
	}
	/**
	 * Reads a signed byte from the byte stream.
	 * @returns {number}
	 */
	readByte() {
		const pos = this.updatePosition(1);
		return this.buffer.readInt8(pos)
	}
	/**
	 * Reads the number of data bytes, specified by the length parameter, from the byte stream.
	 * The bytes are read into the ByteArray object specified by the bytes parameter,
	 * and the bytes are written into the destination ByteArray starting at the position specified by offset.
	 * @param {bytearray} bytes
	 * @param {number} offset
	 * @param {number} length
	 * @returns {number}
	 */
	readBytes(bytes, offset = 0, length = 0) {
		if (offset === undefined) {
			offset = 0
		}
		if (length === undefined || length === 0) {
			length = this.bytesAvailable
		}
		let endOffset = offset + length
		for (let i = offset; i < endOffset; i++) {
			bytes[i] = this.readByte()
			return bytes[i]
		}
	}
	/**
	 * Reads an IEEE 754 double-precision (64-bit) floating-point number from the byte stream.
	 * @returns {number}
	 */
	readDouble() {
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.readDoubleBE(this.updatePosition(8))
			: this.buffer.readDoubleLE(this.updatePosition(8))
	}
	/**
	 * Reads an IEEE 754 single-precision (32-bit) floating-point number from the byte stream.
	 * @returns {number}
	 */
	readFloat() {
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.readFloatBE(this.updatePosition(4))
			: this.buffer.readFloatLE(this.updatePosition(4))
	}
	/**
	 * Reads a signed 32-bit integer from the byte stream.
	 * @returns {number}
	 */
	readInt() {
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.readInt32BE(this.updatePosition(4))
			: this.buffer.readInt32LE(this.updatePosition(4))
	}
	/**
	 * Reads a multibyte string of specified length from the byte stream using the specified character set.
	 * The supported character sets for Node.js are: ascii, utf8, utf16le, ucs2, base64, latin1, binary and hex.
	 * @param {number} length
	 * @param {string} charset
	 * @returns {string}
	 */
	readMultiByte(length, charset) {
		charset = this.axCoerceString(charset)
		let offset = this.updatePosition(length)
		return this.buffer.toString(charset || "utf8", offset, offset + length)
	}
	/**
	 * Reads an object from the byte array, encoded in AMF serialized format.
	 * @returns {object}
	 */
	readObject() {
		switch (this.objectEncoding) {
			case Values.AMF_0:
				let AMF_0 = new amf0.Reader()
				return AMF_0.readObject(this.buffer)
				break
			case Values.AMF_3:
				let AMF_3 = new amf3.Reader(this.buffer, this)
				return AMF_3.readObject()
		}
	}
	/**
	 * Reads a signed 16-bit integer from the byte stream.
	 * @returns {number}
	 */
	readShort() {
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.readInt16BE(this.updatePosition(2))
			: this.buffer.readInt16LE(this.updatePosition(2))
	}
	/**
	 * Reads an unsigned byte from the byte stream.
	 * @returns {number}
	 */
	readUnsignedByte() {
		return this.buffer.readUInt8(this.updatePosition(1))
	}
	/**
	 * Reads an unsigned 32-bit integer from the byte stream.
	 * @returns {number}
	 */
	readUnsignedInt() {
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.readUInt32BE(this.updatePosition(4))
			: this.buffer.readUInt32LE(this.updatePosition(4))
	}
	/**
	 * Reads an unsigned 16-bit integer from the byte stream.
	 * @returns {number}
	 */
	readUnsignedShort() {
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.readUInt16BE(this.updatePosition(2))
			: this.buffer.readUInt16LE(this.updatePosition(2))
	}
	/**
	 * Reads a UTF-8 string from the byte stream. The string is assumed to be prefixed with an unsigned short indicating the length in bytes.
	 * @returns {string}
	 */
	readUTF() {
		let length = this.readShort()
		return this.buffer.toString("utf8", this.offset, this.offset + length)
	}
	/**
	 * Reads a sequence of UTF-8 bytes specified by the length parameter from the byte stream and returns a string.
	 * @param {number} length
	 * @returns {string}
	 */
	readUTFBytes(length) {
		let offset = this.updatePosition(length)
		return this.buffer.toString("utf8", offset, offset + length)
	}
	/**
	 * Returns a JSON formatted buffer.
	 * @returns {json}
	 */
	toJSON() {
		return this.buffer.toJSON()
	}
	/**
	 * Returns a UTF8 decoded buffer.
	 * @returns {string}
	 */
	toString() {
		return this.buffer.toString("utf8", this.offset, this.length)
	}
	/**
	 * Decompresses the byte array.
	 * @param {string} type
	 */
	async uncompress(type = Values.ZLIB) {
		type = this.axCoerceString(type)
		let algorithm = ""
		if (type === Values.DEFLATE) algorithm = Values.DEFLATE
		if (type === Values.LZMA) algorithm = Values.LZMA
		if (type === Values.ZLIB) algorithm = Values.ZLIB
		switch (algorithm) {
			case Values.DEFLATE:
				this.buffer = inflateRawSync(this.buffer)
				break
			case Values.LZMA:
				this.buffer = await LZMA.decompress(this.buffer);
				break
			case Values.ZLIB:
				this.buffer = inflateSync(this.buffer)
				break
		}
	}
	/**
	 * Reads a single UTF-8 character from the byte stream.
	 * @returns {string}
	 */
	readChar() {
		return String.fromCharCode(this.buffer[this.offset++])
	}
	/**
	 * Reads an array of signed bytes from the byte stream.
	 * @param {number} length
	 * @returns {int8array}
	 */
	readByteArray(length) {
		return new Int8Array(this.range(length).map(() => this.readByte()))
	}
	/**
	 * Reads an array of signed 16-bit integers from the byte stream.
	 * @param {number} length
	 * @returns {int16array}
	 */
	readShortArray(length) {
		return new Int16Array(this.range(length).map(() => this.readShort()))
	}
	/**
	 * Reads an array of signed 32-bit integers from the byte stream.
	 * @param {number} length
	 * @returns {int32array}
	 */
	readIntArray(length) {
		return new Int32Array(this.range(length).map(() => this.readInt()))
	}
	/**
	 * Reads a signed 64-bit integer from the byte stream.
	 * @returns {number}
	 */
	readLong() {
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.readInt32BE(this.updatePosition(4)) | this.buffer.readInt32BE(this.updatePosition(4))
			: this.buffer.readInt32LE(this.updatePosition(4)) | this.buffer.readInt32LE(this.updatePosition(4))
	}
	/**
	 * Reads an unsigned 64-bit integer from the byte stream.
	 * @returns {number}
	 */
	readUnsignedLong() {
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.readUInt32BE(this.updatePosition(4)) | this.buffer.readUInt32BE(this.updatePosition(4))
			: this.buffer.readUInt32LE(this.updatePosition(4)) | this.buffer.readUInt32LE(this.updatePosition(4))
	}
	/**
	 * Reads an integer from the byte stream with specified null bytes at end.
	 * @param {number} bytes
	 * @returns {number}
	 */
	readIntegerWithLength(bytes) {
		let result = 0
		for (let i = bytes - 1; i >= 0; i--) {
			result = ((result << 8) | this.buffer[this.offset + i]) >>> 0
		}
		this.offset += bytes
		return result
	}
	/**
	 * Reads a var-integer from the byte stream.
	 * @returns {number}
	 */
	readVarInt() {
		let result = 0
		let shift = 0
		do {
			result += shift < 28
				? (this.buffer[this.offset++] & 0x7F) << shift
				: (this.buffer[this.offset++] & 0x7F) * Math.pow(2, shift)
			shift += 7
		} while (this.buffer[this.offset++] >= 0x80)
		return result
	}
	/**
	 * Reads an unsigned var-integer from the byte stream.
	 * @returns {number}
	 */
	readVarUInt() {
		return this.readVarInt() >>> 1 ^ -(this.readVarInt() & 1)
	}
	/**
	 * Writes a Boolean value. A single byte is written according to the value parameter, either 1 if true or 0 if false.
	 * @param {boolean} value
	 */
	writeBoolean(value) {
		const pos = this.updatePosition(1)
		return this.buffer.writeInt8(Number(value), pos)
	}
	/**
	 * Writes a byte to the byte stream.
	 * @param {number} value
	 */
	writeByte(value) {
		const pos = this.updatePosition(1)
		return this.buffer.writeInt8(value, pos)
	}
	/**
	 * Writes a sequence of length bytes from the specified byte array, bytes, starting offset(zero-based index) bytes into the byte stream.
	 * If the length parameter is omitted, the default length of 0 is used; the method writes the entire buffer starting at offset.
	 * If the offset parameter is also omitted, the entire buffer is written.
	 * If offset or length is out of range, they are clamped to the beginning and end of the bytes array.
	 * @param {bytearray} bytes
	 * @param {number} offset
	 * @param {number} length
	 */
	writeBytes(bytes, offset = 0, length = 0) {
		if (offset === undefined || offset < 0 || offset >= bytes.length) {
			offset = 0
		}
		let endOffset
		if (length === undefined || length === 0) {
			endOffset = bytes.length
		} else {
			endOffset = offset + length
			if (endOffset < 0 || endOffset > bytes.length) {
				endOffset = bytes.length
			}
		}
		if (Array.isArray(bytes)) {
			for (let i = 0; i < bytes.length; i++) {
				this.writeByte(bytes[i])
			}
		} else {
			for (let i = offset; i < endOffset; i++) {
				this.writeByte(bytes[i])
			}
		}
	}
	/**
	 * Writes an IEEE 754 double-precision (64-bit) floating-point number to the byte stream.
	 * @param {number} value
	 */
	writeDouble(value) {
		const pos = this.updatePosition(8)
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.writeDoubleBE(value, pos)
			: this.buffer.writeDoubleLE(value, pos)
	}
	/**
	 * Writes an IEEE 754 single-precision (32-bit) floating-point number to the byte stream.
	 * @param {number} value
	 */
	writeFloat(value) {
		const pos = this.updatePosition(4)
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.writeFloatBE(value, pos)
			: this.buffer.writeFloatLE(value, pos)
	}
	/**
	 * Writes a 32-bit signed integer to the byte stream.
	 * @param {number} value
	 */
	writeInt(value) {
		const pos = this.updatePosition(4)
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.writeInt32BE(value, pos)
			: this.buffer.writeInt32LE(value, pos)
	}
	/**
	 * Writes a multibyte string to the byte stream using the specified character set.
	 * The supported character sets for Node.js are: ascii, utf8, utf16le, ucs2, base64, latin1, binary and hex.
	 * @param {string} str
	 * @param {string} charset
	 */
	writeMultiByte(str, charset) {
		str = this.axCoerceString(str)
		charset = this.axCoerceString(charset)
		let length = Buffer.byteLength(str)
		return this.buffer.write(str, this.updatePosition(length), length, charset || "utf8")
	}
	/**
	 * Writes an object into the byte array in AMF serialized format.
	 * @param {object} object
	 */
	writeObject(object) {
		switch (this.objectEncoding) {
			case Values.AMF_0:
				let AMF_0 = new amf0.Writer()
				this.buffer = Buffer.concat([AMF_0.writeObject(object), this.buffer])
				break
			case Values.AMF_3:
				let AMF_3 = new amf3.Writer()
				AMF_3.writeObject(object)
				this.buffer = Buffer.concat([Buffer.from(AMF_3.data), this.buffer])
				break
		}
	}
	/**
	 * Writes a 16-bit integer to the byte stream. The low 16 bits of the parameter are used. The high 16 bits are ignored.
	 * @param {number} value
	 */
	writeShort(value) {
		const pos = this.updatePosition(2)
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.writeInt16BE(value, pos)
			: this.buffer.writeInt16LE(value, pos)
	}
	/**
	 * Writes an unsigned byte to the byte stream.
	 * @param {number} value
	 */
	writeUnsignedByte(value) {
		return this.buffer.writeUInt8(value, this.updatePosition(1))
	}
	/**
	 * Writes a 32-bit unsigned integer to the byte stream.
	 * @param {number} value
	 */
	writeUnsignedInt(value) {
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.writeUInt32BE(value, this.updatePosition(4))
			: this.buffer.writeUInt32LE(value, this.updatePosition(4))
	}
	/**
	 * Writes an unsigned 16-bit integer to the byte stream. The low 16 bits of the parameter are used. The high 16 bits are ignored.
	 * @param {number} value
	 */
	writeUnsignedShort(value) {
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.writeUInt16BE(value, this.updatePosition(2))
			: this.buffer.writeUInt16LE(value, this.updatePosition(2))
	}
	/**
	 * Writes a UTF-8 string to the byte stream.
	 * The length of the UTF-8 string in bytes is written first, as a 16-bit integer, followed by the bytes representing the characters of the string.
	 * @param {string} str
	 */
	writeUTF(str) {
		str = this.axCoerceString(str)
		let length = Buffer.byteLength(str)
		this.writeShort(length)
		this.buffer = Buffer.concat([this.buffer, Buffer.from(str)])
		// return this.buffer.write(str, this.offset, this.offset += length, "utf8")
		return length
	}
	/**
	 * Writes a UTF-8 string to the byte stream. Similar to the writeUTF() method, but writeUTFBytes() does not prefix the string with a 16-bit length word.
	 * @param {string} str
	 */
	writeUTFBytes(str) {
		str = this.axCoerceString(str)
		let length = Buffer.byteLength(str)
		return this.buffer.write(str, this.offset, this.offset += length, "utf8")
	}
	/**
	 * Writes a single UTF-8 character to the byte stream.
	 * @param {string} value
	 */
	writeChar(value) {
		return this.writeUnsignedByte(value.charCodeAt(0))
	}
	/**
	 * Writes an array of signed bytes to the byte stream.
	 * @param {array} values
	 */
	writeByteArray(values) {
		if (!Array.isArray(values)) {
			throw new TypeError(`ByteArray::writeByteArray - Error: ${values} is not an array`)
		}
		values.forEach(value => {
			this.writeByte(value)
		})
	}
	/**
	 * Writes an array of 16-bit integers to the byte stream.
	 * @param {array} values
	 */
	writeShortArray(values) {
		if (!Array.isArray(values)) {
			throw new TypeError(`ByteArray::writeShortArray - Error: ${values} is not an array`)
		}
		values.forEach(value => {
			this.writeShort(value)
		})
	}
	/**
	 * Writes an array of 32-bit integers to the byte stream.
	 * @param {array} values
	 */
	writeIntArray(values) {
		if (!Array.isArray(values)) {
			throw new TypeError(`ByteArray::writeIntArray - Error: ${values} is not an array`)
		}
		values.forEach(value => {
			this.writeInt(value)
		})
	}
	/**
	 * Writes a 64-bit integer to the byte stream.
	 * @param {number} value
	 */
	writeLong(value) {
		if (value > 0x7FFFFFFFFFFFFFFF || value < -0x8000000000000000) {
			throw new RangeError(`ByteArray::writeLong - Error: ${value} is out of bounds`)
		}
		if (this.offset + 8 > this.length) {
			throw new RangeError(`ByteArray::writeLong - Error: ${this.offset + 8} is greater than ${this.length}`)
		}
		let high = Math.floor(value / 0x100000000)
		let low = value - high * 0x100000000
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.writeInt32BE(high, this.updatePosition(4)) | this.buffer.writeInt32BE(low, this.updatePosition(4))
			: this.buffer.writeInt32LE(value % 0x100000000, this.updatePosition(4)) | this.buffer.writeInt32LE(Math.floor(value / 0x100000000), this.updatePosition(4))
	}
	/**
	 * Writes an unsigned 64-bit integer to the byte stream.
	 * @param {number} value
	 */
	writeUnsignedLong(value) {
		if (value > 0xFFFFFFFFFFFFFFFF || value < 0) {
			throw new RangeError(`ByteArray::writeUnsignedLong - Error: ${value} is out of bounds`)
		}
		if (this.offset + 8 > this.length) {
			throw new RangeError(`ByteArray::writeUnsignedLong - Error: ${this.offset + 8} is greater than ${this.length}`)
		}
		let high = Math.floor(value / 0x100000000)
		let low = value - high * 0x100000000
		return this.endian === Values.BIG_ENDIAN
			? this.buffer.writeUInt32BE(high, this.updatePosition(4)) | this.buffer.writeUInt32BE(low, this.updatePosition(4))
			: this.buffer.writeUInt32LE(value % 0x100000000, this.updatePosition(4)) | this.buffer.writeUInt32LE(Math.floor(value / 0x100000000), this.updatePosition(4))
	}
	/**
	 * Writes an integer to the byte stream with specified null bytes at end.
	 * @param {number} bytes
	 * @param {number} value
	 */
	writeIntegerWithLength(bytes, value) {
		if (bytes > Values.MAX_BUFFER_SIZE || value > Values.MAX_BUFFER_SIZE) {
			throw new RangeError(`ByteArray::writeIntegerWithLength - Error: ${bytes} | ${value} are out of bounds`)
		}
		for (let i = 0; i < bytes; i++) {
			this.buffer[0 + i] = (value >> (i * 8)) & 0xFF
		}
		this.offset += bytes
	}
	/**
	 * Writes a var-integer to the byte stream.
	 * @param {number} value
	 */
	writeVarInt(value) {
		while (value >= Math.pow(2, 31)) {
			this.buffer[this.offset++] = (value & 0xFF) | 0x80
			value /= 128
		}
		while (value & ~0x7F) {
			this.buffer[this.offset++] = (value & 0xFF) | 0x80
			value >>>= 7
		}
		this.buffer[this.offset] = value | 0
	}
	/**
	 * Writes an unsigned var-integer to the byte stream.
	 * @param {number} value
	 */
	writeVarUInt(value) {
		this.writeVarInt(value << 1 ^ value >> 31)
	}
}
