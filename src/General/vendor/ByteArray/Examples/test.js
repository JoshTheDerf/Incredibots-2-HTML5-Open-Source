const tape = require("tape")
const fs = require("fs")
const ByteArray = require("../ByteArray")

tape("Write using Buffer and read using DataView", (v) => {
	const wba = new ByteArray()
	wba.writeByte(13)
	const rba = new ByteArray(wba.buffer, true)
	v.equal(rba.buffer.getInt8(0), 13)
	v.end()
})

tape("Write/read a byte", (v) => {
	const wba = new ByteArray()
	wba.writeByte(5)
	const rba = new ByteArray(wba)
	v.equal(rba.readByte(), 5)
	v.end()
})

tape("Write/read a boolean", (v) => {
	const wba = new ByteArray()
	wba.writeBoolean(true)
	const rba = new ByteArray(wba)
	v.equal(rba.readBoolean(), true)
	v.end()
})

tape("Write/read a byte without new constructor", (v) => {
	const wba = new ByteArray()
	wba.writeByte(10)
	wba.position = 0
	v.equal(wba.readByte(), 10)
	v.end()
})

tape("Write/read a string", (v) => {
	const wba = new ByteArray()
	wba.writeUTF("ByteArray.js")
	const rba = new ByteArray(wba)
	v.equal(rba.readUTF(), "ByteArray.js")
	v.end()
})

tape("Write/read an AMF0 object", (v) => {
	const wba = new ByteArray()
	wba.objectEncoding = 0
	wba.writeObject({ id: 1 })
	v.deepEqual(wba.readObject(), { len: 17, value: { id: 1 } })
	v.end()
})

tape("Write/read an AMF3 object", (v) => {
	const wba = new ByteArray()
	wba.objectEncoding = 3
	wba.writeObject({ id: 1 })
	v.deepEqual(wba.readObject(), { id: 1 })
	v.end()
})

tape("Write/read IEEE754 double", (v) => {
	const wba = new ByteArray()
	wba.writeDouble(1.23)
	const rba = new ByteArray(wba)
	v.equal(rba.readDouble(), 1.23)
	v.end()
})

tape("Write/read IEEE754 float", (v) => {
	const wba = new ByteArray()
	wba.writeFloat(55.12)
	const rba = new ByteArray(wba)
	v.equal(rba.readFloat(), 55.119998931884766)
	v.end()
})

tape("Write/read multiByte", (v) => {
	const wba = new ByteArray()
	wba.writeMultiByte("Hello ByteArray.js", "utf8")
	wba.position = 0
	v.equal(wba.readMultiByte(18, "utf8"), "Hello ByteArray.js")
	v.end()
})

tape("Write/read int8array", (v) => {
	const wba = new ByteArray()
	wba.writeByteArray([1, 2, 3, 4, 5, 6])
	wba.position = 0
	v.deepEqual(wba.readByteArray(6), [1, 2, 3, 4, 5, 6])
	v.end()
})

tape("Write/read int64", (v) => {
	const wba = new ByteArray()
	wba.writeLong(64)
	wba.position = 0
	v.equal(wba.readLong(), 64)
	v.end()
})

tape("Write/read var-integer", (v) => {
	const wba = new ByteArray()
	wba.writeVarInt(300)
	wba.position = 0
	v.equal(wba.readVarInt(), 44)
	v.end()
})

tape("bytesAvailable", (v) => {
	const wba = new ByteArray()
	v.equal(wba.bytesAvailable, 4096)
	v.end()
})

tape("Compress/decompress a string", (v) => {
	const wba = new ByteArray()
	wba.writeUTF("Hello ByteArray.js!")
	wba.compress("zlib")
	wba.position = 0
	fs.readFile("test.secret", wba.uncompress("zlib"), (err, data) => {
		if (err) throw err
		v.equal(wba.readUTF(), "Hello ByteArray.js!")
	})
	v.end()
})

tape("Decode AMF0 file", (v) => {
	const wba = new ByteArray()
	fs.readFile("test.amf0", (err, data) => {
		if (err) throw err
		wba.buffer = data
		wba.objectEncoding = 0
		v.deepEqual(wba.readObject(), { len: 56, value: { id: 1, username: "Zaseth", password: "Test123" } })
	})
	v.end()
})

tape("Decode AMF3 file", (v) => {
	const wba = new ByteArray()
	fs.readFile("test.amf3", (err, data) => {
		if (err) throw err
		wba.buffer = data
		wba.objectEncoding = 3
		v.deepEqual(wba.readObject(), { id: 1 })
	})
	v.end()
})

tape("Adobe's example", (v) => {
	const wba = new ByteArray()
	const date = new Date().getTime()
	wba.writeBoolean(false)
	wba.writeDouble(Math.PI)
	wba.writeUTFBytes("Hello world")
	wba.position = 0
	v.equal(wba.readBoolean() == false, true)
	v.equal(wba.readDouble(), 3.141592653589793)
	v.equal(wba.readUTFBytes(11), "Hello world")
	v.end()
})