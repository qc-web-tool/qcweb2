/**
 * @source: https://www.npmjs.com/package/@kkitahara/qc-tools
 * @license magnet:?xt=urn:btih:8e4f440f4c65981c5bf93c76d35135ba5064d8b7&dn=apache-2.0.txt Apache-2.0
 */

/**
 * Copyright 2019 Koichi Kitahara
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { RealAlgebra } from '@kkitahara/real-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'

const rnum = new RealAlgebra()
const lnum = new LinearAlgebra(rnum)
const eps = 1e-5

// real roots of x^2 - 2bx + c = 0
const realRootsOfQuadEq = (b, c) => {
  const d = b * b - c
  if (d <= 0) {
    const dummy = b
    return [dummy, dummy]
  }
  const rtd = Math.sqrt(d)
  if (b > 0) {
    const x1 = b + rtd
    return [c / x1, x1]
  } else {
    const x0 = b - rtd
    return [x0, c / x0]
  }
}

const genCoefMatrices = (dim, dimD, g, vv, vf, ff) => {
  // v: variable, f: fixed, d: dependent
  const i = dim - (dimD + 1)
  const idim = i * dim
  const gvvi = g[idim + i]
  const gvfi = lnum.$(...g.slice(idim, idim + i))
  const gffi = lnum.$(...g.filter((a, k) => {
    return Math.floor(k / dim) < i && k % dim < i
  })).setDim(i, i)
  const gddiLU = lnum.ilup(lnum.$(...g.filter((a, k) => {
    return Math.floor(k / dim) > i && k % dim > i
  })).setDim(dimD, dimD))
  const gdvi = lnum.$(...g.filter((a, k) => {
    return Math.floor(k / dim) > i && k % dim === i
  }))
  const gdfi = lnum.$(...g.filter((a, k) => {
    return Math.floor(k / dim) > i && k % dim < i
  })).setDim(dimD, i)

  // ad hoc fix
  gdvi.setDim(dimD, 1)
  const vddddvi = lnum.dot(gdvi, lnum.solve(gddiLU, gdvi))
  gdvi.setDim()

  const dddfi = lnum.solve(gddiLU, gdfi)
  const fddddfi = lnum.mmul(lnum.transpose(gdfi), dddfi)
  const vvi = gvvi - vddddvi
  vv.push(vvi)
  const vddddfi = i === dim - 1
    ? new Array(i).fill(0)
    : lnum.mmul(gdvi, dddfi)
  vf.push(lnum.isdiv(lnum.sub(gvfi, vddddfi), -vvi))
  ff.push(lnum.isdiv(lnum.sub(gffi, fddddfi), vvi))
}

// ORIGINAL
/*
const genCoefMatrices2 = (dim, dimD, constVect, vv, vf, ff, vc, fc, cc, c0) => {
  const i = dim - (dimD + 1)
  const vfi = vf[dimD]
  const ffi = ff[dimD]
  let vci = -constVect[i]
  let cci = -vci * constVect[i]
  const tmp1 = lnum.$(...constVect.slice(0, i))
  const tmp2 = lnum.dot(vfi, tmp1)
  vci += tmp2
  let fci = lnum.smul(vfi, -2 * constVect[i])
  cci += -2 * constVect[i] * tmp2
  const tmp3 = lnum.mmul(ffi, tmp1)
  fci = lnum.iadd(fci, lnum.smul(tmp3, 2))
  cci += lnum.dot(tmp1, tmp3) - c0 * (1 + eps) / vv[dimD]
  vc.push(vci)
  fc.push(fci)
  cc.push(cci)
}
*/

const genCoefMatrices2 = (dim, dimD, constVect, vv, vf, ff, vc, fc, cc, c0) => {
  const i = dim - (dimD + 1)
  const vfi = vf[dimD]
  const ffi = ff[dimD]
  let vci = -constVect[i]
  let cci = -vci * constVect[i]

  // const tmp1 = lnum.$(...constVect.slice(0, i))
  let tmp2 = 0
  for (let j = i - 1; j >= 0; j -= 1) {
    tmp2 += vfi[j] * constVect[j]
  }

  vci += tmp2

  let fci = []
  for (let j = 0; j < i; j += 1) {
    let sum = 0
    for (let k = i - 1; k >= 0; k -= 1) {
      sum += ffi[j * i + k] * constVect[k]
    }
    fci.push(-2 * constVect[i] * vfi[j] + sum * 2)
    cci += sum * constVect[j]
  }
  cci += -2 * constVect[i] * tmp2 - c0 * (1 + eps) / vv[dimD]

  vc.push(vci)
  fc.push(fci)
  cc.push(cci)
}

// SLOW ...
/*
const findRangeForDepth = (dim, depth, current, vv, vf, ff, vc, fc, cc) => {
  const dimD = dim - (depth + 1)
  const tmp = lnum.$(...current.slice(0, depth))
  const b = vc[dimD] + lnum.dot(vf[dimD], tmp)
  const c = cc[dimD] +
    lnum.dot(tmp, lnum.iadd(lnum.mmul(ff[dimD], tmp), fc[dimD]))
  return realRootsOfQuadEq(b, c)
}
*/

const findRangeForDepth = (dim, depth, current, vv, vf, ff, vc, fc, cc) => {
  const dimD = dim - (depth + 1)
  const vfDimD = vf[dimD]
  const fcDimD = fc[dimD]
  const ffDimD = ff[dimD]
  let b = vc[dimD]
  let c = cc[dimD]
  let k = depth ** 2
  const start = depth - 1
  for (let i = start; i >= 0; i -= 1) {
    const currentI = current[i]
    b += vfDimD[i] * currentI
    let sum = 0
    for (let j = start; j >= 0; j -= 1) {
      k -= 1
      sum += ffDimD[k] * current[j]
    }
    c += (sum + fcDimD[i]) * currentI
  }
  return realRootsOfQuadEq(b, c)
}

// m and v are the linear transformation matrix and the translation
// vector, repsectively, by which a cutoff region represented by an ellipse
// is mapped into the sphere of radius 1.
// Convention of transformation is as follows:
// x' = m (x + v)
// Usage:
//   xFractGenerator(m)(v)
export function xFractGenerator (m) {
  const dim = Math.sqrt(m.length)
  m = lnum.$(...m).setDim(dim, dim)
  // numerical only
  const g = lnum.mmul(lnum.transpose(m), m)
  // v: variable, f: fixed, c: constant, index === dimD
  const vv = []
  const vf = []
  const ff = []
  for (let dimD = 0; dimD < dim; dimD += 1) {
    genCoefMatrices(dim, dimD, g, vv, vf, ff)
  }
  return function * (v) {
    const vc = []
    const fc = []
    const cc = []
    for (let dimD = 0; dimD < dim; dimD += 1) {
      genCoefMatrices2(dim, dimD, v, vv, vf, ff, vc, fc, cc, 1)
    }
    const setRangeForDepth = (depth, current, nextIncrement, stop) => {
      const range = findRangeForDepth(dim, depth, current, vv, vf, ff, vc, fc,
        cc)
      const min = Math.floor(range[0]) + 1
      const max = Math.ceil(range[1]) - 1
      const diff = max - min
      current[depth] = min + Math.floor(diff / 2)
      if (diff % 2 === 0) {
        nextIncrement[depth] = -1
      } else {
        nextIncrement[depth] = 1
      }
      stop[depth] = min - 1
    }
    const current = new Array(dim).fill(0)
    const nextIncrement = new Array(dim).fill(0)
    const stop = new Array(dim).fill(0)
    let depth = 0
    setRangeForDepth(depth, current, nextIncrement, stop)
    while (true) {
      if (current[depth] !== stop[depth]) {
        if (depth < dim - 1) {
          depth += 1
          setRangeForDepth(depth, current, nextIncrement, stop)
          continue
        }
        yield current
      } else {
        if (depth === 0) {
          break
        } else {
          depth -= 1
        }
      }
      current[depth] += nextIncrement[depth]
      if (nextIncrement[depth] > 0) {
        nextIncrement[depth] = -(nextIncrement[depth] + 1)
      } else {
        nextIncrement[depth] = -(nextIncrement[depth] - 1)
      }
    }
  }
}

// m and v are the linear transformation matrix and the translation
// vector, repsectively, by which a cutoff region represented by an ellipse
// is mapped into the sphere of radius 1.
// Convention of transformation is as follows:
// x' = m (x + v)
// Usage:
//   xFractGenerator(m)(v)
export function xFractGenerator2 (mPar, mPerp) {
  const dim = mPar.getDim()[1]
  const dimPar = mPar.getDim()[0]
  const dimPerp = mPerp.getDim()[0]
  // error check
  // ...
  if (dimPerp === 0) {
    return xFractGenerator(mPar)
  }
  // numerical only
  const gPar = lnum.mmul(lnum.transpose(mPar), mPar)
  const gPerp = lnum.mmul(lnum.transpose(mPerp), mPerp)
  const g = lnum.add(gPar, gPerp)
  // v: variable, f: fixed, c: constant, index === dimD
  const vvPar = []
  const vfPar = []
  const ffPar = []
  const vvPerp = []
  const vfPerp = []
  const ffPerp = []
  for (let dimD = 0; dimD < dim; dimD += 1) {
    if (dimD < dimPar) {
      genCoefMatrices(dim, dimD, gPar, vvPar, vfPar, ffPar)
    } else {
      genCoefMatrices(dim, dimD, g, vvPar, vfPar, ffPar)
    }
    if (dimD < dimPerp) {
      genCoefMatrices(dim, dimD, gPerp, vvPerp, vfPerp, ffPerp)
    } else if (dimD < dimPar) {
      genCoefMatrices(dim, dimD, g, vvPerp, vfPerp, ffPerp)
    }
  }
  return function * (v) {
    const vcPar = []
    const fcPar = []
    const ccPar = []
    const vcPerp = []
    const fcPerp = []
    const ccPerp = []
    for (let dimD = 0; dimD < dim; dimD += 1) {
      if (dimD < dimPar) {
        genCoefMatrices2(dim, dimD, v, vvPar, vfPar, ffPar, vcPar, fcPar, ccPar,
          1)
      } else {
        genCoefMatrices2(dim, dimD, v, vvPar, vfPar, ffPar, vcPar, fcPar, ccPar,
          2)
      }
      if (dimD < dimPerp) {
        genCoefMatrices2(dim, dimD, v, vvPerp, vfPerp, ffPerp, vcPerp, fcPerp,
          ccPerp, 1)
      } else if (dimD < dimPar) {
        genCoefMatrices2(dim, dimD, v, vvPerp, vfPerp, ffPerp, vcPerp, fcPerp,
          ccPerp, 2)
      }
    }
    const setRangeForDepth = (depth, current, nextIncrement, stop) => {
      const dimD = dim - (depth + 1)
      const rangePar = findRangeForDepth(dim, depth, current, vvPar, vfPar,
        ffPar, vcPar, fcPar, ccPar)
      let range
      if (dimD < dimPerp || dimD < dimPar) {
        const rangePerp = findRangeForDepth(dim, depth, current, vvPerp, vfPerp,
          ffPerp, vcPerp, fcPerp, ccPerp)
        const range0 = Math.max(rangePar[0], rangePerp[0])
        range = [
          range0, Math.max(Math.min(rangePar[1], rangePerp[1]), range0)]
      } else {
        range = rangePar
      }
      const min = Math.floor(range[0]) + 1
      const max = Math.ceil(range[1]) - 1
      const diff = max - min
      current[depth] = min + Math.floor(diff / 2)
      if (diff % 2 === 0) {
        nextIncrement[depth] = -1
      } else {
        nextIncrement[depth] = 1
      }
      stop[depth] = min - 1
    }
    const current = new Array(dim).fill(0)
    const nextIncrement = new Array(dim).fill(0)
    const stop = new Array(dim).fill(0)
    let depth = 0
    setRangeForDepth(depth, current, nextIncrement, stop)
    while (true) {
      if (current[depth] !== stop[depth]) {
        if (depth < dim - 1) {
          depth += 1
          setRangeForDepth(depth, current, nextIncrement, stop)
          continue
        }
        yield current
      } else {
        if (depth === 0) {
          break
        } else {
          depth -= 1
        }
      }
      current[depth] += nextIncrement[depth]
      if (nextIncrement[depth] > 0) {
        nextIncrement[depth] = -(nextIncrement[depth] + 1)
      } else {
        nextIncrement[depth] = -(nextIncrement[depth] - 1)
      }
    }
  }
}

/* @license-end */
