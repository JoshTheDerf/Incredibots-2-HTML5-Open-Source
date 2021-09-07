import { ByteArray as ByteArray1 } from "./ByteArray"
import { ByteArray as ByteArray2} from "./vendor/ByteArray/ByteArray"

// Testing duplicating function calls between bytearray libraries to identify bugs.
export class ByteArray {
  constructor(buffer: Buffer | ArrayBuffer | number = 0) {
    const arrays = {
      ba1: new ByteArray1(buffer),
      ba2: new ByteArray2(buffer)
    }
    const master = arrays.ba2

    return new Proxy(this, {
      get(target, key, receiver) {
        if (typeof master[key] !== 'function') return master[key]
        else return function(...args) {
          let result1, result2
          try {
            if (window.logCount || master === arrays.ba1) {
              result1 = arrays.ba1[key](...args)
            }
          } catch (e) {
            // console.error(e)
          }

          try {
            if (window.logCount > 0 || master === arrays.ba2) {
              result2 = arrays.ba2[key](...args)
            }
          } catch (e) {
            // console.error(e)
          }

          window.limitedLog(`KEY: ${key}, RESULT1: ${result1}, RESULT2: ${result2}`)

          if (master === arrays.ba1) return result1
          if (master === arrays.ba2) return result2
        }
      }
    })
  }
}
