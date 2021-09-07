<p align="center">
<img src="https://i.imgur.com/YNA8qWm.png" alt="ByteArray.js GFX"/>
</p>

<h1 align="center">
ByteArray.js
</h1>

<p align="center">
<a href="https://travis-ci.org/Zaseth/ByteArray.js"><img src="https://travis-ci.org/Zaseth/ByteArray.js.svg?branch=master" alt="ByteArray.js build"></a>
<a href="https://npm-stat.com/charts.html?package=bytearray.js"><img src="https://img.shields.io/npm/dy/bytearray.js.svg" alt="ByteAray.js downloads"></a>
<a href="https://www.npmjs.com/package/bytearray.js"><img src="https://img.shields.io/npm/v/bytearray.js.svg" alt="ByteAray.js npm"></a>
</p>

<p align="center">
<b>npm install bytearray.js</b><br>
<b>bower install bytearray.js</b>
</p>

<p align="left">
<h4>Introduction</h4>
ByteArray.js is an implementation of Actionscript 3's ByteArray, but then in pure Javascript. This library supports most of it's features from Actionscript 3. A small goal is to make Actionscript 3 developers switch to a newer platform by supporting a key library. The default length of the buffer is 4096 bytes, but if you want to use more, go ahead, you're a rebel.
</p><hr>

<p align="left">
<h4>AMF (Action Message Format from Adobe)</h4>
ByteArray.js provides support for both AMF0 and AMF3. It can serialize and deserialize your data. The data gets shared with the ByteArray byte stream, allowing you to directly do stuff with it by just calling the constructor for ByteArray, how handy.
</p>

<p align="left">
<h4>Decimal values</h4>
This library also supports IEEE 754 values in case you ever need to make something float.
</p>

<p align="left">
<h4>Compression and decompression</h4>
ByteArray.js got you covered! If you want to compress some data, you can also use this library. The supported compression types are: DEFLATE, LZMA and ZLIB.
</p>

<p align="left">
<h4>Variable-length quantity integers</h4>
Now this isn't part of Actionscript 3's ByteArray, but it's still useful in case you ever need it. The supported types are: int32 and uint32.
</p>

<p align="left">
<h4>But... DataView?</h4>
This is the part where some hacky stuff comes in. We can actually read data from ByteArray's byte stream with DataView. Take a look in <b>/Examples/test.js</b> on how to use it.
</p>

<p align="left">
<h4>But... minified?</h4>
There is a minifed part, but minified means that some functions are cut out, but don't worry! The minified version supports all of the mayor functions. You can find the minified version under the name <b>ByteArrayHP.js</b>
</p>

<p align="left">
<h4>Documentation</h4>
ByteArray.js has JSDOC. If you know what AMF is, you should know the documentation already, if you don't, you can find that by Adobe. In short terms: discover it's files and you'll discover the documentation, simple right?
</p>

<p align="left">
<h4>Examples</h4>
I have included a very simple file that basically shows you what to do. You can find it all in <b>/Examples/test.js</b>. This includes AMF tests, as well as compression tests.
</p>
