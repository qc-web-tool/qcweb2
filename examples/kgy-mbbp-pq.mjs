import fs from 'fs'
import { ExactRealAlgebra, RealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import {
  Quasicrystal,
  AtomType,
  AtomicSurface,
  OccupationDomain,
  XRayRadiation,
  scatCromerMannCoeffs,
  scatHiAngFoxCoeffs } from '../src/legacy/index.mjs'
let r = new RealAlgebra(1e-8)
let l = new LinearAlgebra(r)

const basename = './examples/kgy-mbbp-32'
let p = 3
let q = 2
let a = 1 // r.$(2.398)

let t = r.iadd(r.$(1, 2), r.$(1, 2, 5))
let t2 = r.mul(t, t)
let tinv = r.div(1, t)
let twot = r.mul(2, t)
let h = r.$(1, 2)
let mh = r.$(-1, 2)

let tinvScale = l.$(
  -1, 0, 1, 1, 1, -1,
  1, -1, 0, -1, 1, 1,
  0, 1, -1, 1, -1, 1,
  0, 0, 1, 0, 0, -1,
  1, 0, 0, -1, 0, 0,
  0, 1, 0, 0, -1, 0).setDim(6, 6)

let aPar = l.smul([
  t2, 1, t, 0, twot, 0,
  t, t2, 1, 0, 0, twot,
  1, t, t2, twot, 0, 0], a).setDim(3, 6)
let aPerpNoPhason = l.smul([
  tinv, t, -1, 0, -2, 0,
  -1, tinv, t, 0, 0, -2,
  t, -1, tinv, -2, 0, 0], a).setDim(3, 6)

const alpha = r.div(r.sub(p, r.mul(t, q)), r.add(r.mul(t, p), q))
console.log(alpha)
let preMultPhasonMatrix = l.$(
  alpha, 0, 0,
  0, alpha, 0,
  0, 0, alpha
).setDim(3, 3)
let aPerp = l.add(aPerpNoPhason, l.mmul(preMultPhasonMatrix, aPar))

let qc = new Quasicrystal(r, 6, aPar, aPerp)

let p3d = qc._palg

let generators = [
  qc.genSGSymop([
    0, 1, 0, 0, 0, 0,
    0, 0, 1, 0, 0, 0,
    1, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 1, 0,
    0, 0, 0, 0, 0, 1,
    0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0]),
  qc.genSGSymop([
    0, 0, 1, 0, 0, 0,
    -1, -1, -1, 0, 0, 0,
    1, 0, 0, 0, 0, 0,
    0, 1, 1, 1, 0, 0,
    -1, 0, -1, 0, -1, 0,
    0, 0, 0, 0, 0, -1], [0, 0, 0, 0, 0, 0]),
  qc.genSGSymop([
    -1, 0, 0, 0, 0, 0,
    0, -1, 0, 0, 0, 0,
    0, 0, -1, 0, 0, 0,
    0, 0, 0, -1, 0, 0,
    0, 0, 0, 0, -1, 0,
    0, 0, 0, 0, 0, -1], [0, 0, 0, 0, 0, 0])]
let ssg = qc.genSGFractFromGenerators(generators, 120)
qc.setSSGFractNoPhason(ssg)

qc.setAtomType('Xx',
  new AtomType(scatCromerMannCoeffs['Xx'], scatHiAngFoxCoeffs['Xx']))
qc.setAtomType('Al',
  new AtomType(scatCromerMannCoeffs['Al'], scatHiAngFoxCoeffs['Al']))
qc.setAtomType('Cu',
  new AtomType(scatCromerMannCoeffs['Cu'], scatHiAngFoxCoeffs['Cu']))
qc.setAtomType('Ru',
  new AtomType(scatCromerMannCoeffs['Ru'], scatHiAngFoxCoeffs['Ru']))

qc.setAtomSite('n', [0, 0, 0, 0, 0, 0])
qc.setAtomSite("n'", [h, h, h, 0, 0, 0])
qc.setAtomSite('bc', [0, 0, 0, h, h, h])
qc.setAtomSite("bc'", [h, h, h, h, h, h])

let beta = qc.genADTensorBetaNoPhasonFromUCartn([
  0.1, 0, 0, 0, 0, 0,
  0, 0.1, 0, 0, 0, 0,
  0, 0, 0.1, 0, 0, 0,
  0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0])

let bFract = [
  [1, -1, 1, 0, -1, 0],
  [0, -1, 0, 1, 0, 1]
]

let ods = {
  'm0Asym': qc.genPseudoWSCellPerpAsymNoPhason('n', bFract, [5, 1, 1], 100),
  "m'0Asym": qc.genPseudoWSCellPerpAsymNoPhason("n'", bFract, [5, 1, 1], 100),
  'b0Asym': qc.genPseudoWSCellPerpAsymNoPhason('bc', bFract, [5, 1, 1], 100),
  "b'0Asym": qc.genPseudoWSCellPerpAsymNoPhason("bc'", bFract, [5, 1, 1], 100) }

let bFractT2 = [
  l.mmul(tinvScale, l.mmul(tinvScale, [1, -1, 1, 0, -1, 0])),
  l.mmul(tinvScale, l.mmul(tinvScale, [0, -1, 0, 1, 0, 1]))
]

let acceptanceDomains = {
  'n': new OccupationDomain('n', qc.genPseudoWSCellPerpAsymNoPhason(
    'n', bFractT2, [5, 1, 1], 100).polytope),
  "n'": new OccupationDomain("n'", qc.genPseudoWSCellPerpAsymNoPhason(
    "n'", bFractT2, [5, 1, 1], 100).polytope),
  'bc': new OccupationDomain('bc', qc.genPseudoWSCellPerpAsymNoPhason(
    'bc', bFractT2, [5, 1, 1], 100).polytope),
  "bc'": new OccupationDomain("bc'", qc.genPseudoWSCellPerpAsymNoPhason(
    "bc'", bFractT2, [5, 1, 1], 100).polytope)
}

let ccVects = {
  'b1': [1, -1, 1, 0, -1, 0],
  'b2': [0, -1, 0, 1, 0, 1],
  'short b1': l.mmul(tinvScale, [1, -1, 1, 0, -1, 0]),
  'short b2': l.mmul(tinvScale, [0, -1, 0, 1, 0, 1]),
  'a': [mh, h, h, 0, 0, 0],
  'short a': l.mmul(tinvScale, [mh, h, h, 0, 0, 0]),
  'c1': [h, h, h, mh, mh, mh],
  'c2': [mh, mh, h, h, h, h],
  'short c1': l.mmul(tinvScale, [h, h, h, mh, mh, mh]),
  'short c2': l.mmul(tinvScale, [mh, mh, h, h, h, h])
}

ssg.genOrbit(ccVects['c2'],
  (a, g) => l.mmul(g.rot, a),
  (a, b) => l.eq(a, b)
).orbit.forEach(x => console.log(x.toString()))

Object.entries(ods).forEach(([label, od]) => {
  console.log(`${label}: ${p3d.volume(od.polytope).toString()}`)
})
for (const [name, vFract] of Object.entries(ccVects)) {
  console.log(`Cut by M0 (${name})`)
  for (const od of qc.odStarNoPhasonGenerator(ods['m0Asym'], vFract)) {
    Object.values(ods).forEach(odi => odi.cutBy(p3d, od))
  }
  Object.entries(ods).forEach(([label, od]) => {
    console.log(`${label}: ${p3d.volume(od.polytope).toString()}`)
  })
}
for (const [name, vFract] of Object.entries(ccVects)) {
  console.log(`Cut by B0 (${name})`)
  for (const od of qc.odStarNoPhasonGenerator(ods['b0Asym'], vFract)) {
    Object.values(ods).forEach(odi => odi.cutBy(p3d, od))
  }
  Object.entries(ods).forEach(([label, od]) => {
    console.log(`${label}: ${p3d.volume(od.polytope).toString()}`)
  })
}

for (const [key, odi] of Object.entries(ods)) {
  if (p3d.volume(odi.polytope) > 0) {
    qc.setAtomicSurface(key, new AtomicSurface('Xx', 1, beta, odi,
     '#000000', 1.0, 1.0))
  }
}
fs.writeFileSync(basename + 'c.json', JSON.stringify(qc))
console.log(basename + 'c.json written')

function genClusterSiteAsym (odLabelSrc, vFracts) {
  let tgtODAsym
  for (const vFract of vFracts) {
    for (const od of qc.odStarNoPhasonGenerator(
      ods[odLabelSrc], vFract)
    ) {
      const atomSiteLabel = od.atomSiteLabel
      const odAsym = new OccupationDomain(atomSiteLabel,
        p3d.mul(acceptanceDomains[atomSiteLabel].polytope, od.polytope))
      if (!tgtODAsym) {
        tgtODAsym = odAsym
      } else {
        if (tgtODAsym.atomSiteLabel !== atomSiteLabel) {
          throw Error('Unexpected tgtODAsym.atomSiteLabel !== atomSiteLabel')
        }
        tgtODAsym = new OccupationDomain(atomSiteLabel,
          p3d.add(tgtODAsym.polytope, odAsym.polytope))
      }
    }
  }
  return tgtODAsym
}

let m5Asym = genClusterSiteAsym('m0Asym', [ccVects['a']])
console.log(`m5Asym: ${m5Asym.atomSiteLabel}, ${p3d.volume(m5Asym.polytope).toString()}`)
ods['m5Asym'] = m5Asym

let m3Asym = genClusterSiteAsym(
  'm0Asym', [ccVects['short c1'], ccVects['short c2']]
)
console.log(`m3Asym: ${m3Asym.atomSiteLabel}, ${p3d.volume(m3Asym.polytope).toString()}`)
ods['m3Asym'] = m3Asym

let m2Asym = genClusterSiteAsym('m0Asym', [ccVects['b1'], ccVects['b2']])
console.log(`m2Asym: ${m2Asym.atomSiteLabel}, ${p3d.volume(m2Asym.polytope).toString()}`)
ods['m2Asym'] = m2Asym

let m2sAsym = genClusterSiteAsym(
  'm0Asym', [ccVects['short b1'], ccVects['short b2']]
)
console.log(`m2sAsym: ${m2sAsym.atomSiteLabel}, ${p3d.volume(m2sAsym.polytope).toString()}`)
ods['m2sAsym'] = m2sAsym

let mp5Asym = genClusterSiteAsym("m'0Asym", [ccVects['a']])
console.log(`mp5Asym: ${mp5Asym.atomSiteLabel}, ${p3d.volume(mp5Asym.polytope).toString()}`)
ods['mp5Asym'] = mp5Asym

let mp3Asym = genClusterSiteAsym(
  "m'0Asym", [ccVects['short c1'], ccVects['short c2']]
)
console.log(`mp3Asym: ${mp3Asym.atomSiteLabel}, ${p3d.volume(mp3Asym.polytope).toString()}`)
ods['mp3Asym'] = mp3Asym

let mp2Asym = genClusterSiteAsym("m'0Asym", [ccVects['b1'], ccVects['b2']])
console.log(`mp2Asym: ${mp2Asym.atomSiteLabel}, ${p3d.volume(mp2Asym.polytope).toString()}`)
ods['mp2Asym'] = mp2Asym

let mp2sAsym = genClusterSiteAsym(
  "m'0Asym", [ccVects['short b1'], ccVects['short b2']]
)
console.log(`mp2sAsym: ${mp2sAsym.atomSiteLabel}, ${p3d.volume(mp2sAsym.polytope).toString()}`)
ods['mp2sAsym'] = mp2sAsym

let b3Asym = genClusterSiteAsym('b0Asym', [ccVects['c1'], ccVects['c2']])
console.log(`b3Asym: ${b3Asym.atomSiteLabel}, ${p3d.volume(b3Asym.polytope).toString()}`)
ods['b3Asym'] = b3Asym

let b5Asym = genClusterSiteAsym('b0Asym', [ccVects['short a']])
console.log(`b5Asym: ${b5Asym.atomSiteLabel}, ${p3d.volume(b5Asym.polytope).toString()}`)
ods['b5Asym'] = b5Asym

let bp3Asym = genClusterSiteAsym("b'0Asym", [ccVects['c1'], ccVects['c2']])
console.log(`bp3Asym: ${bp3Asym.atomSiteLabel}, ${p3d.volume(bp3Asym.polytope).toString()}`)
ods["b'3Asym"] = bp3Asym

let bp5Asym = genClusterSiteAsym("b'0Asym", [ccVects['short a']])
console.log(`bp5Asym: ${bp5Asym.atomSiteLabel}, ${p3d.volume(bp5Asym.polytope).toString()}`)
ods["b'5Asym"] = bp5Asym

// qc.setAtomicSurface('b0', new AtomicSurface('Xx', 1, beta, ods['b0Asym'],
//   '#0000FF', 1.0, 1.0))
// qc.setAtomicSurface('m0', new AtomicSurface('Xx', 1, beta, ods['m0Asym'],
//   '#FF0000', 1.0, 1.0))
// qc.setAtomicSurface('mp0', new AtomicSurface('Xx', 1, beta, ods["m'0Asym"],
//   '#00FFFF', 1.0, 1.0))
// qc.setAtomicSurface('m5', new AtomicSurface('Xx', 1, beta, ods['m5Asym'],
//   '#FFFF00', 1.0, 1.0))
// qc.setAtomicSurface('mp5', new AtomicSurface('Xx', 1, beta, ods['mp5Asym'],
//   '#00FF00', 1.0, 1.0))

// fs.writeFileSync('./examples/kgy-bmmp-scc.json', JSON.stringify(qc))
// console.log('./examples/kgy-bmmp-scc.json written')

let ccsVects = {
  'too short b1': l.mmul(tinvScale, ccVects['short b1']),
  'too short b2': l.mmul(tinvScale, ccVects['short b2']),
  'too short a': l.mmul(tinvScale, ccVects['short a']),
  'too much short a': l.mmul(tinvScale, l.mmul(tinvScale, ccVects['short a'])),
  'too short c1': l.mmul(tinvScale, ccVects['short c1']),
  'too short c2': l.mmul(tinvScale, ccVects['short c2'])
}

for (const [key0, od0] of Object.entries(ods)) {
  for (const [name, vFract] of Object.entries(ccsVects)) {
    console.log(`Cut by ${key0} (${name})`)
    for (const od of qc.odStarNoPhasonGenerator(od0, vFract)) {
      for (const [keyi, odi] of Object.entries(ods)) {
        if (odi.atomSiteLabel === od.atomSiteLabel) {
          const p = p3d.mul(odi.polytope, od.polytope)
          if (!p.isNull()) {
            console.log(`too short distance between ${keyi} and ${key0}`)
            if (keyi === 'm3Asym') {
              console.log(`  cut m3Asym`)
              odi.polytope = p3d.sub(odi.polytope, p)
            } else if (key0 === 'm3Asym') {
              console.log(`  cut m3Asym`)
              od.polytope = p3d.sub(od.polytope, p)
            }
          }
        }
      }
    }
  }
}

console.log('Create glues')
let glues = Object.entries(acceptanceDomains).reduce((obj, [key, ad]) => {
  let odGlue = new OccupationDomain(key, p3d.copy(ad.polytope))
  for (const [key0, od0] of Object.entries(ods)) {
    console.log(`Cut by ${key0}`)
    for (const od of qc.odStarNoPhasonGenerator(od0, [0, 0, 0, 0, 0, 0])) {
      odGlue.cutBy(p3d, od)
    }
  }
  for (const [key0, od0] of Object.entries(ods)) {
    for (const [name, vFract] of Object.entries(ccsVects)) {
      console.log(`Cut by ${key0} (${name})`)
      for (const od of qc.odStarNoPhasonGenerator(od0, vFract)) {
        odGlue.cutBy(p3d, od)
      }
    }
  }
  console.log(`${key}: ${p3d.volume(odGlue.polytope).toString()}`)
  obj['Glue-' + key] = odGlue
  return obj
}, {})

console.log('check clossness condition between glues')
for (const [key0, od0] of Object.entries(glues)) {
  for (const [name, vFract] of Object.entries(ccsVects)) {
    console.log(`Cut by ${key0} (${name})`)
    for (const od of qc.odStarNoPhasonGenerator(od0, vFract)) {
      for (const [keyi, odi] of Object.entries(glues)) {
        if (odi.atomSiteLabel === od.atomSiteLabel) {
          const p = p3d.mul(odi.polytope, od.polytope)
          if (!p.isNull()) {
            console.log(`too short distance between ${keyi} and ${key0}`)
            console.log(p3d.volume(p).toString())
          }
        }
      }
    }
  }
}

console.log('find intersections')
{
  let odsEntries = Object.entries(ods).concat(Object.entries(glues))
  let i = 0
  let j = 1
  while (i < odsEntries.length - 1) {
    const [keyi, odi] = odsEntries[i]
    const [keyj, odj] = odsEntries[j]
    const atomSiteLabeli = odi.atomSiteLabel
    const atomSiteLabelj = odj.atomSiteLabel
    if (atomSiteLabeli === atomSiteLabelj) {
      const intersection = p3d.mul(odi.polytope, odj.polytope)
      if (!intersection.isNull()) {
        odsEntries[i] = [keyi, new OccupationDomain(atomSiteLabeli,
          p3d.sub(odi.polytope, intersection))]
        odsEntries[j] = [keyj, new OccupationDomain(atomSiteLabelj,
          p3d.sub(odj.polytope, intersection))]
        odsEntries.push([keyi + '^' + keyj, new OccupationDomain(atomSiteLabeli,
          intersection)])
      }
    }
    j = j + 1
    if (j === odsEntries.length) {
      i += 1
      j = i + 1
    }
  }
  ods = odsEntries.reduce((obj, [key, value]) => {
    obj[key] = value
    return obj
  }, {})
  const vodTot = Object.values(ods).reduce((vod, od) => {
    vod = r.iadd(vod, p3d.volume(od.polytope))
    return vod
  }, r.$(0))
  console.log('volumes: ')
  for (const [key, odi] of Object.entries(ods)) {
    const vod = p3d.volume(odi.polytope)
    console.log(`${key}: ${p3d.volume(odi.polytope).toString()} ${r.div(vod, vodTot)}`)

    if (vod > 0) {
      qc.setAtomicSurface(key, new AtomicSurface('Xx', 1, beta, odi,
        '#000000', 1.0, 1.0))
    }
  }
  console.log('point density: ', r.div(vodTot, qc.hyperVolume).toString())
}

fs.writeFileSync(basename + 'a.json', JSON.stringify(qc))
console.log(basename + 'a.json written')

