import { deflateSync, deflateRawSync, inflateSync, inflateRawSync } from 'zlib'
import { LZMA } from 'lzma/src/lzma_worker.js'
import { encodingExists, decode, encode } from 'iconv-lite'

import { CompressionAlgorithm, Endian, ObjectEncoding } from './ByteArrayEnums'

import { AMF0 } from 'amf0-ts'
import { AMF3 } from 'amf3-ts'

/**
 * @description Helper function that converts data types to a buffer
 * @param {Buffer|Array|Number} v
 * @returns {Buffer}
 */
const convert = (v) => Buffer.isBuffer(v)
  ? v
  : Array.isArray(v) || v instanceof ArrayBuffer
    ? Buffer.from(v)
    : Number.isInteger(v)
      ? Buffer.alloc(v)
      : Buffer.alloc(0)

/**
 * @exports
 * @class
 */
export class ByteArray {
  /**
   * @private
   * @description The current position
   * @type {Number}
   */
  _position
  /**
   * @private
   * @description The byte order
   * @type {String}
   */
  _endian
  /**
   * @private
   * @description The object encoding
   * @type {Number}
   */
  _objectEncoding

  public buffer: Buffer;

  /**
   * @constructor
   * @param {Buffer|Array|Number} buffer
   */
  constructor(buffer:Buffer|ArrayBuffer|number = 0) {
    /**
     * @description Holds the data
     * @type {Buffer}
     */
    this.buffer = convert(buffer)
    /**
     * @private
     * @description The current position
     * @type {Number}
     */
    this._position = 0
    /**
     * @private
     * @description The byte order
     * @type {String}
     */
    this._endian = Endian.BIG_ENDIAN
    /**
     * @private
     * @description The object encoding
     * @type {Number}
     */
    this._objectEncoding = ObjectEncoding.AMF3
  }

  /**
   * @static
   * @description Registers a class alias
   * @param {Number} encoding
   * @param {String} aliasName
   * @param {ObjectEncoding} classObject
   */
  static registerClassAlias(encoding, aliasName, classObject) {
    if (encoding === ObjectEncoding.AMF0) {
      AMF0.registerClassAlias(aliasName, classObject)
    } else if (encoding === ObjectEncoding.AMF3) {
      AMF3.registerClassAlias(aliasName, classObject)
    } else {
      throw new Error(`Unknown object encoding: '${encoding}'.`)
    }
  }

  /**
   * @description Override for Object.prototype.toString.call
   * @returns {String}
   */
  get [Symbol.toStringTag]() {
    return 'ByteArray'
  }

  /**
   * @description Returns the current position
   * @returns {Number}
   */
  get position() {
    return this._position
  }

  /**
   * @description Sets the position
   * @param {Number} value
   */
  set position(value) {
    if (value >= 0) {
      this._position = value
    } else {
      throw new TypeError(`Invalid value for position: '${value}'.`)
    }
  }

  /**
   * @description Returns the byte order
   * @returns {String}
   */
  get endian() {
    return this._endian
  }

  /**
   * @description Sets the byte order
   * @param {String} value
   */
  set endian(value) {
    if (value === 'LE' || value === 'BE') {
      this._endian = value
    } else {
      throw new TypeError(`Invalid value for endian: '${value}'.`)
    }
  }

  /**
   * @description Returns the object encoding
   * @returns {Number}
   */
  get objectEncoding() {
    return this._objectEncoding
  }

  /**
   * @description Sets the object encoding
   * @param {Number} encoding
   */
  set objectEncoding(encoding) {
    if (encoding === ObjectEncoding.AMF0 || encoding === ObjectEncoding.AMF3) {
      this._objectEncoding = encoding
    } else {
      throw new Error(`Unknown object encoding: '${encoding}'.`)
    }
  }

  /**
   * @description Returns the length of the buffer
   * @returns {Number}
   */
  get length() {
    return this.buffer.length
  }

  /**
   * @description Sets the length of the buffer
   * @param {Number} value
   */
  set length(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError(`Invalid value for length: '${value}'.`)
    }

    if (value === 0) {
      this.clear()
    } else if (value !== this.length) {
      if (value < this.length) {
        this.buffer = this.buffer.slice(0, value)
        this._position = this.length
      } else {
        this._expand(value)
      }
    }
  }

  /**
   * @description Returns the amount of bytes available
   * @returns {Number}
   */
  get bytesAvailable() {
    return this.length - this._position
  }

  /**
   * @private
   * @description Reads a buffer function
   * @param {String} func
   * @param {Number} pos
   * @returns {Number}
   */
  _readBufferFunc(func, pos) {
    const value = this.buffer[`${func}${this._endian}`](this._position)

    this._position += pos

    return value
  }

  /**
   * @private
   * @description Writes a buffer function
   * @param {Number} value
   * @param {String} func
   * @param {Number} pos
   */
  _writeBufferFunc(value, func, pos) {
    this._expand(pos)

    this.buffer[`${func}${this._endian}`](value, this._position)
    this._position += pos
  }

  /**
   * @private
   * @description Expands the buffer when needed
   * @param {Number} value
   */
  _expand(value) {
    if (this.bytesAvailable < value) {
      const old = this.buffer
      const size = old.length + (value - this.bytesAvailable)

      this.buffer = Buffer.alloc(size)
      old.copy(this.buffer)
    }
  }

  /**
   * @description Simulates signed overflow
   * @author truelossless
   * @param {Number} value
   * @param {Number} bits
   * @returns {Number}
   */
  signedOverflow(value, bits) {
    const sign = 1 << bits - 1

    return (value & sign - 1) - (value & sign)
  }

  /**
   * @description Clears the buffer and sets the position to 0
   */
  clear() {
    this.buffer = Buffer.alloc(0)
    this._position = 0
  }

  /**
   * @description Compresses the buffer
   * @param {String} algorithm
   */
  async compress(algorithm = CompressionAlgorithm.ZLIB) {
    if (this.length === 0) {
      return
    }

    algorithm = algorithm.toLowerCase()

    if (algorithm === CompressionAlgorithm.ZLIB) {
      this.buffer = deflateSync(this.buffer, { level: 9 })
    } else if (algorithm === CompressionAlgorithm.DEFLATE) {
      this.buffer = deflateRawSync(this.buffer)
    } else if (algorithm === CompressionAlgorithm.LZMA) {
      this.buffer = await LZMA.compress(this.buffer, 1)
    } else {
      throw new Error(`Invalid compression algorithm: '${algorithm}'.`)
    }

    this._position = this.length
  }

  /**
   * @description Reads a boolean
   * @returns {Boolean}
   */
  readBoolean() {
    return this.readByte() !== 0
  }

  /**
   * @description Reads a signed byte
   * @returns {Number}
   */
  readByte() {
    return this.buffer.readInt8(this._position++)
  }

  /**
   * @description Reads multiple signed bytes from a ByteArray
   * @param {ByteArray} bytes
   * @param {Number} offset
   * @param {Number} length
   */
  readBytes(bytes, offset = 0, length = 0) {
    if (length === 0) {
      length = this.bytesAvailable
    }

    if (length > this.bytesAvailable) {
      throw new RangeError('End of buffer was encountered.')
    }

    if (bytes.length < offset + length) {
      bytes._expand(offset + length)
    }

    for (let i = 0; i < length; i++) {
      bytes.buffer[i + offset] = this.buffer[i + this._position]
    }

    this._position += length
  }

  /**
   * @description Reads a double
   * @returns {Number}
   */
  readDouble() {
    return this._readBufferFunc('readDouble', 8)
  }

  /**
   * @description Reads a float
   * @returns {Number}
   */
  readFloat() {
    return this._readBufferFunc('readFloat', 4)
  }

  /**
   * @description Reads a signed int
   * @returns {Number}
   */
  readInt() {
    return this._readBufferFunc('readInt32', 4)
  }

  /**
   * @description Reads a signed long
   * @returns {BigInt}
   */
  readLong() {
    return this._readBufferFunc('readBigInt64', 8)
  }

  /**
   * @description Reads a multibyte string
   * @param {Number} length
   * @param {String} charset
   * @returns {String}
   */
  readMultiByte(length, charset = 'utf8') {
    const position = this._position
    this._position += length

    if (encodingExists(charset)) {
      const b = this.buffer.slice(position, this._position)
      const stripBOM = (charset === 'utf8' || charset === 'utf-8') && b.length >= 3 && b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF
      const value = decode(b, charset, { stripBOM })

      stripBOM ? length -= 3 : 0

      if (Buffer.byteLength(value) !== length) {
        throw new RangeError('End of buffer was encountered.')
      }

      return value
    } else {
      throw new Error(`Invalid character set: '${charset}'.`)
    }
  }

  /**
   * @description Reads an object
   * @returns {Object}
   */
  readObject() {
    const [position, value] = this._objectEncoding === ObjectEncoding.AMF0
      ? AMF0.parse(this.buffer, this._position)
      : AMF3.parse(this.buffer, this._position)

    this._position += position

    return value
  }

  /**
   * @description Reads a signed short
   * @returns {Number}
   */
  readShort() {
    return this._readBufferFunc('readInt16', 2)
  }

  /**
   * @description Reads an unsigned byte
   * @returns {Number}
   */
  readUnsignedByte() {
    return this.buffer.readUInt8(this._position++)
  }

  /**
   * @description Reads an unsigned int
   * @returns {Number}
   */
  readUnsignedInt() {
    return this._readBufferFunc('readUInt32', 4)
  }

  /**
   * @description Reads an unsigned short
   * @returns {Number}
   */
  readUnsignedShort() {
    return this._readBufferFunc('readUInt16', 2)
  }

  /**
   * @description Reads an unsigned long
   * @returns {BigInt}
   */
  readUnsignedLong() {
    return this._readBufferFunc('readBigUInt64', 8)
  }

  /**
   * @description Reads a UTF-8 string
   * @returns {String}
   */
  readUTF() {
    return this.readMultiByte(this.readUnsignedShort())
  }

  /**
   * @description Reads UTF-8 bytes
   * @param {Number} length
   * @returns {String}
   */
  readUTFBytes(length) {
    return this.readMultiByte(length)
  }

  /**
   * @description Converts the buffer to JSON
   * @returns {Object}
   */
  toJSON() {
    return Object.assign({}, this.buffer.toJSON().data)
  }

  /**
   * @description Converts the buffer to a string
   * @param {String} charset
   * @returns {String}
   */
  toString(charset = 'utf8') {
    if (encodingExists(charset)) {
      return decode(this.buffer, charset)
    } else {
      throw new Error(`Invalid character set: '${charset}'.`)
    }
  }

  /**
   * @description Decompresses the buffer
   * @param {String} algorithm
   */
  async uncompress(algorithm = CompressionAlgorithm.ZLIB) {
    if (this.length === 0) {
      return
    }

    algorithm = algorithm.toLowerCase()

    if (algorithm === CompressionAlgorithm.ZLIB) {
      this.buffer = inflateSync(this.buffer, { level: 9 })
    } else if (algorithm === CompressionAlgorithm.DEFLATE) {
      this.buffer = inflateRawSync(this.buffer)
    } else if (algorithm === CompressionAlgorithm.LZMA) {
      this.buffer = await LZMA.decompress(this.buffer)
    } else {
      throw new Error(`Invalid decompression algorithm: '${algorithm}'.`)
    }

    this._position = 0
  }

  /**
   * @description Writes a boolean
   * @param {Boolean} value
   */
  writeBoolean(value) {
    this.writeByte(value ? 1 : 0)
  }

  /**
   * @description Writes a signed byte
   * @param {Number} value
   */
  writeByte(value) {
    this._expand(1)
    this.buffer.writeInt8(this.signedOverflow(value, 8), this._position++)
  }

  /**
   * @description Writes multiple signed bytes to a ByteArray
   * @param {ByteArray} bytes
   * @param {Number} offset
   * @param {Number} length
   */
  writeBytes(bytes, offset = 0, length = 0) {
    if (length === 0) {
      length = bytes.length - offset
    }

    this._expand(length)

    for (let i = 0; i < length; i++) {
      this.buffer[i + this._position] = bytes.buffer[i + offset]
    }

    this._position += length
  }

  /**
  * @description Writes a double
  * @param {Number} value
  */
  writeDouble(value) {
    this._writeBufferFunc(value, 'writeDouble', 8)
  }

  /**
   * @description Writes a float
   * @param {Number} value
   */
  writeFloat(value) {
    this._writeBufferFunc(value, 'writeFloat', 4)
  }

  /**
   * @description Writes a signed int
   * @param {Number} value
   */
  writeInt(value) {
    this._writeBufferFunc(this.signedOverflow(value, 32), 'writeInt32', 4)
  }

  /**
   * @description Writes a signed long
   * @param {BigInt} value
   */
  writeLong(value) {
    this._writeBufferFunc(value, 'writeBigInt64', 8)
  }

  /**
   * @description Writes a multibyte string
   * @param {String} value
   * @param {String} charset
   */
  writeMultiByte(value, charset = 'utf8') {
    this._position += Buffer.byteLength(value)

    if (encodingExists(charset)) {
      this.buffer = Buffer.concat([this.buffer, encode(value, charset)])
    } else {
      throw new Error(`Invalid character set: '${charset}'.`)
    }
  }

  /**
   * @description Writes an object
   * @param {Object} value
   */
  writeObject(value) {
    const bytes = this._objectEncoding === ObjectEncoding.AMF0
      ? AMF0.stringify(value)
      : AMF3.stringify(value)

    this._position += bytes.length
    this.buffer = Buffer.concat([this.buffer, Buffer.from(bytes)])
  }

  /**
   * @description Writes a signed short
   * @param {Number} value
   */
  writeShort(value) {
    this._writeBufferFunc(this.signedOverflow(value, 16), 'writeInt16', 2)
  }

  /**
   * @description Writes an unsigned byte
   * @param {Number} value
   */
  writeUnsignedByte(value) {
    this._expand(1)
    this.buffer.writeUInt8(value, this._position++)
  }

  /**
   * @description Writes an unsigned int
   * @param {Number} value
   */
  writeUnsignedInt(value) {
    this._writeBufferFunc(value, 'writeUInt32', 4)
  }

  /**
   * @description Writes an unsigned short
   * @param {Number} value
   */
  writeUnsignedShort(value) {
    this._writeBufferFunc(value, 'writeUInt16', 2)
  }

  /**
   * @description Writes an unsigned long
   * @param {BigInt} value
   */
  writeUnsignedLong(value) {
    this._writeBufferFunc(value, 'writeBigUInt64', 8)
  }

  /**
   * @description Writes a UTF-8 string
   * @param {String} value
   */
  writeUTF(value) {
    this.writeUnsignedShort(Buffer.byteLength(value))
    this.writeMultiByte(value)
  }

  /**
   * @description Writes UTF-8 bytes
   * @param {String} value
   */
  writeUTFBytes(value) {
    this.writeMultiByte(value)
  }
}
