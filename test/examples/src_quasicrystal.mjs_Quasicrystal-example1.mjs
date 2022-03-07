import testDriver from '@kkitahara/esdoc-examples-test-plugin/src/simple-test-driver.mjs'

import { RealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { Quasicrystal, SpaceGroup } from '../../src/index.mjs'
let r = new RealAlgebra(1e-10)
let l = new LinearAlgebra(r)

// face-centred icosahedral (primitive cell)
let a = r.$(1)
let t = r.iadd(r.$(1, 2), r.$(1, 2, 5))
let t2 = r.mul(t, t)
let tinv = r.div(1, t)
let twot = r.mul(2, t)
let aPar = l.smul([
  t2, 1, t, 0, twot, 0,
  t, t2, 1, 0, 0, twot,
  1, t, t2, twot, 0, 0], a)
let aPerp = l.smul([
  tinv, t, -1, 0, -2, 0,
  -1, tinv, t, 0, 0, -2,
  t, -1, tinv, -2, 0, 0], a)
let qc = new Quasicrystal(r, 6, aPar, aPerp)
testDriver.test(() => { return qc instanceof Quasicrystal }, true, 'src/quasicrystal.mjs~Quasicrystal-example1_0', false)
testDriver.test(() => { return qc.dim }, 6, 'src/quasicrystal.mjs~Quasicrystal-example1_1', false)
testDriver.test(() => { return qc.dimPar }, 3, 'src/quasicrystal.mjs~Quasicrystal-example1_2', false)
testDriver.test(() => { return qc.dimPerp }, 3, 'src/quasicrystal.mjs~Quasicrystal-example1_3', false)

let identity = l.$(
  1, 0, 0, 0, 0, 0,
  0, 1, 0, 0, 0, 0,
  0, 0, 1, 0, 0, 0,
  0, 0, 0, 1, 0, 0,
  0, 0, 0, 0, 1, 0,
  0, 0, 0, 0, 0, 1).setDim(6, 6)

testDriver.test(() => { return l.eq(l.mmul(qc.bCartn, qc.aCartn), identity) }, true, 'src/quasicrystal.mjs~Quasicrystal-example1_4', false)

// Fm-3-5
let generators = [
  qc.genSGSymop([
    1, 0, 0, 0, 1, 1,
    -1, 0, 0, 0, 0, 0,
    0, 1, 0, 1, -1, 0,
    1, 0, 1, 0, 1, 0,
    0, 0, 0, -1, 0, 0,
    0, 0, 0, 0, -1, 0], [0, 0, 0, 0, 0, 0]),
  qc.genSGSymop([
    0, 1, 0, 0, 0, 0,
    0, 0, 1, 0, 0, 0,
    1, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 1, 0,
    0, 0, 0, 0, 0, 1,
    0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0]),
  qc.genSGSymop([
    -1, 0, 0, 0, 0, 0,
    0, -1, 0, 0, 0, 0,
    0, 0, -1, 0, 0, 0,
    0, 0, 0, -1, 0, 0,
    0, 0, 0, 0, -1, 0,
    0, 0, 0, 0, 0, -1], [0, 0, 0, 0, 0, 0], l)]
let sg = qc.genSGFractFromGenerators(generators)
testDriver.test(() => { return sg instanceof SpaceGroup }, true, 'src/quasicrystal.mjs~Quasicrystal-example1_5', false)
testDriver.test(() => { return sg.order }, 120, 'src/quasicrystal.mjs~Quasicrystal-example1_6', false)
testDriver.test(() => { return sg.dim }, 6, 'src/quasicrystal.mjs~Quasicrystal-example1_7', false)
qc.setSSGFractNoPhason(sg)

// cubic phason strain
qc.setPhasonMatrix([
  1, 0, 0,
  0, 1, 0,
  0, 0, 1])

testDriver.test(() => { return l.eq(l.mmul(qc.bCartn, qc.aCartn), identity) }, true, 'src/quasicrystal.mjs~Quasicrystal-example1_8', false)

let ssgSymopId = qc.ssgSymopId
testDriver.test(() => { return ssgSymopId.length }, 24, 'src/quasicrystal.mjs~Quasicrystal-example1_9', false)

// to cover 'cached` branch
ssgSymopId = qc.ssgSymopId
testDriver.test(() => { return ssgSymopId.length }, 24, 'src/quasicrystal.mjs~Quasicrystal-example1_10', false)

let ssgRightCosetsSymopId = qc.ssgRightCosetsSymopId
testDriver.test(() => { return ssgRightCosetsSymopId.length }, 5, 'src/quasicrystal.mjs~Quasicrystal-example1_11', false)

// to cover 'cached` branch
ssgRightCosetsSymopId = qc.ssgRightCosetsSymopId
testDriver.test(() => { return ssgRightCosetsSymopId.length }, 5, 'src/quasicrystal.mjs~Quasicrystal-example1_12', false)

// rhombohedral phason strain
qc.setPhasonMatrix([
  0, 0, r.$(1, 2),
  r.$(1, 2), 0, 0,
  0, r.$(1, 2), 0])

ssgSymopId = qc.ssgSymopId
testDriver.test(() => { return ssgSymopId.length }, 6, 'src/quasicrystal.mjs~Quasicrystal-example1_13', false)

// to cover 'cached` branch
ssgSymopId = qc.ssgSymopId
testDriver.test(() => { return ssgSymopId.length }, 6, 'src/quasicrystal.mjs~Quasicrystal-example1_14', false)

ssgRightCosetsSymopId = qc.ssgRightCosetsSymopId
testDriver.test(() => { return ssgRightCosetsSymopId.length }, 20, 'src/quasicrystal.mjs~Quasicrystal-example1_15', false)

// to cover 'cached` branch
ssgRightCosetsSymopId = qc.ssgRightCosetsSymopId
testDriver.test(() => { return ssgRightCosetsSymopId.length }, 20, 'src/quasicrystal.mjs~Quasicrystal-example1_16', false)
