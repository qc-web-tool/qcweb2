import { /* ExactRealAlgebra, */ RealAlgebra } from '@kkitahara/real-algebra'
// import { LinearAlgebra } from '@kkitahara/linear-algebra'
// import { PolytopeAlgebra } from '@kkitahara/polytope-algebra'
import {
  Quasicrystal,
  AtomType,
  AtomicSurface,
  OccupationDomain,
  // XRayRadiation,
  scatCromerMannCoeffs,
  scatHiAngFoxCoeffs
} from '../src/index.mjs'
const r = new RealAlgebra(1e-5)

const a = 3
const t = (1 + Math.sqrt(5)) / 2
const p = 2 / Math.sqrt(5)
const omega = 2 / 5 * Math.PI

const aPar = [
  p * Math.cos(omega * 0) * a,
  p * Math.cos(omega * 1) * a,
  p * Math.cos(omega * 2) * a,
  p * Math.cos(omega * 3) * a,
  p * Math.cos(omega * 4) * a,
  p * Math.sin(omega * 0) * a,
  p * Math.sin(omega * 1) * a,
  p * Math.sin(omega * 2) * a,
  p * Math.sin(omega * 3) * a,
  p * Math.sin(omega * 4) * a]
const aPerp = [
  p * Math.cos(omega * 0) * a,
  p * Math.cos(omega * 2) * a,
  p * Math.cos(omega * 4) * a,
  p * Math.cos(omega * 6) * a,
  p * Math.cos(omega * 8) * a,
  p * Math.sin(omega * 0) * a,
  p * Math.sin(omega * 2) * a,
  p * Math.sin(omega * 4) * a,
  p * Math.sin(omega * 6) * a,
  p * Math.sin(omega * 8) * a,
  p * 0.5 * a,
  p * 0.5 * a,
  p * 0.5 * a,
  p * 0.5 * a,
  p * 0.5 * a]

const qc = new Quasicrystal(r, 5, aPar, aPerp)
// const nr = qc._rnum
// const nl = qc._lnum
// const l = qc._lalg
const p3d = qc._palg

const generators = [
  qc.genSGSymop([
    -1, 0, 0, 0, 0,
    0, -1, 0, 0, 0,
    0, 0, -1, 0, 0,
    0, 0, 0, -1, 0,
    0, 0, 0, 0, -1], [0, 0, 0, 0, 0]),
  qc.genSGSymop([
    1, 0, 0, 0, 0,
    0, 0, 0, 0, 1,
    0, 0, 0, 1, 0,
    0, 0, 1, 0, 0,
    0, 1, 0, 0, 0], [0, 0, 0, 0, 0]),
  qc.genSGSymop([
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0,
    0, 0, 0, 0, 1,
    1, 0, 0, 0, 0], [0, 0, 0, 0, 0])]
const ssg = qc.genSGFractFromGenerators(generators, 20)
// console.log(ssg.order)
qc.setSSGFractNoPhason(ssg)

const al = new AtomType(scatCromerMannCoeffs['Al'], scatHiAngFoxCoeffs['Al'])
qc.setAtomType('Al', al)

qc.setAtomSite('Al1', [0, 0, 0, 0, 0])

const beta = qc.genADTensorBetaNoPhasonFromUCartn([
  0.005, 0, 0, 0, 0,
  0, 0.005, 0, 0, 0,
  0, 0, 0, 0, 0,
  0, 0, 0, 0, 0,
  0, 0, 0, 0, 0])

// const pg = qc.spgPerpCartnNoPhasonAtomSite('Al1')
const p1 = qc.genPseudoWSCellPerpAsymNoPhason('Al1', [[1 + 0.5 * p, 0.5 * p, 0.5 * p, 0.5 * p, 0.5 * p]], undefined, 100).polytope
const p2 = qc.genPseudoWSCellPerpAsymNoPhason('Al1', [[1, 0, 0, 1, 0]], undefined, 100).polytope
const p3 = p3d.scale(p3d.mul(p1, p2), t)
const acceptance = p3d.scale(p3d.mul(p1, p2), 1000)
const od3Asym = new OccupationDomain('Al1', p3)
let p3full = p3
for (const od of qc.odStarNoPhasonGenerator(od3Asym, [0, 0, 0, 0, 0])) {
  p3full = p3d.add(p3full, od.polytope)
}
const p3a = p3d.translate(p3full, [0, 0, 0.5 * a])
const p3b = p3d.translate(p3full, [0, 0, -0.5 * a])
const p4 = p3d.mul(acceptance, p3d.mul(p3a, p3b))
const odAsym = new OccupationDomain('Al1', p4)

const as = new AtomicSurface('Al', 1.0, beta, odAsym)
qc.setAtomicSurface('Al1a', as)

qc.aux = {
  "geom_bond": [
    {
      "atom_site_label_1": "Al1",
      "symop_id_1": 1,
      "cell_translation_1": [0, 0, 0, 0, 0],
      "atom_site_label_2": "Al1",
      "symop_id_2": 1,
      "cell_translation_2": [0, 0, 0, 0, 1]
    }
  ]
}

console.log(JSON.stringify(qc, null, 2))
// qc = JSON.parse(JSON.stringify(qc), Quasicrystal.reviver(r))

/*
const rad = XRayRadiation.cuKL3

let symQ0 = ssg.genStar([0, 0],
  (a, g) => nl.mmul(a, g.rot),
  (a, b) => nl.eq(a, b))
let stol = [0]
let qPerpCartnStar = symQ0.star.map(q => nl.mmul(q, qc.bPerpCartn))
let f00 = qc.structureFactor(stol, rad, symQ0, qPerpCartnStar).map(nr.abs.bind(nr))[0]
console.warn(f00, r.div(r.mul(r.add(tau, 1), a), qc.hyperVolume) + 0)

for (let symQ of qc.symQFractNoPhasonGenerator(2.5, 2.5)) {
  const q = symQ.star[0]
  const qPar = nl.abs(nl.mmul(q, qc.bParCartn))
  const qPerp = nl.abs(nl.mmul(q, qc.bPerpCartn))
  const qPerpCartnStar = symQ.star.map(q => nl.mmul(q, qc.bPerpCartn))
  const stol = [qPar / 2]
  if (qPar <= 2.5 && qPerp <= 2.5) {
    const f = qc.structureFactor(stol, rad, symQ, qPerpCartnStar)[0]
    console.log(qPar, qPerp, 0, 0, 0)
    console.log(qPar, qPerp, f.re / f00, f.im / f00, symQ.star.length)
    console.log(qPar, qPerp, 0, 0, 0)
  }
}
*/
