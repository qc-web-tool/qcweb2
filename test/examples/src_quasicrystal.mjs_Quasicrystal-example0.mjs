import testDriver from '@kkitahara/esdoc-examples-test-plugin/src/simple-test-driver.mjs'

import { ExactRealAlgebra as RealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { Quasicrystal, SpaceGroup } from '../../src/index.mjs'
let r = new RealAlgebra()
let l = new LinearAlgebra(r)

// octagonal
let aPar = [
  1, r.$(1, 2, 2), 0, r.$(-1, 2, 2),
  0, r.$(1, 2, 2), 1, r.$(1, 2, 2)]
let aPerp = [
  1, r.$(-1, 2, 2), 0, r.$(1, 2, 2),
  0, r.$(1, 2, 2), -1, r.$(1, 2, 2)]
let qc = new Quasicrystal(r, 4, aPar, aPerp)
testDriver.test(() => { return qc.dim }, 4, 'src/quasicrystal.mjs~Quasicrystal-example0_0', false)
testDriver.test(() => { return qc.dimPar }, 2, 'src/quasicrystal.mjs~Quasicrystal-example0_1', false)
testDriver.test(() => { return qc.dimPerp }, 2, 'src/quasicrystal.mjs~Quasicrystal-example0_2', false)
testDriver.test(() => { return qc.aParCartn.getDim()[0] }, 2, 'src/quasicrystal.mjs~Quasicrystal-example0_3', false)
testDriver.test(() => { return qc.aParCartn.getDim()[1] }, 4, 'src/quasicrystal.mjs~Quasicrystal-example0_4', false)
testDriver.test(() => { return qc.aPerpCartn.getDim()[0] }, 2, 'src/quasicrystal.mjs~Quasicrystal-example0_5', false)
testDriver.test(() => { return qc.aPerpCartn.getDim()[1] }, 4, 'src/quasicrystal.mjs~Quasicrystal-example0_6', false)
testDriver.test(() => { return qc.bParCartn.getDim()[0] }, 4, 'src/quasicrystal.mjs~Quasicrystal-example0_7', false)
testDriver.test(() => { return qc.bParCartn.getDim()[1] }, 2, 'src/quasicrystal.mjs~Quasicrystal-example0_8', false)
testDriver.test(() => { return qc.bPerpCartn.getDim()[0] }, 4, 'src/quasicrystal.mjs~Quasicrystal-example0_9', false)
testDriver.test(() => { return qc.bPerpCartn.getDim()[1] }, 2, 'src/quasicrystal.mjs~Quasicrystal-example0_10', false)

let identity = l.$(
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1).setDim(4, 4)
testDriver.test(() => { return l.eq(l.mmul(qc.bCartn, qc.aCartn), identity) }, true, 'src/quasicrystal.mjs~Quasicrystal-example0_11', false)

testDriver.test(() => { return l.eq(qc.aParCartn, aPar) }, true, 'src/quasicrystal.mjs~Quasicrystal-example0_12', false)
testDriver.test(() => { return l.eq(qc.aPerpCartn, aPerp) }, true, 'src/quasicrystal.mjs~Quasicrystal-example0_13', false)
testDriver.test(() => { return l.eq(qc._originFract, [0, 0, 0, 0]) }, true, 'src/quasicrystal.mjs~Quasicrystal-example0_14', false)
testDriver.test(() => { return l.eq(qc._phasonMatrix, [0, 0, 0, 0]) }, true, 'src/quasicrystal.mjs~Quasicrystal-example0_15', false)

testDriver.test(() => { return r.eq(qc.hyperVolume, 4) }, true, 'src/quasicrystal.mjs~Quasicrystal-example0_16', false)

// P 8 m m
let notrans = [0, 0, 0, 0]
let generators = [
  qc.genSGSymop([
    0, 0, 0, -1,
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0], notrans),
  qc.genSGSymop([
    1, 0, 0, 0,
    0, 0, 0, -1,
    0, 0, -1, 0,
    0, -1, 0, 0], notrans)]
let ssg = qc.genSGFractFromGenerators(generators, 16)
testDriver.test(() => { return ssg instanceof SpaceGroup }, true, 'src/quasicrystal.mjs~Quasicrystal-example0_17', false)
testDriver.test(() => { return ssg.order }, 16, 'src/quasicrystal.mjs~Quasicrystal-example0_18', false)
testDriver.test(() => { return ssg.dim }, 4, 'src/quasicrystal.mjs~Quasicrystal-example0_19', false)
