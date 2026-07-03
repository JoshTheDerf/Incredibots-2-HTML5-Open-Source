// Box2D.Common.b2internal — in the original ActionScript this was an AS3
// `namespace b2internal = "http://www.box2d.org/ns/b2internal"` used to mark
// engine-internal members that are still accessible cross-class within the
// package. TypeScript has no namespace-scoped access modifier, so throughout
// this port those members are simply emitted as plain public members and the
// `use namespace b2internal` / `b2internal::member` qualifiers are dropped.
//
// This file exists only to mirror the source tree 1:1. There is nothing to
// export; it is intentionally not re-exported from index.ts.
export {}
