package General
{
	import flash.utils.ByteArray;
	
	public class LZW
	{
		public static function compress(str:ByteArray):ByteArray
		{
			str.position = 0;
			var dico:Array = new Array();
			for (var i:int = 0; i < 256; i++)
			{
				dico[String.fromCharCode(i)] = i;
			}
			var res:ByteArray = new ByteArray();
			var len:Number = str.length;
			var nbChar:Number = 256;
			var buffer:String = "";
			for (i = 0; i < len; i++)
			{
				var current:String = str.readUTFBytes(1);
				if (dico[buffer + current] !== undefined)
				{
					buffer += current;
				}
				else
				{
					res.writeUTFBytes(String.fromCharCode(dico[buffer]));
					dico[buffer + current] = nbChar;
					nbChar++;
					buffer = current;
				}
			}
			return res;
		}
		public static function decompress(str:ByteArray):ByteArray
		{
			var dico:Array = new Array();
			for (var i:int = 0; i < 256; i++)
			{
				var c:String = String.fromCharCode(i);
				dico[i] = c;
			}
			var length:Number = str.length;
			var nbChar:Number = 256;
			var buffer:String = "";
			var chaine:String = "";
			var result:ByteArray = new ByteArray();
			for (i = 0; i < length; i++)
			{
				var code:Number = str.readUTFBytes(1).charCodeAt(0);
				var current:String = dico[code];
				if (buffer == "")
				{
					buffer = current;
					result.writeUTFBytes(current);
				}
				else
				{
					if (code <= 255)
					{
						result.writeUTFBytes(current);
						chaine = buffer + current;
						dico[nbChar] = chaine;
						nbChar++;
						buffer = current;
					}
					else
					{
						chaine = dico[code];
						if (chaine == undefined) chaine = buffer + buffer.slice(0,1);
						result.writeUTFBytes(chaine);
						dico[nbChar] = buffer + chaine.slice(0, 1);
						nbChar++;
						buffer = chaine;
						
					}
				}
			}
			return result;
		}
	}
}