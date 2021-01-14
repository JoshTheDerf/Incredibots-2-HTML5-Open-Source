////////////////////////////////////////////////////////////////////////////////
//
//  ADOBE SYSTEMS INCORPORATED
//  Copyright 2004-2007 Adobe Systems Incorporated
//  All Rights Reserved.
//
//  NOTICE: Adobe permits you to use, modify, and distribute this file
//  in accordance with the terms of the license agreement accompanying it.
//
////////////////////////////////////////////////////////////////////////////////

import { ByteArray } from "../../General/ByteArray";

/**
 * A utility class to encode a String or ByteArray as a Base64 encoded String.
 */
export class Base64Encoder
{
	//--------------------------------------------------------------------------
	//
	//  Static Class Variables
	//
	//--------------------------------------------------------------------------

    public static CHARSET_UTF_8:string = "UTF-8";

    /**
     * The character codepoint to be inserted into the encoded output to
     * denote a new line if <code>insertNewLines</code> is true.
     *
     * The default is <code>10</code> to represent the line feed <code>\n</code>.
     */
    public static newLine:number = 10;

	//--------------------------------------------------------------------------
	//
	//  Constructor
	//
	//--------------------------------------------------------------------------

    /**
     * Constructor.
     */
    constructor()
    {
        this.reset();
    }

	//--------------------------------------------------------------------------
	//
	//  Variables
	//
	//--------------------------------------------------------------------------

    /**
     * A Boolean flag to control whether the sequence of characters specified
     * for <code>Base64Encoder.newLine</code> are inserted every 76 characters
     * to wrap the encoded output.
     *
     * The default is true.
     */
    public insertNewLines:Boolean = true;

	//--------------------------------------------------------------------------
	//
	//  Public Methods
	//
	//--------------------------------------------------------------------------

    /**
     * @private
     */
    public drain():string
    {
        var result:string = "";

        for (var i:number = 0; i < this._buffers.length; i++)
        {
            var buffer:Array<any> = this._buffers[i] as Array<any>;
            result += String.fromCharCode.apply(null, buffer);
        }

        this._buffers = [];
        this._buffers.push([]);

        return result;
    }

    /**
     * Encodes the characters of a String in Base64 and adds the result to
     * an internal buffer. Subsequent calls to this method add on to the
     * internal buffer. After all data have been encoded, call
     * <code>toString()</code> to obtain a Base64 encoded String.
     *
     * @param data The String to encode.
     * @param offset The character position from which to start encoding.
     * @param length The number of characters to encode from the offset.
     */
    public encode(data:string, offset:number=0, length:number=0):void
    {
        if (length == 0)
            length = data.length;

        var currentIndex:number = offset;

        var endIndex:number = offset + length;
        if (endIndex > data.length)
            endIndex = data.length;

        while (currentIndex < endIndex)
        {
            this._work[this._count] = data.charCodeAt(currentIndex);
            this._count++;

            if (this._count == this._work.length || endIndex - currentIndex == 1)
            {
                this.encodeBlock();
                this._count = 0;
                this._work[0] = 0;
                this._work[1] = 0;
                this._work[2] = 0;
            }
            currentIndex++;
        }
    }

    /**
     * Encodes the UTF-8 bytes of a String in Base64 and adds the result to an
     * internal buffer. The UTF-8 information does not contain a length prefix.
     * Subsequent calls to this method add on to the internal buffer. After all
     * data have been encoded, call <code>toString()</code> to obtain a Base64
     * encoded String.
     *
     * @param data The String to encode.
     */
    public encodeUTFBytes(data:string):void
    {
        var bytes:ByteArray = new ByteArray();
        bytes.writeUTFBytes(data);
        bytes.position = 0;
        this.encodeBytes(bytes);
    }

    /**
     * Encodes a ByteArray in Base64 and adds the result to an internal buffer.
     * Subsequent calls to this method add on to the internal buffer. After all
     * data have been encoded, call <code>toString()</code> to obtain a
     * Base64 encoded String.
     *
     * @param data The ByteArray to encode.
     * @param offset The index from which to start encoding.
     * @param length The number of bytes to encode from the offset.
     */
    public encodeBytes(data:ByteArray, offset:number=0, length:number=0):void
    {
        if (length == 0)
            length = data.length;

        var oldPosition:number = data.position;
        data.position = offset;
        var currentIndex:number = offset;

        var endIndex:number = offset + length;
        if (endIndex > data.length)
            endIndex = data.length;

        while (currentIndex < endIndex)
        {
            this._work[this._count] = data.buffer[currentIndex];
            this._count++;

            if (this._count == this._work.length || endIndex - currentIndex == 1)
            {
                this.encodeBlock();
                this._count = 0;
                this._work[0] = 0;
                this._work[1] = 0;
                this._work[2] = 0;
            }
            currentIndex++;
        }

        data.position = oldPosition;
    }

    /**
     * @private
     */
    public flush():string
    {
        if (this._count > 0)
            this.encodeBlock();

        var result:string = this.drain();
        this.reset();
        return result;
    }

    /**
     * Clears all buffers and resets the encoder to its initial state.
     */
    public reset():void
    {
        this._buffers = [];
        this._buffers.push([]);
        this._count = 0;
        this._line = 0;
        this._work[0] = 0;
        this._work[1] = 0;
        this._work[2] = 0;
    }

    /**
     * Returns the current buffer as a Base64 encoded String. Note that
     * calling this method also clears the buffer and resets the
     * encoder to its initial state.
     *
     * @return The Base64 encoded String.
     */
    public toString():string
    {
        return this.flush();
    }

	//--------------------------------------------------------------------------
	//
	//  Private Methods
	//
	//--------------------------------------------------------------------------

    /**
     * @private
     */
    private encodeBlock():void
    {
        var currentBuffer:Array<any> = this._buffers[this._buffers.length - 1] as Array<any>;
        if (currentBuffer.length >= Base64Encoder.MAX_BUFFER_SIZE)
        {
            currentBuffer = [];
            this._buffers.push(currentBuffer);
        }

        currentBuffer.push(Base64Encoder.ALPHABET_CHAR_CODES[(this._work[0] & 0xFF) >> 2]);
        currentBuffer.push(Base64Encoder.ALPHABET_CHAR_CODES[((this._work[0] & 0x03) << 4) | ((this._work[1] & 0xF0) >> 4)]);

        if (this._count > 1)
            currentBuffer.push(Base64Encoder.ALPHABET_CHAR_CODES[((this._work[1] & 0x0F) << 2) | ((this._work[2] & 0xC0) >> 6) ]);
        else
            currentBuffer.push(Base64Encoder.ESCAPE_CHAR_CODE);

        if (this._count > 2)
            currentBuffer.push(Base64Encoder.ALPHABET_CHAR_CODES[this._work[2] & 0x3F]);
        else
            currentBuffer.push(Base64Encoder.ESCAPE_CHAR_CODE);

        if (this.insertNewLines)
        {
            if ((this._line += 4) == 76)
            {
                currentBuffer.push(Base64Encoder.newLine);
                this._line = 0;
            }
        }
    }

	//--------------------------------------------------------------------------
	//
	//  Private Variables
	//
	//--------------------------------------------------------------------------

    /**
     * An Array of buffer Arrays.
     */
    private _buffers:Array<any> = [];
    private _count:number;
    private _line:number;
    private _work:Array<any> = [ 0, 0, 0 ];

    /**
     * This value represents a safe number of characters (i.e. arguments) that
     * can be passed to String.fromCharCode.apply() without exceeding the AVM+
     * stack limit.
     *
     * @private
     */
    public static MAX_BUFFER_SIZE:number = 32767;

    private static ESCAPE_CHAR_CODE:number = 61; // The '=' char

    /*
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
        'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
        'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
        'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
        'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
        'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
        'w', 'x', 'y', 'z', '0', '1', '2', '3',
        '4', '5', '6', '7', '8', '9', '+', '/'
    */
    private static ALPHABET_CHAR_CODES:Array<any> =
    [
        65,   66,  67,  68,  69,  70,  71,  72,
        73,   74,  75,  76,  77,  78,  79,  80,
        81,   82,  83,  84,  85,  86,  87,  88,
        89,   90,  97,  98,  99, 100, 101, 102,
        103, 104, 105, 106, 107, 108, 109, 110,
        111, 112, 113, 114, 115, 116, 117, 118,
        119, 120, 121, 122,  48,  49,  50,  51,
        52,   53,  54,  55,  56,  57,  43,  47
    ];
}
