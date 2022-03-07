import testDriver from '@kkitahara/esdoc-examples-test-plugin/src/simple-test-driver.mjs'

import { SpaceGroup, SpaceGroupSymop, InvalidValue }
  from '../../src/index.mjs'

// non symop paramter
let g = new SpaceGroupSymop(
  [1, 0, 0, 1], [0, 0])
testDriver.test(() => { return new SpaceGroup([null]) instanceof InvalidValue }, true, 'src/space-group.mjs~SpaceGroup#constructor-example0_0', false)
testDriver.test(() => { return new SpaceGroup([g, null]) instanceof InvalidValue }, true, 'src/space-group.mjs~SpaceGroup#constructor-example0_1', false)

// inconsistent dim
let g2 = new SpaceGroupSymop(
  [1], [0])
testDriver.test(() => { return new SpaceGroup([g, g2]) instanceof InvalidValue }, true, 'src/space-group.mjs~SpaceGroup#constructor-example0_2', false)
