import testDriver from '@kkitahara/esdoc-examples-test-plugin/src/simple-test-driver.mjs'

import { ExactRealAlgebra as RealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { SpaceGroupSymop } from '../../src/index.mjs'
let r = new RealAlgebra()
let l = new LinearAlgebra(r)

let rot = [0, 1, 1, 0]
let trans = [0, 0]
let g = new SpaceGroupSymop(rot, trans, l)
let g2 = g.copy(l)
testDriver.test(() => { return g.rot === g2.rot }, false, 'src/space-group-symop.mjs~SpaceGroupSymop#copy-example0_0', false)
testDriver.test(() => { return g.trans === g2.trans }, false, 'src/space-group-symop.mjs~SpaceGroupSymop#copy-example0_1', false)
testDriver.test(() => { return g.rot[0] === g2.rot[0] }, false, 'src/space-group-symop.mjs~SpaceGroupSymop#copy-example0_2', false)
testDriver.test(() => { return g.trans[0] === g2.trans[0] }, false, 'src/space-group-symop.mjs~SpaceGroupSymop#copy-example0_3', false)
testDriver.test(() => { return l.eq(g.rot, g2.rot) }, true, 'src/space-group-symop.mjs~SpaceGroupSymop#copy-example0_4', false)
testDriver.test(() => { return l.eq(g.trans, g2.trans) }, true, 'src/space-group-symop.mjs~SpaceGroupSymop#copy-example0_5', false)
