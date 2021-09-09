// Abomination produced from combining the object reading code from https://github.com/jamesward/JSAMF/blob/master/web/web/amf.js
// with the more up-to-date (but broken object reading) ByteArray implementation from https://github.com/Zaseth/bytearray-node
// Thanks James Ward and Zaseth!

// This desparately needs to be cleaned up and brings in way too many dependencies, but it does at least work for loading basic robots.
import { deflateSync, deflateRawSync, inflateSync, inflateRawSync } from "zlib";
import { LZMA } from "lzma/src/lzma_worker.js";
import { encodingExists, decode, encode } from "iconv-lite";

import { CompressionAlgorithm, Endian, ObjectEncoding } from "../imports";

import amf0 from "./AMF/AMF0.js"
import amf3 from "./AMF/AMF3.js"

const AMF0Types = {
  kNumberType: 0,
  kBooleanType: 1,
  kStringType: 2,
  kObjectType: 3,
  kMovieClipType: 4,
  kNullType: 5,
  kUndefinedType: 6,
  kReferenceType: 7,
  kECMAArrayType: 8,
  kObjectEndType: 9,
  kStrictArrayType: 10,
  kDateType: 11,
  kLongStringType: 12,
  kUnsupportedType: 13,
  kRecordsetType: 14,
  kXMLObjectType: 15,
  kTypedObjectType: 16,
  kAvmPlusObjectType: 17,
};

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
  _position;
  /**
   * @private
   * @description The byte order
   * @type {String}
   */
  _endian;
  /**
   * @private
   * @description The object encoding
   * @type {Number}
   */
  _objectEncoding;

  stringTable = [];
  objectTable = [];
  traitTable = [];

  public buffer: Buffer;

  /**
   * @constructor
   * @param {Buffer|Array|Number} buffer
   */
  constructor(buffer: Buffer | ArrayBuffer | number = 0) {
    /**
     * @description Holds the data
     * @type {Buffer}
     */
    this.buffer = convert(buffer);
    /**
     * @private
     * @description The current position
     * @type {Number}
     */
    this._position = 0;
    /**
     * @private
     * @description The byte order
     * @type {String}
     */
    this._endian = Endian.BIG_ENDIAN;
    /**
     * @private
     * @description The object encoding
     * @type {Number}
     */
    this._objectEncoding = ObjectEncoding.AMF3;
  }

  /**
   * @description Override for Object.prototype.toString.call
   * @returns {String}
   */
  get [Symbol.toStringTag]() {
    return "ByteArray";
  }

  /**
   * @description Returns the current position
   * @returns {Number}
   */
  get position() {
    return this._position;
  }

  /**
   * @description Sets the position
   * @param {Number} value
   */
  set position(value) {
    if (value >= 0) {
      this._position = value;
    } else {
      throw new TypeError(`Invalid value for position: '${value}'.`);
    }
  }

  /**
   * @description Returns the byte order
   * @returns {String}
   */
  get endian() {
    return this._endian;
  }

  /**
   * @description Sets the byte order
   * @param {String} value
   */
  set endian(value) {
    if (value === "LE" || value === "BE") {
      this._endian = value;
    } else {
      throw new TypeError(`Invalid value for endian: '${value}'.`);
    }
  }

  /**
   * @description Returns the object encoding
   * @returns {Number}
   */
  get objectEncoding() {
    return this._objectEncoding;
  }

  /**
   * @description Sets the object encoding
   * @param {Number} encoding
   */
  set objectEncoding(encoding) {
    if (encoding === ObjectEncoding.AMF0 || encoding === ObjectEncoding.AMF3) {
      this._objectEncoding = encoding;
    } else {
      throw new Error(`Unknown object encoding: '${encoding}'.`);
    }
  }

  /**
   * @description Returns the length of the buffer
   * @returns {Number}
   */
  get length() {
    return this.buffer.length;
  }

  /**
   * @description Sets the length of the buffer
   * @param {Number} value
   */
  set length(value) {
    if (!Number.isInteger(value) || value < 0) {
      throw new TypeError(`Invalid value for length: '${value}'.`);
    }

    if (value === 0) {
      this.clear();
    } else if (value !== this.length) {
      if (value < this.length) {
        this.buffer = this.buffer.slice(0, value);
        this._position = this.length;
      } else {
        this._expand(value);
      }
    }
  }

  /**
   * @description Returns the amount of bytes available
   * @returns {Number}
   */
  get bytesAvailable() {
    return this.length - this._position;
  }

  /**
   * @private
   * @description Reads a buffer function
   * @param {String} func
   * @param {Number} pos
   * @returns {Number}
   */
  _readBufferFunc(func, pos) {
    const value = this.buffer[`${func}${this._endian}`](this._position);

    this._position += pos;

    return value;
  }

  /**
   * @private
   * @description Writes a buffer function
   * @param {Number} value
   * @param {String} func
   * @param {Number} pos
   */
  _writeBufferFunc(value, func, pos) {
    this._expand(pos);

    this.buffer[`${func}${this._endian}`](value, this._position);
    this._position += pos;
  }

  /**
   * @private
   * @description Expands the buffer when needed
   * @param {Number} value
   */
  _expand(value) {
    if (this.bytesAvailable < value) {
      const old = this.buffer;
      const size = old.length + (value - this.bytesAvailable);

      this.buffer = Buffer.alloc(size);
      old.copy(this.buffer);
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
    const sign = 1 << (bits - 1);

    return (value & (sign - 1)) - (value & sign);
  }

  /**
   * @description Clears the buffer and sets the position to 0
   */
  clear() {
    this.buffer = Buffer.alloc(0);
    this._position = 0;
  }

  /**
   * @description Compresses the buffer
   * @param {String} algorithm
   */
  async compress(algorithm = CompressionAlgorithm.ZLIB) {
    if (this.length === 0) {
      return;
    }

    algorithm = algorithm.toLowerCase();

    if (algorithm === CompressionAlgorithm.ZLIB) {
      this.buffer = deflateSync(this.buffer, { level: 9 });
    } else if (algorithm === CompressionAlgorithm.DEFLATE) {
      this.buffer = deflateRawSync(this.buffer);
    } else if (algorithm === CompressionAlgorithm.LZMA) {
      this.buffer = await LZMA.compress(this.buffer, 1);
    } else {
      throw new Error(`Invalid compression algorithm: '${algorithm}'.`);
    }

    this._position = this.length;
  }

  /**
   * @description Reads a boolean
   * @returns {Boolean}
   */
  readBoolean() {
    return this.readByte() !== 0;
  }

  /**
   * @description Reads a signed byte
   * @returns {Number}
   */
  readByte() {
    const pos = this._position++
    return this.buffer.readInt8(pos);
  }

  /**
   * @description Reads multiple signed bytes from a ByteArray
   * @param {ByteArray} bytes
   * @param {Number} offset
   * @param {Number} length
   */
  readBytes(bytes, offset = 0, length = 0) {
    if (length === 0) {
      length = this.bytesAvailable;
    }

    if (length > this.bytesAvailable) {
      throw new RangeError("End of buffer was encountered.");
    }

    if (bytes.length < offset + length) {
      bytes._expand(offset + length);
    }

    for (let i = 0; i < length; i++) {
      bytes.buffer[i + offset] = this.buffer[i + this._position];
    }

    this._position += length;
  }

  /**
   * @description Reads a double
   * @returns {Number}
   */
  readDouble() {
    return this._readBufferFunc("readDouble", 8);
  }

  /**
   * @description Reads a float
   * @returns {Number}
   */
  readFloat() {
    return this._readBufferFunc("readFloat", 4);
  }

  /**
   * @description Reads a signed int
   * @returns {Number}
   */
  readInt() {
    return this._readBufferFunc("readInt32", 4);
  }

  /**
   * @description Reads a signed long
   * @returns {BigInt}
   */
  readLong() {
    return this._readBufferFunc("readBigInt64", 8);
  }

  readUInt29() {
    var value;

    // Each byte must be treated as unsigned
    var b = this.readByte() & 0xff;

    if (b < 128) return b;

    value = (b & 0x7f) << 7;
    b = this.readByte() & 0xff;

    if (b < 128) return value | b;

    value = (value | (b & 0x7f)) << 7;
    b = this.readByte() & 0xff;

    if (b < 128) return value | b;

    value = (value | (b & 0x7f)) << 8;
    b = this.readByte() & 0xff;

    return value | b;
  }

  readUInt30() {
    if (this.endian === Endian.BIG_ENDIAN) return this.readUInt30BE();
    if (this.endian === Endian.LITTLE_ENDIAN) return this.readUInt30LE();
  }

  readUInt30BE() {
    var ch1 = this.readByte();
    var ch2 = this.readByte();
    var ch3 = this.readByte();
    var ch4 = this.readByte();

    if (ch1 >= 64) return undefined;

    return ch4 | (ch3 << 8) | (ch2 << 16) | (ch1 << 24);
  }

  readUInt30LE() {
    var ch1 = this.readByte();
    var ch2 = this.readByte();
    var ch3 = this.readByte();
    var ch4 = this.readByte();

    if (ch4 >= 64) return undefined;

    return ch1 | (ch2 << 8) | (ch3 << 16) | (ch4 << 24);
  }

  /**
   * @description Reads a multibyte string
   * @param {Number} length
   * @param {String} charset
   * @returns {String}
   */
  readMultiByte(length, charset = "utf8") {
    const position = this._position;
    this._position += length;

    if (encodingExists(charset)) {
      const b = this.buffer.slice(position, this._position);
      const stripBOM =
        (charset === "utf8" || charset === "utf-8") && b.length >= 3 && b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
      const value = decode(b, charset, { stripBOM });

      stripBOM ? (length -= 3) : 0;

      if (Buffer.byteLength(value) !== length) {
        throw new RangeError("End of buffer was encountered.");
      }

      return value;
    } else {
      throw new Error(`Invalid character set: '${charset}'.`);
    }
  }

  stringToXML(str) {
    var xmlDoc;

    if (window.DOMParser) {
      var parser = new DOMParser();
      xmlDoc = parser.parseFromString(str, "text/xml");
    }

    return xmlDoc;
  }

  readXML() {
    var xml = this.readUTFBytes(this.readUInt30());

    return this.stringToXML(xml);
  }

  readStringAMF3() {
    var ref = this.readUInt29();

    if ((ref & 1) == 0)
      // This is a reference
      return this.stringTable[ref >> 1];

    var len = ref >> 1;

    if (0 == len) return "";

    var str = this.readString(len);

    this.stringTable.push(str);

    return str;
  }

  readTraits(ref) {
    var traitInfo = {};
    traitInfo.properties = [];

    if ((ref & 3) == 1) return this.traitTable[ref >> 2];

    traitInfo.externalizable = (ref & 4) == 4;

    traitInfo.dynamic = (ref & 8) == 8;

    traitInfo.count = ref >> 4;
    traitInfo.className = this.readStringAMF3();

    this.traitTable.push(traitInfo);

    for (var i = 0; i < traitInfo.count; i++) {
      var propName = this.readStringAMF3();
      traitInfo.properties.push(propName);
    }

    return traitInfo;
  }

  /**
   * @description Reads an object
   * @returns {Object}
   */
  readObject() {
    if (this._objectEncoding == ObjectEncoding.AMF0) {
      return this.readAMF0Object();
    } else if (this._objectEncoding == ObjectEncoding.AMF3) {
      return this.readAMF3Object();
    }
  }

  readAMF0Object() {
    var marker = this.readByte();

    if (marker == AMF0Types.kNumberType) {
      return this.readDouble();
    } else if (marker == AMF0Types.kBooleanType) {
      return this.readBoolean();
    } else if (marker == AMF0Types.kStringType) {
      return this.readUTF();
    } else if (marker == AMF0Types.kObjectType || marker == AMF0Types.kECMAArrayType) {
      var o = {};

      var ismixed = marker == AMF0Types.kECMAArrayType;

      var size = null;
      if (ismixed) this.readUInt30();

      while (true) {
        var c1 = this.readByte();
        var c2 = this.readByte();
        var name = this.readString((c1 << 8) | c2);
        var k = this.readByte();
        if (k == AMF0Types.kObjectEndType) break;

        this.position--;

        o[name] = this.readObject();
      }

      return o;
    } else if (marker == AMF0Types.kStrictArrayType) {
      var size = this.readInt();

      var a = [];

      for (var i = 0; i < size; ++i) {
        a.push(this.readObject());
      }

      return a;
    } else if (marker == AMF0Types.kTypedObjectType) {
      var o = {};

      var typeName = this.readUTF();

      var propertyName = this.readUTF();
      var type = this.readByte();
      while (type != kObjectEndType) {
        var value = this.readObject();
        o[propertyName] = value;

        propertyName = this.readUTF();
        type = this.readByte();
      }

      return o;
    } else if (marker == AMF0Types.kAvmPlusObjectType) {
      return this.readAMF3Object();
    } else if (marker == AMF0Types.kNullType) {
      return null;
    } else if (marker == AMF0Types.kUndefinedType) {
      return undefined;
    } else if (marker == AMF0Types.kReferenceType) {
      var refNum = this.readUnsignedShort();

      var value = this.objectTable[refNum];

      return value;
    } else if (marker == AMF0Types.kDateType) {
      return this.readDate();
    } else if (marker == AMF0Types.kLongStringType) {
      return this.readUTFBytes(this.readUInt30());
    } else if (marker == AMF0Types.kXMLObjectType) {
      return this.readXML();
    }
  }

  readAMF3Object() {
    var marker = this.readByte();

    if (marker == AMF3Types.kUndefinedType) {
      return undefined;
    } else if (marker == AMF3Types.kNullType) {
      return null;
    } else if (marker == AMF3Types.kFalseType) {
      return false;
    } else if (marker == AMF3Types.kTrueType) {
      return true;
    } else if (marker == AMF3Types.kIntegerType) {
      var i = this.readUInt29();

      return i;
    } else if (marker == AMF3Types.kDoubleType) {
      return this.readDouble();
    } else if (marker == AMF3Types.kStringType) {
      return this.readStringAMF3();
    } else if (marker == AMF3Types.kXMLType) {
      return this.readXML();
    } else if (marker == AMF3Types.kDateType) {
      var ref = this.readUInt29();

      if ((ref & 1) == 0) return this.objectTable[ref >> 1];

      var d = this.readDouble();
      var value = new Date(d);
      this.objectTable.push(value);

      return value;
    } else if (marker == AMF3Types.kArrayType) {
      var ref = this.readUInt29();

      if ((ref & 1) == 0) return this.objectTable[ref >> 1];

      var len = ref >> 1;

      var key = this.readStringAMF3();

      if (key == "") {
        var a = [];

        for (var i = 0; i < len; i++) {
          var value = this.readObject();

          a.push(value);
        }

        return a;
      }

      // mixed array
      var result = {};

      while (key != "") {
        result[key] = this.readObject();
        key = this.readStringAMF3();
      }

      for (var i = 0; i < len; i++) {
        result[i] = this.readObject();
      }

      return result;
    } else if (marker == AMF3Types.kObjectType) {
      var o = {};

      this.objectTable.push(o);

      var ref = this.readUInt29();

      if ((ref & 1) == 0) return this.objectTable[ref >> 1];

      var ti = this.readTraits(ref);
      var className = ti.className;
      var externalizable = ti.externalizable;

      if (externalizable) {
        o = this.readObject();
      } else {
        var len = ti.properties.length;

        for (var i = 0; i < len; i++) {
          var propName = ti.properties[i];

          var value = this.readObject();

          o[propName] = value;
        }

        if (ti.dynamic) {
          for (;;) {
            var name = this.readStringAMF3();
            if (name == null || name.length == 0) break;

            var value = this.readObject();
            o[name] = value;
          }
        }
      }

      return o;
    } else if (marker == AMF3Types.kAvmPlusXmlType) {
      var ref = this.readUInt29();

      if ((ref & 1) == 0) return this.stringToXML(this.objectTable[ref >> 1]);

      var len = ref >> 1;

      if (0 == len) return null;

      var str = this.readString(len);

      var xml = this.stringToXML(str);

      this.objectTable.push(xml);

      return xml;
    } else if (marker == AMF3Types.kByteArrayType) {
      var ref = this.readUInt29();
      if ((ref & 1) == 0) return this.objectTable[ref >> 1];

      var len = ref >> 1;

      var ba = new ByteArray();

      this.objectTable.push(ba);

      for (var i = 0; i < len; i++) {
        ba.writeByte(this.readByte());
      }

      return ba;
    }
  }

  readDate() {
    var time_ms = this.readDouble();
    var tz_min = this.readUnsignedShort();
    return new Date(time_ms + tz_min * 60 * 1000);
  }

  readString(len: number) {
    var str = "";

    while (len > 0) {
      str += String.fromCharCode(this.readUnsignedByte());
      len--;
    }
    return str;
  }

  /**
   * @description Reads a signed short
   * @returns {Number}
   */
  readShort() {
    return this._readBufferFunc("readInt16", 2);
  }

  /**
   * @description Reads an unsigned byte
   * @returns {Number}
   */
  readUnsignedByte() {
    return this.buffer.readUInt8(this._position++);
  }

  /**
   * @description Reads an unsigned int
   * @returns {Number}
   */
  readUnsignedInt() {
    return this._readBufferFunc("readUInt32", 4);
  }

  /**
   * @description Reads an unsigned short
   * @returns {Number}
   */
  readUnsignedShort() {
    return this._readBufferFunc("readUInt16", 2);
  }

  /**
   * @description Reads an unsigned long
   * @returns {BigInt}
   */
  readUnsignedLong() {
    return this._readBufferFunc("readBigUInt64", 8);
  }

  /**
   * @description Reads a UTF-8 string
   * @returns {String}
   */
  readUTF() {
    return this.readMultiByte(this.readUnsignedShort());
  }

  /**
   * @description Reads UTF-8 bytes
   * @param {Number} length
   * @returns {String}
   */
  readUTFBytes(length) {
    return this.readMultiByte(length);
  }

  /**
   * @description Converts the buffer to JSON
   * @returns {Object}
   */
  toJSON() {
    return Object.assign({}, this.buffer.toJSON().data);
  }

  /**
   * @description Converts the buffer to a string
   * @param {String} charset
   * @returns {String}
   */
  toString(charset = "utf8") {
    if (encodingExists(charset)) {
      return decode(this.buffer, charset);
    } else {
      throw new Error(`Invalid character set: '${charset}'.`);
    }
  }

  /**
   * @description Decompresses the buffer
   * @param {String} algorithm
   */
  async uncompress(algorithm = CompressionAlgorithm.ZLIB) {
    if (this.length === 0) {
      return;
    }

    algorithm = algorithm.toLowerCase();

    if (algorithm === CompressionAlgorithm.ZLIB) {
      this.buffer = inflateSync(this.buffer, { level: 9 });
    } else if (algorithm === CompressionAlgorithm.DEFLATE) {
      this.buffer = inflateRawSync(this.buffer);
    } else if (algorithm === CompressionAlgorithm.LZMA) {
      this.buffer = await LZMA.decompress(this.buffer);
    } else {
      throw new Error(`Invalid decompression algorithm: '${algorithm}'.`);
    }

    this._position = 0;
  }

  /**
   * @description Writes a boolean
   * @param {Boolean} value
   */
  writeBoolean(value) {
    this.writeByte(value ? 1 : 0);
  }

  /**
   * @description Writes a signed byte
   * @param {Number} value
   */
  writeByte(value) {
    this._expand(1);
    this.buffer.writeInt8(this.signedOverflow(value, 8), this._position++);
  }

  /**
   * @description Writes multiple signed bytes to a ByteArray
   * @param {ByteArray} bytes
   * @param {Number} offset
   * @param {Number} length
   */
  writeBytes(bytes, offset = 0, length = 0) {
    if (length === 0) {
      length = bytes.length - offset;
    }

    this._expand(length);

    for (let i = 0; i < length; i++) {
      this.buffer[i + this._position] = bytes.buffer[i + offset];
    }

    this._position += length;
  }

  /**
   * @description Writes a double
   * @param {Number} value
   */
  writeDouble(value) {
    this._writeBufferFunc(value, "writeDouble", 8);
  }

  /**
   * @description Writes a float
   * @param {Number} value
   */
  writeFloat(value) {
    this._writeBufferFunc(value, "writeFloat", 4);
  }

  /**
   * @description Writes a signed int
   * @param {Number} value
   */
  writeInt(value) {
    this._writeBufferFunc(this.signedOverflow(value, 32), "writeInt32", 4);
  }

  /**
   * @description Writes a signed long
   * @param {BigInt} value
   */
  writeLong(value) {
    this._writeBufferFunc(value, "writeBigInt64", 8);
  }

  /**
   * @description Writes a multibyte string
   * @param {String} value
   * @param {String} charset
   */
  writeMultiByte(value, charset = "utf8") {
    this._position += Buffer.byteLength(value);

    if (encodingExists(charset)) {
      this.buffer = Buffer.concat([this.buffer, encode(value, charset)]);
    } else {
      throw new Error(`Invalid character set: '${charset}'.`);
    }
  }

  /**
   * @description Writes an object
   * @param {Object} value
   */
  writeObject(value) {
    // Kludge version using old AMF writing libraries. Only AMF3 tested so far.
    switch (this._objectEncoding) {
			case ObjectEncoding.AMF0:
				let AMF_0 = new amf0.Writer()
				this.buffer = Buffer.concat([this.buffer, AMF_0.writeObject(value)])
				break
			case ObjectEncoding.AMF3:
				let AMF_3 = new amf3.Writer()
				AMF_3.writeObject(value)
        const buff = Buffer.from(AMF_3.data)
				this.buffer = Buffer.concat([this.buffer, buff])
        this._position += buff.length;
				break
		}

    // Old implementation, missing AMF0/AMF3 library
    // const bytes = this._objectEncoding === ObjectEncoding.AMF0 ? AMF0.stringify(value) : AMF3.stringify(value);
    // this.buffer = Buffer.concat([this.buffer, Buffer.from(bytes)]);
  }

  /**
   * @description Writes a signed short
   * @param {Number} value
   */
  writeShort(value) {
    this._writeBufferFunc(this.signedOverflow(value, 16), "writeInt16", 2);
  }

  /**
   * @description Writes an unsigned byte
   * @param {Number} value
   */
  writeUnsignedByte(value) {
    this._expand(1);
    this.buffer.writeUInt8(value, this._position++);
  }

  /**
   * @description Writes an unsigned int
   * @param {Number} value
   */
  writeUnsignedInt(value) {
    this._writeBufferFunc(value, "writeUInt32", 4);
  }

  /**
   * @description Writes an unsigned short
   * @param {Number} value
   */
  writeUnsignedShort(value) {
    this._writeBufferFunc(value, "writeUInt16", 2);
  }

  /**
   * @description Writes an unsigned long
   * @param {BigInt} value
   */
  writeUnsignedLong(value) {
    this._writeBufferFunc(value, "writeBigUInt64", 8);
  }

  /**
   * @description Writes a UTF-8 string
   * @param {String} value
   */
  writeUTF(value) {
    this.writeUnsignedShort(Buffer.byteLength(value));
    this.writeMultiByte(value);
  }

  /**
   * @description Writes UTF-8 bytes
   * @param {String} value
   */
  writeUTFBytes(value) {
    this.writeMultiByte(value);
  }
}
