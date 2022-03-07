import testDriver from '@kkitahara/esdoc-examples-test-plugin/src/simple-test-driver.mjs'

import { ExactRealAlgebra as RealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { Quasicrystal } from '../../src/index.mjs'
let r = new RealAlgebra()
let l = new LinearAlgebra(r)
let half = r.$(1, 2)

// cubic
let qc = new Quasicrystal(r, 3,
  [1, 0, 0, 0, 1, 0, 0, 0, 1], [])
testDriver.test(() => { return qc.dim }, 3, 'src/quasicrystal.mjs~Quasicrystal-example2_0', false)
testDriver.test(() => { return qc.dimPar }, 3, 'src/quasicrystal.mjs~Quasicrystal-example2_1', false)
testDriver.test(() => { return qc.dimPerp }, 0, 'src/quasicrystal.mjs~Quasicrystal-example2_2', false)

// I 2 1 3
let generators = [
  qc.genSGSymop([1, 0, 0, 0, 1, 0, 0, 0, 1], [half, half, half]),
  qc.genSGSymop([0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, 0]),
  qc.genSGSymop([-1, 0, 0, 0, -1, 0, 0, 0, 1], [half, 0, half]),
  qc.genSGSymop([-1, 0, 0, 0, 1, 0, 0, 0, -1], [0, half, half])]
let sg = qc.genSGFractFromGenerators(generators, 24)
testDriver.test(() => { return sg.order }, 24, 'src/quasicrystal.mjs~Quasicrystal-example2_3', false)

let sg2 = sg.copy(l)
testDriver.test(() => { return sg2 !== sg }, true, 'src/quasicrystal.mjs~Quasicrystal-example2_4', false)
testDriver.test(() => { return sg2.order === sg.order }, true, 'src/quasicrystal.mjs~Quasicrystal-example2_5', false)
testDriver.test(() => { return sg2.dim === sg.dim }, true, 'src/quasicrystal.mjs~Quasicrystal-example2_6', false)
testDriver.test(() => { return sg2.symop[0] !== sg.symop[0] }, true, 'src/quasicrystal.mjs~Quasicrystal-example2_7', false)
testDriver.test(() => { return l.eq(sg2.symop[0].rot, sg.symop[0].rot) }, true, 'src/quasicrystal.mjs~Quasicrystal-example2_8', false)

qc.setSSGFractNoPhason(sg)

let transSymopIds = qc.ssgNoPhasonTransSymopId
testDriver.test(() => { return transSymopIds.length }, 8, 'src/quasicrystal.mjs~Quasicrystal-example2_9', false)

// to cover 'cached' branch
transSymopIds = qc.ssgNoPhasonTransSymopId
