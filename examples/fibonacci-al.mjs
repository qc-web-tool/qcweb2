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
  scatHiAngFoxCoeffs } from '../src/index.mjs'
let r = new ExactRealAlgebra(1e-5)

let a = r.$(5, 2)
let tau = r.iadd(r.$(1, 2), r.$(1, 2, 5))

let aPar = [a, r.mul(a, tau)]
let aPerp = [r.ineg(r.mul(a, tau)), a]
let qc = new Quasicrystal(r, 2, aPar, aPerp)
let nr = qc._rnum
let nl = qc._lnum
let l = qc._lalg
let p1d = qc._palg

let generators = [qc.genSGSymop([-1, 0, 0, -1], [0, 0])]
let ssg = qc.genSGFractFromGenerators(generators, 2)
qc.setSSGFractNoPhason(ssg)

let al = new AtomType(scatCromerMannCoeffs['Al'], scatHiAngFoxCoeffs['Al'])
qc.setAtomType('Al', al)

qc.setAtomSite('Al1', [0, 0])

let beta = qc.genADTensorBetaNoPhasonFromUCartn([0.005, 0, 0, 0])

let pg = qc.spgPerpCartnNoPhasonAtomSite('Al1')
let od = p1d.hypercube(r.mul(a, r.div(r.add(tau, 1), 2)))
let asym = pg.genAsymmetricUnit(p1d, 1000)
let odAsym = p1d.mul(od, asym)

let as = new AtomicSurface('Al', 1.0, beta, new OccupationDomain('Al1', odAsym))
qc.setAtomicSurface('Al1a', as)

// console.log(JSON.stringify(qc))
// qc = JSON.parse(JSON.stringify(qc), Quasicrystal.reviver(r))

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
