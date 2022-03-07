import testDriver from '@kkitahara/esdoc-examples-test-plugin/src/simple-test-driver.mjs'

import { ExactRealAlgebra as RealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { PolytopeAlgebra, Polytope } from '@kkitahara/polytope-algebra'
import { Quasicrystal } from '../../src/index.mjs'
let r = new RealAlgebra()
let l = new LinearAlgebra(r)
let p3d = new PolytopeAlgebra(3, l)

let aPar = []
let aPerp = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1]
let qc = new Quasicrystal(r, 3, aPar, aPerp)

// P m -3
let generators = [
  qc.genSGSymop([
    0, 0, 1,
    1, 0, 0,
    0, 1, 0], [0, 0, 0]),
  qc.genSGSymop([
    -1, 0, 0,
    0, -1, 0,
    0, 0, 1], [0, 0, 0]),
  qc.genSGSymop([
    -1, 0, 0,
    0, 1, 0,
    0, 0, -1], [0, 0, 0]),
  qc.genSGSymop([
    -1, 0, 0,
    0, -1, 0,
    0, 0, -1], [0, 0, 0])]
let sgFract = qc.genSGFractFromGenerators(generators, 24)
testDriver.test(() => { return sgFract.order }, 24, 'src/point-group.mjs~PointGroup#genAsymmetricUnit-example0_0', false)
qc.setSSGFractNoPhason(sgFract)

qc.setAtomSite('Xx1', [0, 0, 0])

let pg = qc.spgPerpCartnNoPhasonAtomSite('Xx1')

let p = pg.genAsymmetricUnit(p3d, 100000)
testDriver.test(() => { return p instanceof Polytope }, true, 'src/point-group.mjs~PointGroup#genAsymmetricUnit-example0_1', false)
let vol = r.mul(p3d.volume(p), 24)
testDriver.test(() => { return r.eq(vol, p3d.volume(p3d.hypercube(100000))) }, true, 'src/point-group.mjs~PointGroup#genAsymmetricUnit-example0_2', false)
