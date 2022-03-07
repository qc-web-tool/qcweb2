import testDriver from '@kkitahara/esdoc-examples-test-plugin/src/simple-test-driver.mjs'

import { MultiKeyWeakMap } from '../../src/index.mjs'

let a = new MultiKeyWeakMap()
let b = {}
let c = {}
let d = {}

a.set([b, c], 1)
a.set([c, b], 2)
a.set([b], 3)
a.set([c, b, d], 4)

testDriver.test(() => { return a.get([b, c]) }, 1, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_0', false)
testDriver.test(() => { return a.get([c, b]) }, 2, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_1', false)
testDriver.test(() => { return a.get([b]) }, 3, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_2', false)
testDriver.test(() => { return a.get([c, b, d]) }, 4, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_3', false)
testDriver.test(() => { return a.get([c]) }, undefined, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_4', false)
testDriver.test(() => { return a.get([c, d, b]) }, undefined, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_5', false)

testDriver.test(() => { return a.has([b, c]) }, true, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_6', false)
testDriver.test(() => { return a.has([c, b]) }, true, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_7', false)
testDriver.test(() => { return a.has([b]) }, true, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_8', false)
testDriver.test(() => { return a.has([c, b, d]) }, true, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_9', false)
testDriver.test(() => { return a.has([c]) }, false, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_10', false)
testDriver.test(() => { return a.has([c, d, b]) }, false, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_11', false)

testDriver.test(() => { return a.delete([b]) }, true, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_12', false)
testDriver.test(() => { return a.delete([c, b, d]) }, true, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_13', false)
testDriver.test(() => { return a.delete([c]) }, false, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_14', false)
testDriver.test(() => { return a.delete([c, d, b]) }, false, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_15', false)

testDriver.test(() => { return a.has([b, c]) }, true, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_16', false)
testDriver.test(() => { return a.has([c, b]) }, true, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_17', false)
testDriver.test(() => { return a.has([b]) }, false, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_18', false)
testDriver.test(() => { return a.has([c, b, d]) }, false, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_19', false)
testDriver.test(() => { return a.has([c]) }, false, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_20', false)
testDriver.test(() => { return a.has([c, d, b]) }, false, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_21', false)

a = new MultiKeyWeakMap([
  [[b, c], 1],
  [[c, b], 2],
  [[b], 3],
  [[c, b, d], 4]])
testDriver.test(() => { return a.get([b, c]) }, 1, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_22', false)
testDriver.test(() => { return a.get([c, b]) }, 2, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_23', false)
testDriver.test(() => { return a.get([b]) }, 3, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_24', false)
testDriver.test(() => { return a.get([c, b, d]) }, 4, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_25', false)
testDriver.test(() => { return a.get([c]) }, undefined, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_26', false)
testDriver.test(() => { return a.get([c, d, b]) }, undefined, 'src/multi-key-weak-map.mjs~MultiKeyWeakMap-example0_27', false)
