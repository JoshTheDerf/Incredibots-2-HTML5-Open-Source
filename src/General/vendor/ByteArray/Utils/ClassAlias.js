/* This is a small class for class definitions and that kind of mumbo jumbo. */
"use strict"

class ClassAlias {
	constructor () {
		this._aliasToClass = []
		this._classToAlias = []
		this._definitionCache = []
		this._global = []
	}
	getClassNameByAlias (aliasName) {
		if (aliasName == null) {
			throw new Error("Alias::getClassNameByAlias - Error: Null argument")
		}
		return this._aliasToClass[aliasName]
	}
	getAliasByClassName (className) {
		if (className == null) {
			throw new Error("Alias::getAliasByClassName - Error: Null argument")
		}
		return this._classToAlias[className]
	}
	registerClassAlias (aliasName, classObject) {
		if (aliasName == null || classObject == 0) {
			throw new Error("Alias::registerClassAlias - Error: Null argument(s)")
		}
		let className = this.getQualifiedClassName(classObject)
		this._aliasToClass[aliasName] = className
		this._classToAlias[className] = aliasName
	}
	getQualifiedClassName (value) {
		if (value == null) {
			throw new Error("Alias::getQualifiedClassName - Error: Null argument")
		}
		let type = typeof value == "function" ? value : value.constructor
		return typeof type["$class"] == "object" ? (type["$class"]["fullClassName"]).replace(/\.([^\.]+$)/, "::$1") : String(type)
	}
	describeType (value) {
		if (value == null) {
			throw new Error("Alias::describeType - Error: Null argument")
		}
		let type = typeof value == "function" ? value : value.constructor
		let len = 0
		let methods = {
			length: function () {
				return len
			}
		}
		if (type && type.prototype) {
			for (let p in type.prototype) {
				if (p.match(/^[a-zA-Z_]/) && !this.isGetterOrSetter(type.prototype, p) && typeof type.prototype[p] == "function") {
					methods[len++] = p
				}
			}
		}
		return {
			attribute: function (attr) { if (attr == "name") return this.getQualifiedClassName(value)},
			method: { "@name": methods}
		}
	}
	getDefinitionByName (name) {
		if (!name) {
			return null
		}
		let definition = this._definitionCache[name]
		if (definition) {
			return definition
		}
		let paths = name.split(".")
		let length = paths.length
		definition = this._global
		for (let i = 0; i < length; i++) {
			let path = paths[i]
			definition = definition[path]
			if (!definition) {
				return null
			}
		}
		this._definitionCache[name] = definition
		return definition
	}
	getQualifiedSuperclassName (value) {
		if (value == null) {
			throw new Error("Alias::getQualifiedSuperclassName - Error: Null argument")
		}
		if (typeof value === "function") {
			return this.getQualifiedClassName(value.prototype)
		}
		if (typeof value !== "object") { // Flash returns "Object" for all primitives
			return "Object"
		}
		return this.getQualifiedClassName(getPrototypeOf(value)) // Use the prototype as superclass
	}
	isGetterOrSetter (object, propertyName) {
		if (typeof Object.prototype.__lookupGetter__ != "function") {
			return false
		}
		return object.__lookupGetter__(propertyName) || object.__lookupSetter__(propertyName)
	}
}

export default ClassAlias
