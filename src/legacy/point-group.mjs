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

import { Group } from './group.mjs'
import { InvalidValue } from './invalid-value.mjs'
import { PolytopeAlgebra } from '@kkitahara/polytope-algebra'

/**
 * @desc
 * The {@link PointGroup} class is a class for point groups.
 *
 * All the group operationsceGroup} are assumed to be square matrices.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
export class PointGroup extends Group {
  /**
   * @desc
   * The constructor function of the {@link PointGroup} class.
   *
   * @param {Matrix[]} g
   * An array containing one or more point-group symmetry operations, otherwise
   * the constructor returns an instance of {@link InvaldValue}.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (g) {
    super(g)
    const dim = g[0].getDim()[0]
    if (g.some(gi => !gi.isSquare() || gi.getDim()[0] !== dim)) {
      return new InvalidValue(` (in PointGroup constructor)
        All the elements of \`g\` must be square matrices of the same
        dimension.`)
    }
  }

  /**
   * @desc
   * The {@link PointGroup#symop} is an array containing all the symmetry
   * operations of `this` point group.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get symop () {
    return this._g
  }

  /**
   * @desc
   * The {@link PointGroup#dim} is the dimension to which `this` point group
   * conforms.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get dim () {
    return this.symop[0].getDim()[0]
  }

  /**
   * @desc
   * The {@link PointGroup#copy} method returns a copy of `this` point group.
   *
   * @param {LinearAlgebra} lalg
   * An instance of {@link LinearAlgebra}.
   *
   * @return {PointGroup}
   * A copy of `this`.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  copy (lalg) {
    return new PointGroup(this._g.map(gi => lalg.copy(gi)))
  }

  /**
   * @desc
   * The {@link genAsymmetricUnit} method generates a polytope which represents
   * an asymmetric unit in `this` point group.
   *
   * This is an ad hoc implementation and may be improved in future.
   *
   * This method is valid only for the point groups represeted in the Cartesian
   * coordinate system.
   *
   * @param {PolytopeAlgebra} palg
   * An instance of {@link PolytopeAlgebra} of the dimension to which `this`
   * point group conforms.
   *
   * @param {RealNumber} d
   * Half the edge length of a huge hypercube, which approximates whole space.
   * It should not be too large in the case of numerical algebra.
   *
   * @param {Matrix} [hintGeneralPosition]
   * A user-specified general position (optional).
   *
   * @param {number} [max = 512]
   * Maximum number of trials.
   *
   * @return {Polytope|InvalidValue}
   * An polytope representing an asymmetric unit on successful exit, or an
   * instance of the {@link InvalidValue}.
   *
   * @version 1.0.0
   * @since 1.0.0
   *
   * @example
   * import { ExactRealAlgebra as RealAlgebra } from '@kkitahara/real-algebra'
   * import { LinearAlgebra } from '@kkitahara/linear-algebra'
   * import { PolytopeAlgebra, Polytope } from '@kkitahara/polytope-algebra'
   * import { Quasicrystal } from '@kkitahara/qc-tools'
   * let r = new RealAlgebra()
   * let l = new LinearAlgebra(r)
   * let p3d = new PolytopeAlgebra(3, l)
   *
   * let aPar = []
   * let aPerp = [
   *   1, 0, 0,
   *   0, 1, 0,
   *   0, 0, 1]
   * let qc = new Quasicrystal(r, 3, aPar, aPerp)
   *
   * // P m -3
   * let generators = [
   *   qc.genSGSymop([
   *     0, 0, 1,
   *     1, 0, 0,
   *     0, 1, 0], [0, 0, 0]),
   *   qc.genSGSymop([
   *     -1, 0, 0,
   *     0, -1, 0,
   *     0, 0, 1], [0, 0, 0]),
   *   qc.genSGSymop([
   *     -1, 0, 0,
   *     0, 1, 0,
   *     0, 0, -1], [0, 0, 0]),
   *   qc.genSGSymop([
   *     -1, 0, 0,
   *     0, -1, 0,
   *     0, 0, -1], [0, 0, 0])]
   * let sgFract = qc.genSGFractFromGenerators(generators, 24)
   * sgFract.order // 24
   * qc.setSSGFractNoPhason(sgFract)
   *
   * qc.setAtomSite('Xx1', [0, 0, 0])
   *
   * let pg = qc.spgPerpCartnNoPhasonAtomSite('Xx1')
   *
   * let p = pg.genAsymmetricUnit(p3d, 100000)
   * p instanceof Polytope // true
   * let vol = r.mul(p3d.volume(p), 24)
   * r.eq(vol, p3d.volume(p3d.hypercube(100000))) // true
   */
  genAsymmetricUnit (palg, d, hintGeneralPosition, max = 512) {
    const dim = this.dim
    const symop = this.symop
    const order = this.order
    if (!(palg instanceof PolytopeAlgebra) || palg.dim !== this.dim) {
      return new InvalidValue(` (in PointGroup#genAsymmetricUnit)
        \`palg\` must be an instance of \`PolytopeAlgebra\` of the dimensiton
        to which \`this\` point group conforms.`)
    }
    if (!Number.isInteger(max) || max < 1) {
      return new InvalidValue(` (in PointGroup#genAsymmetricUnit)
        \`max\` must be a positive (non-zero) integer.`)
    }
    if (dim === 0) {
      return palg.hypercube()
    }
    const lalg = palg.lalg
    const ralg = lalg.salg
    d = ralg.$(d)
    let generalPositions = null
    if (hintGeneralPosition !== undefined) {
      let v1 = lalg.copy(hintGeneralPosition)
      const positions = []
      for (let j = 0; j < order; j += 1) {
        const v2 = lalg.mmul(symop[j], v1)
        if (positions.every(v3 => lalg.ne(v2, v3))) {
          positions.push(v2)
        }
      }
      if (positions.length === order) {
        generalPositions = positions
      }
    }
    if (generalPositions === null) {
      // try (1, 0,..., 0, 0)
      const v = [1, ...new Array(dim - 1).fill(0)]
      let v1 = lalg.$(...v)
      for (let i = 0; i < max; i += 1) {
        const positions = []
        for (let j = 0; j < order; j += 1) {
          const v2 = lalg.mmul(symop[j], v1)
          if (positions.every(v3 => lalg.ne(v2, v3))) {
            positions.push(v2)
          }
        }
        if (positions.length === order) {
          generalPositions = positions
          break
        }
        // add (dim, dim - 1,..., 1, 0)
        for (let j = 0; j < dim; j += 1) {
          v[j] += dim - j
        }
        v1 = lalg.$(...v)
      }
      if (generalPositions === null) {
        return new InvalidValue(` (in PointGroup#genAsymmetricUnit)
          Any general positions are found in \`max\` (${max}) trials.`)
      }
    }
    const asym = palg.hypercube(d)
    generalPositions.slice(1).forEach(posi => {
      const nvec = lalg.sub(posi, generalPositions[0])
      palg.iaddFacet(asym, palg.facet(nvec, 0, true))
    })
    return asym
  }
}

/* @license-end */
