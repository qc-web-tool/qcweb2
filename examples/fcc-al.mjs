import { RealAlgebra, ExactRealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { PolytopeAlgebra } from '@kkitahara/polytope-algebra'
import {
  Quasicrystal,
  AtomType,
  scatCromerMannCoeffs,
  scatHiAngFoxCoeffs,
  AtomicSurface,
  OccupationDomain,
  XRayRadiation } from '../src/index.mjs'
let r = new RealAlgebra(1e-10)
let nr = new RealAlgebra(1e-10)
let l = new LinearAlgebra(r)
let p0d = new PolytopeAlgebra(0, l)
let nl = new LinearAlgebra(nr)

let a = r.$(4)
let aPar = [a, 0, 0, 0, a, 0, 0, 0, a]
let aPerp = []
let qc = new Quasicrystal(r, 3, aPar, aPerp)

let generators = [
  qc.genSGSymop([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1], [0, 0.5, 0.5]),
  qc.genSGSymop([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1], [0.5, 0, 0.5]),
  qc.genSGSymop([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1], [0.5, 0.5, 0]),
  qc.genSGSymop([
    -1, 0, 0,
    0, -1, 0,
    0, 0, -1], [0, 0, 0]),
  qc.genSGSymop([
    1, 0, 0,
    0, -1, 0,
    0, 0, -1], [0, 0, 0]),
  qc.genSGSymop([
    -1, 0, 0,
    0, 1, 0,
    0, 0, -1], [0, 0, 0]),
  qc.genSGSymop([
    0, 1, 0,
    0, 0, 1,
    1, 0, 0], [0, 0, 0]),
  qc.genSGSymop([
    0, 1, 0,
    -1, 0, 0,
    0, 0, 1], [0, 0, 0])]
let ssg = qc.genSGFractFromGenerators(generators, 192)

qc.setSSGFractNoPhason(ssg)

qc.setAtomSite('Al1', [0, 0, 0])

let al = new AtomType(scatCromerMannCoeffs['Al'], scatHiAngFoxCoeffs['Al'])

qc.setAtomType('Al', al)

let beta = qc.genADTensorBetaNoPhasonFromUCartn([
  0.1, 0, 0,
  0, 0.1, 0,
  0, 0, 0.1])
let pgFract = qc.spgFractNoPhasonAtomSite('Al1')
let pgPerpCartn = qc.spgPerpCartnNoPhasonAtomSite('Al1')
console.warn(pgFract.order)
console.warn(pgPerpCartn.order)
let od = p0d.hypercube()
let asym = pgPerpCartn.genAsymmetricUnit(p0d, 10000)
let odAsym = p0d.mul(od, asym)
let as = new AtomicSurface('Al', 1.0, beta, new OccupationDomain('Al1', odAsym))
qc.setAtomicSurface('Al1a', as)

// console.log(JSON.stringify(qc))

console.warn(qc.getAtomTypeEntries())
console.warn(qc.getAtomSiteEntries())
console.warn(qc.getAtomicSurfaceEntries())

// qc = JSON.parse(JSON.stringify(qc), Quasicrystal.reviver(r))

const rad = XRayRadiation.cuKL3

let symQ0 = ssg.genStar([0, 0, 0],
  (a, g) => nl.mmul(a, g.rot),
  (a, b) => nl.eq(a, b))
let stol = [0]
let qPerpCartnStar = symQ0.star.map(q => nl.mmul(q, qc.bPerpCartn))
let f000 = qc.structureFactor(stol, rad, symQ0, qPerpCartnStar).map(nr.abs.bind(nr))[0]
console.warn(f000, 13 * 4 / 4 ** 3)

for (let symQ of qc.symQFractNoPhasonGenerator(1.2, 1.0)) {
  const q = symQ.star[0]
  const qPar = nl.abs(nl.mmul(q, qc.bParCartn))
  const qPerp = nl.abs(nl.mmul(q, qc.bPerpCartn))
  const stol = [qPar / 2]
  const qPerpCartnStar = symQ.star.map(q => nl.mmul(q, qc.bPerpCartn))
  if (qPar <= 1.0 && qPerp <= 1.0) {
    const f = qc.structureFactor(stol, rad, symQ, qPerpCartnStar)[0]
    console.log(qPar, qPerp, 0, 0, 0)
    console.log(qPar, qPerp, f.re / f000, f.im / f000, symQ.star.length)
    console.log(qPar, qPerp, 0, 0, 0)
  }
}
