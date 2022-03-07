import fs from 'fs'
// import { ExactRealAlgebra } from '@kkitahara/real-algebra'
import { RealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { ON_FACET, INSIDE_OF_FACET } from '@kkitahara/polytope-algebra'
import { Quasicrystal } from '../src/legacy/index.mjs'
import { xFractGenerator2 } from '../src/legacy/x-fract-generator.mjs'
const r = new RealAlgebra(1e-8)
const l = new LinearAlgebra(r)

const structFile = './examples/kgy-bmmp10-1.json'
const rCutParCartn = 5
const rCutScale = 1.01
const comment = 'aiueo'
const oFract = l.$(0, 0, 0, 0, 0, 0)

const qc = (() => {
  const s = fs.readFileSync(structFile, 'utf8')
  return JSON.parse(s, Quasicrystal.reviver(r, r.eps))
})()

const aParCartn = qc.aParCartn
const aPerpCartn = qc.aPerpCartn

const data = []

const mPar = l.sdiv(aParCartn, rCutParCartn)
for (const atomSiteLabel of qc.getAtomSiteEntries().map(e => e[0])) {
  const spgPerpCartn = qc.spgPerpCartnNoPhasonAtomSite(atomSiteLabel)

  const rPerpCartnMax = (() => {
    let rPerpCartnMax = 0
    for (const as of qc.getAtomicSurfaceEntriesAtAtomSite(atomSiteLabel).map(e => e[1])) {
      const simplexes = as.occDomainAsym.polytope.genSimplexes()
      for (const simplex of simplexes) {
        for (const v of simplex) {
          rPerpCartnMax = Math.max(rPerpCartnMax, l.abs(v))
        }
      }
    }
    return rPerpCartnMax
  })()

  if (rPerpCartnMax > 0) {
    const rCutPerpCartn = rPerpCartnMax * rCutScale
    const mPerp = l.sdiv(aPerpCartn, rCutPerpCartn)

    const lattFractGenerator = xFractGenerator2(mPar, mPerp)

    const arr = []
    for (const posFract of qc.ssgNoPhasonSymAtomSite(atomSiteLabel).eqvPos) {
      const v = l.sub(posFract, oFract)
      arr.length = 0
      for (const lattFract of lattFractGenerator(v)) {
        const rParPhys = l.mmul(aParCartn, l.add(lattFract, v))
        const rPerpPhys = l.neg(l.mmul(aPerpCartn, l.add(lattFract, v)))

        let found = false
        for (const rot of spgPerpCartn.symop) {
          const rPerpPhysRot = l.mmul(rot, rPerpPhys)

          for (const as of qc.getAtomicSurfaceEntriesAtAtomSite(atomSiteLabel).map(e => e[1])) {
            for (const fragment of as.occDomainAsym.polytope) {
              if (fragment.facets.every(f => {
                const pos = f.position(rPerpPhysRot, l)
                return pos === ON_FACET || pos === INSIDE_OF_FACET
              })) {
                data.push({
                  symbol: as.atomTypeSymbol,
                  rParPhys: rParPhys
                })

                found = true
                break
              }
            }
            if (found) {
              break
            }
          }
          if (found) {
            break
          }
        }
      }
    }
  }
}

console.log(data.length)
console.log(comment)
for (const d of data) {
  console.log(d.symbol, ...d.rParPhys)
}
