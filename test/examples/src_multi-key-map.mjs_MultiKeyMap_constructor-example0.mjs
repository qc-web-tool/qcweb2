import testDriver from '@kkitahara/esdoc-examples-test-plugin/src/simple-test-driver.mjs'

import { MultiKeyMap } from '../../src/index.mjs'

let a = new MultiKeyMap()
a.set([1, 2, 3], 1)
a.set([1, null], 2)
a.set([], 3)
a.set([undefined], 4)

testDriver.test(() => { return a.get([1, 2, 3]) }, 1, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_0', false)
testDriver.test(() => { return a.get([1, null]) }, 2, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_1', false)
testDriver.test(() => { return a.get([]) }, 3, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_2', false)
testDriver.test(() => { return a.get([undefined]) }, 4, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_3', false)
testDriver.test(() => { return a.get([1]) }, undefined, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_4', false)

testDriver.test(() => { return a.has([1, 2, 3]) }, true, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_5', false)
testDriver.test(() => { return a.has([1, null]) }, true, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_6', false)
testDriver.test(() => { return a.has([]) }, true, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_7', false)
testDriver.test(() => { return a.has([undefined]) }, true, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_8', false)
testDriver.test(() => { return a.has([1]) }, false, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_9', false)

testDriver.test(() => { return a.delete([1, 2, 3]) }, true, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_10', false)
testDriver.test(() => { return a.delete([1, null]) }, true, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_11', false)
testDriver.test(() => { return a.delete([]) }, true, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_12', false)
testDriver.test(() => { return a.delete([undefined]) }, true, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_13', false)
testDriver.test(() => { return a.delete([1]) }, false, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_14', false)

testDriver.test(() => { return a.has([1, 2, 3]) }, false, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_15', false)
testDriver.test(() => { return a.has([1, null]) }, false, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_16', false)
testDriver.test(() => { return a.has([]) }, false, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_17', false)
testDriver.test(() => { return a.has([undefined]) }, false, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_18', false)
testDriver.test(() => { return a.has([1]) }, false, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_19', false)

a = new MultiKeyMap([
  [[1, 2, 3], 1],
  [[1, null], 2],
  [[], 3],
  [[undefined], 4]
])
testDriver.test(() => { return a.get([1, 2, 3]) }, 1, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_20', false)
testDriver.test(() => { return a.get([1, null]) }, 2, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_21', false)
testDriver.test(() => { return a.get([]) }, 3, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_22', false)
testDriver.test(() => { return a.get([undefined]) }, 4, 'src/multi-key-map.mjs~MultiKeyMap#constructor-example0_23', false)
