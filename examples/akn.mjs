import { ExactRealAlgebra, RealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { PolytopeAlgebra } from '@kkitahara/polytope-algebra'
import {
  Quasicrystal,
  AtomType,
  AtomicSurface,
  OccupationDomain,
  XRayRadiation,
  scatCromerMannCoeffs,
  scatHiAngFoxCoeffs
} from '../src/index.mjs'
const r = new RealAlgebra(1e-5)

const t = r.iadd(r.$(1, 2), r.$(1, 2, 5))

const aPar = [
  1, t, t, 0, -1, 0,
  t, 0, 0, 1, t, 1,
  0, 1, -1, -t, 0, t]
const aPerp = [
  t, -1, -1, 0, -t, 0,
  -1, 0, 0, t, -1, t,
  0, t, -t, 1, 0, -1]

const qc = new Quasicrystal(r, 6, aPar, aPerp)
// const nr = qc._rnum
// const nl = qc._lnum
// const l = qc._lalg
const p3d = qc._palg

const generators = [
  qc.genSGSymop([
    1, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 1,
    0, 1, 0, 0, 0, 0,
    0, 0, 1, 0, 0, 0,
    0, 0, 0, 1, 0, 0,
    0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0]),
  qc.genSGSymop([
    0, 0, 0, 0, 1, 0,
    0, -1, 0, 0, 0, 0,
    0, 0, -1, 0, 0, 0,
    0, 0, 0, 0, 0, 1,
    1, 0, 0, 0, 0, 0,
    0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0]),
  qc.genSGSymop([
    -1, 0, 0, 0, 0, 0,
    0, -1, 0, 0, 0, 0,
    0, 0, -1, 0, 0, 0,
    0, 0, 0, -1, 0, 0,
    0, 0, 0, 0, -1, 0,
    0, 0, 0, 0, 0, -1], [0, 0, 0, 0, 0, 0])]
const ssg = qc.genSGFractFromGenerators(generators, 120)
qc.setSSGFractNoPhason(ssg)

const al = new AtomType(scatCromerMannCoeffs.Al, scatHiAngFoxCoeffs.Al)
qc.setAtomType('Al', al)

qc.setAtomSite('Al1', [0, 0, 0, 0, 0, 0])

const beta = qc.genADTensorBetaNoPhasonFromUCartn([
  0.1, 0, 0, 0, 0, 0,
  0, 0.1, 0, 0, 0, 0,
  0, 0, 0.1, 0, 0, 0,
  0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0])

const pg = qc.spgPerpCartnNoPhasonAtomSite('Al1')
const odAsym =
  qc.genPseudoWSCellPerpAsymNoPhason('Al1', [[1, 0, 0, -1, 1, -1]], undefined, 100)

const as = new AtomicSurface('Al', 1.0, beta, odAsym)
qc.setAtomicSurface('Al1a', as)

qc.aux = {
  geom_bond: [
    {
      atom_site_label_1: 'Al1',
      symop_id_1: 1,
      cell_translation_1: [0, 0, 0, 0, 0, 0],
      atom_site_label_2: 'Al1',
      symop_id_2: 1,
      cell_translation_2: [0, 0, 0, 0, 0, 1]
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
