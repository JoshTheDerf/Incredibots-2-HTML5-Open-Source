////////////////////////////////////////////////////////////////////////////////
//
//  ADOBE SYSTEMS INCORPORATED
//  Copyright 2006-2007 Adobe Systems Incorporated
//  All Rights Reserved.
//
//  NOTICE: Adobe permits you to use, modify, and distribute this file
//  in accordance with the terms of the license agreement accompanying it.
//
////////////////////////////////////////////////////////////////////////////////

import { ByteArray } from "../../General/ByteArray";

/**
 * A utility class to decode a Base64 encoded String to a ByteArray.
 */
export class Base64Decoder
{
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
        this.data = new ByteArray();
    }

	//--------------------------------------------------------------------------
	//
	//  Methods
	//
	//--------------------------------------------------------------------------

    /**
     * Decodes a Base64 encoded String and adds the result to an internal
     * buffer. Subsequent calls to this method add on to the internal
     * buffer. After all data have been encoded, call <code>toByteArray()</code>
     * to obtain a decoded <code>flash.utils.ByteArray</code>.
     *
     * @param encoded The Base64 encoded String to decode.
     */
    public decode(encoded:string):void
    {
        for (var i:number = 0; i < encoded.length; ++i)
        {
            var c:number = encoded.charCodeAt(i);

            if (c == Base64Decoder.ESCAPE_CHAR_CODE)
                this.work[this.count++] = -1;
            else if (Base64Decoder.inverse[c] != 64)
                this.work[this.count++] = Base64Decoder.inverse[c];
            else
                continue;

            if (this.count == 4)
            {
                this.count = 0;
                this.data.writeByte((this.work[0] << 2) | ((this.work[1] & 0xFF) >> 4));
                this.filled++;

                if (this.work[2] == -1)
                    break;

                this.data.writeByte((this.work[1] << 4) | ((this.work[2] & 0xFF) >> 2));
                this.filled++;

                if (this.work[3] == -1)
                    break;

                this.data.writeByte((this.work[2] << 6) | this.work[3]);
                this.filled++;
            }
        }
    }

    /**
     * @private
     */
    public drain():ByteArray
    {
        var result:ByteArray = new ByteArray();
        Base64Decoder.copyByteArray(this.data, result, this.filled);
        this.filled = 0;
        return result;
    }

    /**
     * @private
     */
    public flush():ByteArray
    {
        if (this.count > 0)
        {
            throw new Error("Base64 decoder: Partial block dropped");
        }
        return this.drain();
    }

    /**
     * Clears all buffers and resets the decoder to its initial state.
     */
    public reset():void
    {
        this.data = new ByteArray();
        this.count = 0;
        this.filled = 0;
    }

    /**
     * Returns the current buffer as a decoded <code>flash.utils.ByteArray</code>.
     * Note that calling this method also clears the buffer and resets the
     * decoder to its initial state.
     *
     * @return The decoded <code>flash.utils.ByteArray</code>.
     */
    public toByteArray():ByteArray
    {
        var result:ByteArray = this.flush();
        this.reset();
        return result;
    }

	//--------------------------------------------------------------------------
	//
	//  Private Methods
	//
	//--------------------------------------------------------------------------

    private static copyByteArray(source:ByteArray, destination:ByteArray, length:number = 0):void
    {
        var oldPosition:number = source.position;

        source.position = 0;
        destination.position = 0;
        var i:number = 0;


        while (source.bytesAvailable > 0 && i < length)
        {
            destination.writeByte(source.readByte());
            i++;
        }


        source.position = oldPosition;
        destination.position = 0;
    }

	//--------------------------------------------------------------------------
	//
	//  Private Variables
	//
	//--------------------------------------------------------------------------

    private count:number = 0;
    private data:ByteArray;
    private filled:number = 0;
    private work:Array<any> = [0, 0, 0, 0];

    private static ESCAPE_CHAR_CODE:number = 61; // The '=' char

    private static inverse:Array<any> =
    [
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 62, 64, 64, 64, 63,
        52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 64, 64, 64, 64, 64, 64,
        64, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
        15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 64, 64, 64, 64, 64,
        64, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64,
        64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64, 64
    ];
}
