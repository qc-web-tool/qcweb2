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
import { ComplexAlgebra } from '@kkitahara/complex-algebra'
import { LinearAlgebra } from '@kkitahara/linear-algebra'
import { PolytopeAlgebra } from '@kkitahara/polytope-algebra'
import { InvalidValue } from './invalid-value.mjs'
import { MultiKeyWeakMap } from './multi-key-weak-map.mjs'
import { DEFAULT_EPS } from './constants.mjs'
import { Group } from './group.mjs'
import { SpaceGroup } from './space-group.mjs'
import { SpaceGroupSymop } from './space-group-symop.mjs'
import { PointGroup } from './point-group.mjs'
import { AtomType } from './atom-type.mjs'
import { AtomSite } from './atom-site.mjs'
import { AtomicSurface } from './atomic-surface.mjs'
import { OccupationDomain } from './occupation-domain.mjs'

/**
 * @typedef {number|Polynomial} RealNumber
 *
 * @desc
 * A {@link RealNumber} denotes a {@link number} or an instance of
 * {@link Polynomial} depending on the real algebra to be used. See the
 * documents of @kkitahara/real-algebra for more details.
 */

/**
 * @typedef {object} ComplexNumber
 *
 * @desc
 * A {@link ComplexNumber} is an object with `re` and `im` properties. The
 * values of `re` and `im` are {link RealNumber}s. See the documents of
 * @kkitahara/complex-algebra for more details.
 */

/**
 * @desc
 * The {@link Quasicrystal} class is a class for quasicrystals.
 *
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import { ExactRealAlgebra as RealAlgebra } from '@kkitahara/real-algebra'
 * import { LinearAlgebra } from '@kkitahara/linear-algebra'
 * import { Quasicrystal, SpaceGroup } from '@kkitahara/qc-tools'
 * let r = new RealAlgebra()
 * let l = new LinearAlgebra(r)
 *
 * // octagonal
 * let aPar = [
 *   1, r.$(1, 2, 2), 0, r.$(-1, 2, 2),
 *   0, r.$(1, 2, 2), 1, r.$(1, 2, 2)]
 * let aPerp = [
 *   1, r.$(-1, 2, 2), 0, r.$(1, 2, 2),
 *   0, r.$(1, 2, 2), -1, r.$(1, 2, 2)]
 * let qc = new Quasicrystal(r, 4, aPar, aPerp)
 * qc.dim // 4
 * qc.dimPar // 2
 * qc.dimPerp // 2
 * qc.aParCartn.getDim()[0] // 2
 * qc.aParCartn.getDim()[1] // 4
 * qc.aPerpCartn.getDim()[0] // 2
 * qc.aPerpCartn.getDim()[1] // 4
 * qc.bParCartn.getDim()[0] // 4
 * qc.bParCartn.getDim()[1] // 2
 * qc.bPerpCartn.getDim()[0] // 4
 * qc.bPerpCartn.getDim()[1] // 2
 *
 * let identity = l.$(
 *   1, 0, 0, 0,
 *   0, 1, 0, 0,
 *   0, 0, 1, 0,
 *   0, 0, 0, 1).setDim(4, 4)
 * l.eq(l.mmul(qc.bCartn, qc.aCartn), identity) // true
 *
 * l.eq(qc.aParCartn, aPar) // true
 * l.eq(qc.aPerpCartn, aPerp) // true
 * l.eq(qc._originFract, [0, 0, 0, 0]) // true
 * l.eq(qc._phasonMatrix, [0, 0, 0, 0]) // true
 *
 * r.eq(qc.hyperVolume, 4) // true
 *
 * // P 8 m m
 * let notrans = [0, 0, 0, 0]
 * let generators = [
 *   qc.genSGSymop([
 *     0, 0, 0, -1,
 *     1, 0, 0, 0,
 *     0, 1, 0, 0,
 *     0, 0, 1, 0], notrans),
 *   qc.genSGSymop([
 *     1, 0, 0, 0,
 *     0, 0, 0, -1,
 *     0, 0, -1, 0,
 *     0, -1, 0, 0], notrans)]
 * let ssg = qc.genSGFractFromGenerators(generators, 16)
 * ssg instanceof SpaceGroup // true
 * ssg.order // 16
 * ssg.dim // 4
 *
 * @example
 * import { RealAlgebra } from '@kkitahara/real-algebra'
 * import { LinearAlgebra } from '@kkitahara/linear-algebra'
 * import { Quasicrystal, SpaceGroup } from '@kkitahara/qc-tools'
 * let r = new RealAlgebra(1e-10)
 * let l = new LinearAlgebra(r)
 *
 * // face-centred icosahedral (primitive cell)
 * let a = r.$(1)
 * let t = r.iadd(r.$(1, 2), r.$(1, 2, 5))
 * let t2 = r.mul(t, t)
 * let tinv = r.div(1, t)
 * let twot = r.mul(2, t)
 * let aPar = l.smul([
 *   t2, 1, t, 0, twot, 0,
 *   t, t2, 1, 0, 0, twot,
 *   1, t, t2, twot, 0, 0], a)
 * let aPerp = l.smul([
 *   tinv, t, -1, 0, -2, 0,
 *   -1, tinv, t, 0, 0, -2,
 *   t, -1, tinv, -2, 0, 0], a)
 * let qc = new Quasicrystal(r, 6, aPar, aPerp)
 * qc instanceof Quasicrystal // true
 * qc.dim // 6
 * qc.dimPar // 3
 * qc.dimPerp // 3
 *
 * let identity = l.$(
 *   1, 0, 0, 0, 0, 0,
 *   0, 1, 0, 0, 0, 0,
 *   0, 0, 1, 0, 0, 0,
 *   0, 0, 0, 1, 0, 0,
 *   0, 0, 0, 0, 1, 0,
 *   0, 0, 0, 0, 0, 1).setDim(6, 6)
 *
 * l.eq(l.mmul(qc.bCartn, qc.aCartn), identity) // true
 *
 * // Fm-3-5
 * let generators = [
 *   qc.genSGSymop([
 *     1, 0, 0, 0, 1, 1,
 *     -1, 0, 0, 0, 0, 0,
 *     0, 1, 0, 1, -1, 0,
 *     1, 0, 1, 0, 1, 0,
 *     0, 0, 0, -1, 0, 0,
 *     0, 0, 0, 0, -1, 0], [0, 0, 0, 0, 0, 0]),
 *   qc.genSGSymop([
 *     0, 1, 0, 0, 0, 0,
 *     0, 0, 1, 0, 0, 0,
 *     1, 0, 0, 0, 0, 0,
 *     0, 0, 0, 0, 1, 0,
 *     0, 0, 0, 0, 0, 1,
 *     0, 0, 0, 1, 0, 0], [0, 0, 0, 0, 0, 0]),
 *   qc.genSGSymop([
 *     -1, 0, 0, 0, 0, 0,
 *     0, -1, 0, 0, 0, 0,
 *     0, 0, -1, 0, 0, 0,
 *     0, 0, 0, -1, 0, 0,
 *     0, 0, 0, 0, -1, 0,
 *     0, 0, 0, 0, 0, -1], [0, 0, 0, 0, 0, 0], l)]
 * let sg = qc.genSGFractFromGenerators(generators)
 * sg instanceof SpaceGroup // true
 * sg.order // 120
 * sg.dim // 6
 * qc.setSSGFractNoPhason(sg)
 *
 * // cubic phason strain
 * qc.setPhasonMatrix([
 *   1, 0, 0,
 *   0, 1, 0,
 *   0, 0, 1])
 *
 * l.eq(l.mmul(qc.bCartn, qc.aCartn), identity) // true
 *
 * let ssgSymopId = qc.ssgSymopId
 * ssgSymopId.length // 24
 *
 * // to cover 'cached` branch
 * ssgSymopId = qc.ssgSymopId
 * ssgSymopId.length // 24
 *
 * let ssgRightCosetsSymopId = qc.ssgRightCosetsSymopId
 * ssgRightCosetsSymopId.length // 5
 *
 * // to cover 'cached` branch
 * ssgRightCosetsSymopId = qc.ssgRightCosetsSymopId
 * ssgRightCosetsSymopId.length // 5
 *
 * // rhombohedral phason strain
 * qc.setPhasonMatrix([
 *   0, 0, r.$(1, 2),
 *   r.$(1, 2), 0, 0,
 *   0, r.$(1, 2), 0])
 *
 * ssgSymopId = qc.ssgSymopId
 * ssgSymopId.length // 6
 *
 * // to cover 'cached` branch
 * ssgSymopId = qc.ssgSymopId
 * ssgSymopId.length // 6
 *
 * ssgRightCosetsSymopId = qc.ssgRightCosetsSymopId
 * ssgRightCosetsSymopId.length // 20
 *
 * // to cover 'cached` branch
 * ssgRightCosetsSymopId = qc.ssgRightCosetsSymopId
 * ssgRightCosetsSymopId.length // 20
 *
 * @example
 * import { ExactRealAlgebra as RealAlgebra } from '@kkitahara/real-algebra'
 * import { LinearAlgebra } from '@kkitahara/linear-algebra'
 * import { Quasicrystal } from '@kkitahara/qc-tools'
 * let r = new RealAlgebra()
 * let l = new LinearAlgebra(r)
 * let half = r.$(1, 2)
 *
 * // cubic
 * let qc = new Quasicrystal(r, 3,
 *   [1, 0, 0, 0, 1, 0, 0, 0, 1], [])
 * qc.dim // 3
 * qc.dimPar // 3
 * qc.dimPerp // 0
 *
 * // I 2 1 3
 * let generators = [
 *   qc.genSGSymop([1, 0, 0, 0, 1, 0, 0, 0, 1], [half, half, half]),
 *   qc.genSGSymop([0, 0, 1, 1, 0, 0, 0, 1, 0], [0, 0, 0]),
 *   qc.genSGSymop([-1, 0, 0, 0, -1, 0, 0, 0, 1], [half, 0, half]),
 *   qc.genSGSymop([-1, 0, 0, 0, 1, 0, 0, 0, -1], [0, half, half])]
 * let sg = qc.genSGFractFromGenerators(generators, 24)
 * sg.order // 24
 *
 * let sg2 = sg.copy(l)
 * sg2 !== sg // true
 * sg2.order === sg.order // true
 * sg2.dim === sg.dim // true
 * sg2.symop[0] !== sg.symop[0] // true
 * l.eq(sg2.symop[0].rot, sg.symop[0].rot) // true
 *
 * qc.setSSGFractNoPhason(sg)
 *
 * let transSymopIds = qc.ssgNoPhasonTransSymopId
 * transSymopIds.length // 8
 *
 * // to cover 'cached' branch
 * transSymopIds = qc.ssgNoPhasonTransSymopId
 */
export class Quasicrystal {
  /**
   * @desc
   * The constructor function of the {@link Quasicrystal} class.
   *
   * @param {RealAlgebra} ralg
   * An instance of {@link RealAlgebra} to be used to manipulate
   * {@link RealNumber}s.
   *
   * @param {number} dim
   * The total dimension (parallel plus perpendicular).
   *
   * @param {RealNumber[]} aParCartn
   * Parallel-space components of lattice translation vectors (column vectors)
   * of the direct lattice represented in the Cartesian coordinate system (in
   * angstroms). The length of `aParCartn` is considered to be `dimPar * dim`,
   * and the elements are considered to be stored in row-major order.
   *
   * @param {RealNumber[]} aPerpCartn
   * Perpendicular-space components of lattice translation vectors (column
   * vectors) of the direct lattice represented in the Cartesian coordinate
   * system (in angstroms). The length of `aPerpCartn` is considered to be
   * `dimPerp * dim`, and the elements are considered to be stored in
   * row-major order.
   *
   * @param {number} [eps = DEFAULT_EPS]
   * A tolerance for equality in numerical algebra.
   *
   * @return {Quasicrystal|Error}
   * An instance of {@link Quasicrystal} on successful exit, or an
   * {@link InvalidValue}.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (ralg, dim, aParCartn, aPerpCartn, eps = DEFAULT_EPS) {
    if (!(ralg instanceof RealAlgebra)) {
      return new InvalidValue(` (in Quasicrystal.constructor)
        \`ralg\` must be an instance of \`RealAlgebra\`.`)
    }
    const lalg = new LinearAlgebra(ralg)
    if (!Number.isInteger(dim) || dim < 1) {
      return new InvalidValue(` (in Quasicrystal.constructor)
        \`dim\` must be a positive (non-zero) integer.`)
    }
    if (!Array.isArray(aParCartn)) {
      return new InvalidValue(` (in Quasicrystal.constructor)
        \`aParCartn\` must be an array.`)
    }
    aParCartn = lalg.copy(aParCartn).setDim(0, dim)
    const dimPar = aParCartn.getDim()[0]
    aParCartn.setDim(dimPar, dim)
    if (!Array.isArray(aPerpCartn)) {
      return new InvalidValue(` (in Quasicrystal.constructor)
        \`aPerpCartn\` must be an array.`)
    }
    aPerpCartn = lalg.copy(aPerpCartn).setDim(0, dim)
    const dimPerp = aPerpCartn.getDim()[0]
    aPerpCartn.setDim(dimPerp, dim)
    if (dim !== dimPar + dimPerp) {
      return new InvalidValue(` (in Quasicrystal.constructor)
        \`dim\` must be equal to \`dimPar + \`dimPerp\`.`)
    }
    const palg = new PolytopeAlgebra(dimPerp, lalg)
    const aCartn = lalg.$(...aParCartn, ...aPerpCartn).setDim(dim, dim)
    const dimp1 = dim + 1
    let m = [...new Array(dim * dim)].map((x, i) => i % dimp1 === 0 ? 1 : 0)
    const aLU = lalg.lup(aCartn)
    const bCartn = lalg.isolve(aLU, lalg.$(...m).setDim(dim, dim))
    m = lalg.transpose(bCartn)
    const bParCartn = lalg.itranspose(
      lalg.$(...m.slice(0, aParCartn.length)).setDim(dimPar, dim))
    const bPerpCartn = lalg.itranspose(
      lalg.$(...m.slice(aParCartn.length)).setDim(dimPerp, dim))
    const hyperVolume = ralg.abs(lalg.det(aLU))
    const rnum = new RealAlgebra(eps)
    const cnum = new ComplexAlgebra(rnum)
    const lnum = new LinearAlgebra(rnum)
    const pnum = new PolytopeAlgebra(dimPerp, lnum)
    /**
     * @desc
     * The {@link Quasicrystal#_ralg} stores the instance of {@link RealAlgebra}
     * for manipulating {@link RealNumber}s in `this` quasicrystal.
     *
     * Users should not change this property directly.
     *
     * @type {RealAlgebra}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._ralg = ralg
    /**
     * @desc
     * The {@link Quasicrystal#_lalg} stores the instance of
     * {@link LinearAlgebra} for manipulating vectors and matrices in `this`
     * quasicrystal.
     *
     * Users should not change this property directly.
     *
     * @type {LinearAlgebra}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._lalg = lalg
    /**
     * @desc
     * The {@link Quasicrystal#_palg} stores the instance of
     * {@link PolytopeAlgebra} for manipulating atomic surfaces (as polytopes)
     * in `this` quasicrystal.
     *
     * Users should not change this property directly.
     *
     * @type {PolytopeAlgebra}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._palg = palg
    /**
     * @desc
     * The {@link Quasicrystal#_rnum} stores the instance of {@link RealAlgebra}
     * for manipulating {@link RealNumber}s numerically in `this` quasicrystal.
     *
     * Users should not change this property directly.
     *
     * @type {RealAlgebra}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._rnum = rnum
    /**
     * @desc
     * The {@link Quasicrystal#_cnum} stores the instance of
     * {@link ComplexAlgebra} for manipulating {@link ComplexNumber}s
     * numerically in `this` quasicrystal.
     *
     * Users should not change this property directly.
     *
     * @type {RealAlgebra}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._cnum = cnum
    /**
    /**
     * @desc
     * The {@link Quasicrystal#_lnum} stores the instance of
     * {@link LinearAlgebra} for manipulating vectors and matrices numerically
     * in `this` quasicrystal.
     *
     * Users should not change this property directly.
     *
     * @type {LinearAlgebra}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._lnum = lnum
    /**
     * @desc
     * The {@link Quasicrystal#_pnum} stores the instance of
     * {@link PolytopeAlgebra} for manipulating atomic surfaces (as polytopes)
     * numerically in `this` quasicrystal.
     *
     * Users should not change this property directly.
     *
     * @type {PolytopeAlgebra}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._pnum = pnum

    /**
     * @desc
     * The {@link Quasicrystal#_dimPar} is the dimension of the parallel space
     * of `this` quasicrystal.
     *
     * Users should not change this property directly.
     *
     * @type {number}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._dimPar = dimPar
    /**
     * @desc
     * The {@link Quasicrystal#_dimPerp} is the dimension of the perpendicular
     * space of `this` quasicrystal.
     *
     * Users should not change this property directly.
     *
     * @type {number}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._dimPerp = dimPerp
    /**
     * @desc
     * The {@link Quasicrystal#_aParCartn} is the parallel-space components of
     * the lattice translation vectors (column vectors) of the direct lattice of
     * `this` quasicrystal represented in the Cartesian coordinate system (in
     * angstroms). Its dimension is `this.dimPar * this.dim`. The elements are
     * stored in row-major order.
     *
     * Users should not change this property directly.
     *
     * @type {Matrix}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._aParCartn = aParCartn
    /**
     * @desc
     * The {@link Quasicrystal#_aPerpCartnNoPhason} is the perpendicular-space
     * components of the lattice translation vectors (column vectors) of the
     * direct lattice of `this` quasicrystal represented in the Cartesian
     * coordinate system (in angstroms). Its dimension is `this.dimPerp *
     * this.dim`. The elements are stored in row-major order.
     *
     * Users should not change this property directly.
     *
     * @type {Matrix}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._aPerpCartnNoPhason = aPerpCartn
    /**
     * @desc
     * The {@link Quasicrystal#_bParCartnNoPhason} is the parallel-space
     * components of the lattice translation vectors (row vectors) of the
     * reciprocal lattice of `this` quasicrystal represented in the Cartesian
     * coordinate system (in reciprocal angstroms). Its dimension is
     * `this.dim * this.dimPar`. The elements are stored in row-major order.
     *
     * Users should not change this property directly.
     *
     * @type {Matrix}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._bParCartnNoPhason = bParCartn
    /**
     * @desc
     * The {@link Quasicrystal#_bPerpCartn} is the perpendicular-space
     * components of the lattice translation vectors (row vectors) of the
     * reciprocal lattice of `this` quasicrystal represented in the Cartesian
     * coordinate system (in reciprocal angstroms). Its dimension is `this.dim *
     * this.dimPerp`. The elements are stored in row-major order.
     *
     * Users should not change this property directly.
     *
     * @type {Matrix}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._bPerpCartn = bPerpCartn
    /**
     * @desc
     * The {@link Quasicrystal#_hyperVolume} is the hyper volume of a unit cell
     * of `this` quasicrystal in angstroms to the `this.dim`-th power.
     *
     * Users should not change this property directly.
     *
     * @type {RealNumber}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._hyperVolume = hyperVolume
    /**
     * @desc
     * The {@link Quasicrystal#_hyperVolumeNumerical} is the numeical value of
     * the hyper volume of a unit cell of `this` quasicrystal in angstroms to
     * the `this.dim`-th power.
     *
     * Users should not change this property directly.
     *
     * @type {number}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._hyperVolumeNumerical = rnum.copy(hyperVolume)
    /**
     * @desc
     * The {@link Quasicrystal#_originFract} is the origin of the phisical
     * space represented in the fractional coordinate of `this` quasicrystal.
     *
     * Users should not change this property directly.
     *
     * @type {Matrix}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._originFract = lalg.$(...new Array(dim).fill(0))
    /**
     * @desc
     * The {@link Quasicrystal#_phasonMatrix} is the linear phason strain matrix
     * applied to `this` quasicrystal. A phason matrix (`T`) is applied to a
     * lattice translation vector (`a`) as
     * ```
     *  / a_par  \             / 1 0 \     / a_par  \
     * |          |         = |       | * |          |
     *  \ a_perp /_strained    \ T 1 /     \ a_perp /
     * ```
     * The elements are stored in row-major order.
     *
     * Users should not change this property directly.
     *
     * @type {Matrix}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._phasonMatrix = lalg.$(...new Array(dimPerp * dimPar).fill(0))
      .setDim(dimPerp, dimPar)
    /**
     * @desc
     * The {@link Quasicrystal#_ssgFractNoPhason} is the super space group of
     * `this` quasicrystal under no phason strain represented in the
     * fractional coordinate system.
     *
     * Users should not change this property directly.
     *
     * @type {SpaceGroup}
     *
     * @version 1.0.0
     * @since 1.0.0
     */
    this._ssgFractNoPhason =
      new SpaceGroup([SpaceGroupSymop.identity(lalg, dim)])
    this._atomType = Object.create(null)
    this._atomSite = Object.create(null)
    this._atomicSurface = Object.create(null)
    // caches
    this._aPerpCartn = new WeakMap()
    this._bParCartn = new WeakMap()
    this._ssgFractNoPhasonNumerical = new WeakMap()
    this._ssgParCartnNoPhason = new WeakMap()
    this._ssgPerpCartnNoPhason = new WeakMap()
    this._ssgNoPhasonTransSymopId = new WeakMap()
    this._ssgSymopId = new MultiKeyWeakMap()
    this._ssgFract = new MultiKeyWeakMap()
    this._ssgParCartn = new MultiKeyWeakMap()
    this._ssgPerpCartn = new MultiKeyWeakMap()
    this._ssgRightCosetsSymopId = new MultiKeyWeakMap()
    this._ssgNoPhasonSymAtomSite = new MultiKeyWeakMap()
    this._ssgSymAtomSite = new MultiKeyWeakMap()
  }

  toJSON () {
    const obj = {
      aux: this.aux || {} // ad hoc
    }
    obj.reviver = '@kkitahara/qc-tools:Quasicrystal'
    obj.version = 'experimental'
    obj.dim = this.dim
    obj.aParCartn = this._aParCartn
    obj.aPerpCartnNoPhason = this._aPerpCartnNoPhason
    obj.originFract = this._originFract
    obj.phasonMatrix = this._phasonMatrix
    obj.ssgFractNoPhason = this._ssgFractNoPhason.symop.map(
      g => [g.rot.slice(), g.trans.slice()])
    obj.atomType = Object.entries(this._atomType).map(([symbol, atomType]) => {
      const scatHiAngFoxCoeffs = atomType._scatHiAngFoxCoeffs
      scatHiAngFoxCoeffs[2] *= 10
      scatHiAngFoxCoeffs[3] *= 100
      return {
        symbol: symbol,
        scatCromerMannCoeffs: atomType._scatCromerMannCoeffs,
        scatHiAngFoxCoeffs: scatHiAngFoxCoeffs }
    })
    obj.atomSite = Object.entries(this._atomSite).map(([label, atomSite]) => {
      return {
        label: label,
        posFract: atomSite.posFract }
    })
    obj.atomicSurface = Object.entries(this._atomicSurface).map(
      ([label, atomicSurface]) => {
        const occDomainAsym = {
          atomSiteLabel: atomicSurface.occDomainAsym.atomSiteLabel,
          polytopeJSON: JSON.stringify(atomicSurface.occDomainAsym.polytope) }
        return {
          label: label,
          atomTypeSymbol: atomicSurface.atomTypeSymbol,
          occupancy: atomicSurface.occupancy,
          adTensorBeta: atomicSurface.adTensorBeta,
          occDomainAsym: occDomainAsym,
          displayColour: atomicSurface.displayColour,
          displayOpacity: atomicSurface.displayOpacity,
          displayRadius: atomicSurface.displayRadius
        }
      })
    return obj
  }

  static reviver (ralg, eps = DEFAULT_EPS) {
    const lalg = new LinearAlgebra(ralg)
    return (key, value) => {
      if (value !== null && typeof value === 'object' &&
          value.reviver === '@kkitahara/qc-tools:Quasicrystal') {
        if (value.version === 'experimental') {
          const dim = value.dim
          const aParCartn = value.aParCartn
          const aPerpCartn = value.aPerpCartnNoPhason
          const qc = new Quasicrystal(ralg, dim, aParCartn, aPerpCartn, eps)
          qc.aux = value.aux || {} // ad hoc
          qc._originFract = value.originFract
          qc.setPhasonMatrix(value.phasonMatrix)
          qc.setSSGFractNoPhason(qc.genSpaceGroup(...value.ssgFractNoPhason.map(
            ([rot, trans]) => qc.genSGSymop(rot, trans))))
          value.atomType.forEach(({
            symbol,
            scatCromerMannCoeffs,
            scatHiAngFoxCoeffs
          }) => {
            qc.setAtomType(symbol,
              new AtomType(scatCromerMannCoeffs, scatHiAngFoxCoeffs))
          })
          value.atomSite.forEach(({
            label,
            posFract
          }) => qc.setAtomSite(label, posFract))
          const palg = qc._palg
          value.atomicSurface.forEach(({
            label,
            atomTypeSymbol,
            occupancy,
            adTensorBeta,
            occDomainAsym,
            displayColour,
            displayOpacity,
            displayRadius
          }) => {
            const odAsym = new OccupationDomain(
              occDomainAsym.atomSiteLabel,
              JSON.parse(occDomainAsym.polytopeJSON, palg.reviver))
            qc.setAtomicSurface(label, new AtomicSurface(atomTypeSymbol,
              occupancy, adTensorBeta, odAsym, displayColour, displayOpacity,
              displayRadius))
          })
          return qc
        } else {
          throw Error('invalid version.')
        }
      } else {
        return lalg.reviver(key, value)
      }
    }
  }

  /**
   * @desc
   * The {@link Quasicrystal#dim} is the total dimension (parallel plus
   * perpendicular) of `this` quasicrystal.
   *
   * @type {number}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get dim () {
    return this._dimPar + this._dimPerp
  }

  /**
   * @desc
   * The {@link Quasicrystal#dimPar} is the dimension of the parallel space of
   * `this` quasicrystal.
   *
   * @type {number}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get dimPar () {
    return this._dimPar
  }

  /**
   * @desc
   * The {@link Quasicrystal#dimPerp} is the dimension of the perpendicular
   * space of `this` quasicrystal.
   *
   * @type {number}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get dimPerp () {
    return this._dimPerp
  }

  /**
   * @desc
   * The {@link Quasicrystal#aParCartn} is the parallel-space components of the
   * lattice translation vectors (column vectors) of the direct lattice of
   * `this` quasicrystal represented in the Cartesian coordinate system (in
   * angstroms). Its dimension is `this.dimPar * this.dim`. The elements are
   * stored in row-major order.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get aParCartn () {
    return this._lalg.copy(this._aParCartn)
  }

  /**
   * @desc
   * The {@link Quasicrystal#aPerpCartnNoPhason} is the perpendicular-space
   * components of the lattice translation vectors (column vectors) of the
   * direct lattice of `this` quasicrystal under no phason strain represented
   * in the Cartesian coordinate system (in angstroms). Its dimension is
   * `this.dimPerp * this.dim`. The elements are stored in row-major order.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get aPerpCartnNoPhason () {
    return this._lalg.copy(this._aPerpCartnNoPhason)
  }

  /**
   * @desc
   * The {@link Quasicrystal#aPerpCartn} is the perpendicular-space components
   * of the lattice translation vectors (column vectors) of the direct lattice
   * of `this` quasicrystal under the current phason strain represented in the
   * Cartesian coordinate system (in angstroms). Its dimension is
   * `this.dimPerp * this.dim`. The elements are stored in row-major order.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get aPerpCartn () {
    const phasonMatrix = this._phasonMatrix
    const lalg = this._lalg
    let aPerpCartn = this._aPerpCartn.get(phasonMatrix)
    if (!aPerpCartn) {
      aPerpCartn = lalg.iadd(lalg.mmul(phasonMatrix, this._aParCartn),
        this._aPerpCartnNoPhason)
      this._aPerpCartn.set(phasonMatrix, aPerpCartn)
    }
    return lalg.copy(aPerpCartn)
  }

  /**
   * @desc
   * The {@link Quasicrystal#aCartnNoPhason} is the lattice translation vectors
   * (column vectors) of the direct lattice of `this` quasicrystal under no
   * phason strain represented in the Cartesian coordinate system (in
   * angstroms). Its dimension is `this.dim * this.dim`. The elements are stored
   * in row-major order.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get aCartnNoPhason () {
    const dim = this.dim
    return this._lalg.$(...this.aParCartn, ...this.aPerpCartnNoPhason)
      .setDim(dim, dim)
  }

  /**
   * @desc
   * The {@link Quasicrystal#aCartn} is the lattice translation vectors (column
   * vectors) of the direct lattice of `this` quasicrystal under the current
   * phason strain represented in the Cartesian coordinate system (in
   * angstroms). Its dimension is `this.dim * this.dim`. The elements are stored
   * in row-major order.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get aCartn () {
    const dim = this.dim
    return this._lalg.$(...this.aParCartn, ...this.aPerpCartn).setDim(dim, dim)
  }

  /**
   * @desc
   * The {@link Quasicrystal#bParCartnNoPhason} is the parallel-space components
   * of the lattice translation vectors (row vectors) of the reciprocal lattice
   * of `this` quasicrystal under no phason strain represented in the Cartesian
   * coordinate system (in reciprocal angstroms). Its dimension is `this.dim *
   * this.dimPar`. The elements are stored in row-major order.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get bParCartnNoPhason () {
    return this._lalg.copy(this._bParCartnNoPhason)
  }

  /**
   * @desc
   * The {@link Quasicrystal#bParCartn} is the parallel-space components of the
   * lattice translation vectors (row vectors) of the reciprocal lattice of
   * `this` quasicrystal under the current phason strain represented in the
   * Cartesian coordinate system (in reciprocal angstroms). Its dimension is
   * `this.dim * this.dimPar`. The elements are stored in row-major order.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get bParCartn () {
    const phasonMatrix = this._phasonMatrix
    const lalg = this._lalg
    let bParCartn = this._bParCartn.get(phasonMatrix)
    if (!bParCartn) {
      bParCartn = lalg.sub(this._bParCartnNoPhason, lalg.mmul(this._bPerpCartn,
        phasonMatrix))
      this._bParCartn.set(phasonMatrix, bParCartn)
    }
    return lalg.copy(bParCartn)
  }

  /**
   * @desc
   * The {@link Quasicrystal#bPerpCartn} is the perpendicular-space components
   * of the lattice translation vectors (row vectors) of the direct lattice of
   * `this` quasicrystal represented in the Cartesian coordinate system (in
   * angstroms). Its dimension is `this.dimPar * this.dim`. The elements are
   * stored in row-major order.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get bPerpCartn () {
    return this._lalg.copy(this._bPerpCartn)
  }

  /**
   * @desc
   * The {@link Quasicrystal#bCartnNoPhason} is the lattice translation vectors
   * (row vectors) of the reciprocal lattice of `this` quasicrystal under no
   * phason strain represented in the Cartesian coordinate system (in reciprocal
   * angstroms). Its dimension is `this.dim * this.dimPar`. The elements are
   * stored in row-major order.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get bCartnNoPhason () {
    const lalg = this._lalg
    const dim = this.dim
    return lalg.itranspose(lalg.$(...lalg.itranspose(this.bParCartnNoPhason),
      ...lalg.itranspose(this.bPerpCartn)).setDim(dim, dim))
  }

  /**
   * @desc
   * The {@link Quasicrystal#bCartn} is the lattice translation vectors (row
   * vectors) of the reciprocal lattice of `this` quasicrystal under the current
   * phason strain represented in the Cartesian coordinate system (in reciprocal
   * angstroms). Its dimension is `this.dim * this.dimPar`. The elements are
   * stored in row-major order.
   *
   * @type {Matrix}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get bCartn () {
    const lalg = this._lalg
    const dim = this.dim
    return lalg.itranspose(lalg.$(...lalg.itranspose(this.bParCartn),
      ...lalg.itranspose(this.bPerpCartn)).setDim(dim, dim))
  }

  /**
   * @desc
   * The {@link Quasicrystal#hyperVolume} is the getter for the
   * {@link Quasicrystal#_hyperVolume}
   *
   * @type {RealNumber}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get hyperVolume () {
    const ralg = this._ralg
    return ralg.copy(this._hyperVolume)
  }

  /**
   * @desc
   * The {@link Quasicrystal#hyperVolumeNumerical} is the getter for the
   * {@link Quasicrystal#_hyperVolumeNumerical}
   *
   * @type {number}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get hyperVolumeNumerical () {
    return this._hyperVolumeNumerical
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgFractNoPhason} is the getter for the super space
   * group of `this` quasicrystal under no phason strain represented in the
   * fractional coordinate system of `this` quasicrystal.
   *
   * @type {SpaceGroup}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get ssgFractNoPhason () {
    return this._ssgFractNoPhason.copy(this._lalg)
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgFractNoPhasonNumerical} is the numerical version
   * of the {@link Quasicrystal#ssgFractNoPhason}.
   *
   * @type {SpaceGroup}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get ssgFractNoPhasonNumerical () {
    const lnum = this._lnum
    const ssgFractNoPhason = this._ssgFractNoPhason
    let ssgFractNoPhasonNumerical =
      this._ssgFractNoPhasonNumerical.get(ssgFractNoPhason)
    if (!ssgFractNoPhasonNumerical) {
      ssgFractNoPhasonNumerical = ssgFractNoPhason.copy(lnum)
      this._ssgFractNoPhasonNumerical.set(ssgFractNoPhason,
        ssgFractNoPhasonNumerical)
    }
    return ssgFractNoPhasonNumerical.copy(lnum)
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgParCartnNoPhason} is the super space group of
   * `this` quasicrystal projected onto the parallel space under the no phason
   * strain represented in the Cartesian coordinate system.
   *
   * @type {SpaceGroup}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get ssgParCartnNoPhason () {
    const lalg = this._lalg
    const ssgFractNoPhason = this._ssgFractNoPhason
    let ssgParCartnNoPhason = this._ssgParCartnNoPhason.get(ssgFractNoPhason)
    if (!ssgParCartnNoPhason) {
      const aParCartn = this.aParCartn
      const bParCartnNoPhason = this.bParCartnNoPhason
      const symop = ssgFractNoPhason.symop.map(symopi => {
        const rot = lalg.mmul(aParCartn, lalg.mmul(symopi.rot,
          bParCartnNoPhason))
        const trans = lalg.mmul(aParCartn, symopi.trans)
        return new SpaceGroupSymop(rot, trans)
      })
      ssgParCartnNoPhason = new SpaceGroup(symop)
      this._ssgParCartnNoPhason.set(ssgFractNoPhason, ssgParCartnNoPhason)
    }
    return ssgParCartnNoPhason.copy(lalg)
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgPerpCartnNoPhason} is the super space group of
   * `this` quasicrystal projected onto the perpendicular space under the no
   * phason strain represented in the Cartesian coordinate system.
   *
   * @type {SpaceGroup}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get ssgPerpCartnNoPhason () {
    const lalg = this._lalg
    const ssgFractNoPhason = this._ssgFractNoPhason
    let ssgPerpCartnNoPhason = this._ssgPerpCartnNoPhason.get(ssgFractNoPhason)
    if (!ssgPerpCartnNoPhason) {
      const aPerpCartnNoPhason = this.aPerpCartnNoPhason
      const bPerpCartn = this.bPerpCartn
      const symop = ssgFractNoPhason.symop.map(symopi => {
        const rot = lalg.mmul(aPerpCartnNoPhason, lalg.mmul(symopi.rot,
          bPerpCartn))
        const trans = lalg.mmul(aPerpCartnNoPhason, symopi.trans)
        return new SpaceGroupSymop(rot, trans)
      })
      ssgPerpCartnNoPhason = new SpaceGroup(symop)
      this._ssgPerpCartnNoPhason.set(ssgFractNoPhason, ssgPerpCartnNoPhason)
    }
    return ssgPerpCartnNoPhason.copy(lalg)
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgNoPhasonTransSymopId} is an array containing
   * arrays containing indices of super-space-group symmetry operations. Each
   * array contains the indices (in the super space group) of the operations of
   * which translation vector is equivalent to each other.
   *
   * @type {Array}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get ssgNoPhasonTransSymopId () {
    const lalg = this._lalg
    const ssgFractNoPhason = this._ssgFractNoPhason
    let ssgNoPhasonTransSymopId =
      this._ssgNoPhasonTransSymopId.get(ssgFractNoPhason)
    if (!ssgNoPhasonTransSymopId) {
      ssgNoPhasonTransSymopId = ssgFractNoPhason.genStar(null,
        (x, gi) => gi.trans,
        (t1, t2) => lalg.isInteger(lalg.sub(t1, t2))).starSymopIds
      this._ssgNoPhasonTransSymopId.set(ssgFractNoPhason,
        ssgNoPhasonTransSymopId)
    }
    return ssgNoPhasonTransSymopId.map(gIds => gIds.slice())
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgSymopId} is an array containing the indices (in
   * the super space group under no phason strain) of the super-space-group
   * symmetry operations of `this` quasicrystal under the current phason strain.
   *
   * @type {Array}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get ssgSymopId () {
    const ssgFractNoPhason = this._ssgFractNoPhason
    const phasonMatrix = this._phasonMatrix
    let ssgSymopId = this._ssgSymopId.get([ssgFractNoPhason, phasonMatrix])
    if (!ssgSymopId) {
      ssgSymopId = ssgFractNoPhason.symop
        .map((gi, i) => [gi, i])
        .filter(([gi]) => this.isSSGSymopFract(gi))
        .map(([, i]) => i)
      this._ssgSymopId.set([ssgFractNoPhason, phasonMatrix], ssgSymopId)
    }
    return ssgSymopId.slice()
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgRightConsetsSymopId} is an array containing
   * arrays containing indices of super-space-group symmetry operations. Each
   * array contains the indices (in the super space group under no phason
   * strain) of the super-space-group symmetry operations in a right coset of
   * the super space group under the current phason strain. The first array
   * contains the indices of the operations in the super space group under the
   * current phason strain, i.e. the right coset with respect to the identity.
   *
   * @type {Array}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get ssgRightCosetsSymopId () {
    const ssgFractNoPhason = this._ssgFractNoPhason
    const phasonMatrix = this._phasonMatrix
    let ssgRightCosetsSymopId =
      this._ssgRightCosetsSymopId.get([ssgFractNoPhason, phasonMatrix])
    if (!ssgRightCosetsSymopId) {
      const lalg = this._lalg
      const ssgSymopId = this.ssgSymopId
      const ssgFractNoPhasonSymop = ssgFractNoPhason.symop
      const rcSymopId = [[]]
      const rc = [ssgSymopId.map(id => ssgFractNoPhasonSymop[id])]
      ssgFractNoPhasonSymop.forEach((gi, i) => {
        let gj = ssgFractNoPhasonSymop[ssgSymopId[0]]
        let rot = lalg.mmul(gj.rot, gi.rot)
        let trans = lalg.iadd(lalg.mmul(gj.rot, gi.trans), gj.trans)
        if (rc.every((rck, k) => {
          if (rcSymopId[k].length !== rck.length && rck.some(gl =>
            lalg.eq(gl.rot, rot) && lalg.isInteger(lalg.sub(gl.trans, trans))
          )) {
            rcSymopId[k].push(i)
            return false
          }
          return true
        })) {
          rcSymopId.push([i])
          rc.push([
            new SpaceGroupSymop(rot, trans),
            ...ssgSymopId.slice(1).map(id => {
              gj = ssgFractNoPhasonSymop[id]
              rot = lalg.mmul(gj.rot, gi.rot)
              trans = lalg.iadd(lalg.mmul(gj.rot, gi.trans), gj.trans)
              return new SpaceGroupSymop(rot, trans)
            })
          ])
        }
      })
      ssgRightCosetsSymopId = rcSymopId
      this._ssgRightCosetsSymopId.set(
        [ssgFractNoPhason, phasonMatrix], ssgRightCosetsSymopId)
    }
    return ssgRightCosetsSymopId.map(
      ssgRCSymopId => ssgRCSymopId.slice())
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgFract} is the the super space group of `this`
   * quasicrystal represented in the fractional coordinate system under the
   * current phason strain.
   *
   * Order of the operations conforms to the {@link Quasicrystal#ssgSymopId}.
   *
   * @type {SpaceGroup}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get ssgFract () {
    const lalg = this._lalg
    const ssgFractNoPhason = this._ssgFractNoPhason
    const phasonMatrix = this._phasonMatrix
    let ssgFract = this._ssgFract.get([ssgFractNoPhason, phasonMatrix])
    if (!ssgFract) {
      const ssgFractNoPhasonSymop = ssgFractNoPhason.symop
      ssgFract = new SpaceGroup(this.ssgSymopId.map(
        id => ssgFractNoPhasonSymop[id]))
      this._ssgFract.set([ssgFractNoPhason, phasonMatrix], ssgFract)
    }
    return ssgFract.copy(lalg)
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgParCartn} is the super space group of `this`
   * quasicrystal projected onto the parallel space under the current phason
   * strain represented in the Cartesian coordinate system.
   *
   * Order of the operations conforms to the {@link Quasicrystal#ssgSymopId}.
   *
   * @type {SpaceGroup}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get ssgParCartn () {
    const lalg = this._lalg
    const ssgFractNoPhason = this._ssgFractNoPhason
    const phasonMatrix = this._phasonMatrix
    let ssgParCartn = this._ssgParCartn.get([ssgFractNoPhason, phasonMatrix])
    if (!ssgParCartn) {
      const ssgFractNoPhasonSymop = ssgFractNoPhason.symop
      const aParCartn = this.aParCartn
      const bParCartn = this.bParCartn
      ssgParCartn = new SpaceGroup(this.ssgSymopId.map(id => {
        const gi = ssgFractNoPhasonSymop[id]
        const rot = lalg.mmul(aParCartn, lalg.mmul(gi.rot, bParCartn))
        const trans = lalg.mmul(aParCartn, gi.trans)
        return new SpaceGroupSymop(rot, trans)
      }))
      this._ssgParCartn.set([ssgFractNoPhason, phasonMatrix], ssgParCartn)
    }
    return ssgParCartn.copy(lalg)
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgPerpCartn} is the super space group of `this`
   * quasicrystal projected onto the perpendicular space under the current
   * phason strain represented in the Cartesian coordinate system.
   *
   * Order of the operations conforms to the {@link Quasicrystal#ssgSymopId}.
   *
   * @type {SpaceGroup}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get ssgPerpCartn () {
    const lalg = this._lalg
    const ssgFractNoPhason = this._ssgFractNoPhason
    const phasonMatrix = this._phasonMatrix
    let ssgPerpCartn = this._ssgPerpCartn.get([ssgFractNoPhason, phasonMatrix])
    if (!ssgPerpCartn) {
      const ssgFractNoPhasonSymop = ssgFractNoPhason.symop
      const aPerpCartn = this.aPerpCartn
      const bPerpCartn = this.bPerpCartn
      ssgPerpCartn = new SpaceGroup(this.ssgSymopId.map(id => {
        const gi = ssgFractNoPhasonSymop[id]
        const rot = lalg.mmul(aPerpCartn, lalg.mmul(gi.rot, bPerpCartn))
        const trans = lalg.mmul(aPerpCartn, gi.trans)
        return new SpaceGroupSymop(rot, trans)
      }))
      this._ssgPerpCartn.set([ssgFractNoPhason, phasonMatrix], ssgPerpCartn)
    }
    return ssgPerpCartn.copy(lalg)
  }

  /**
   * @desc
   * The {@link Quasicrystal#setSSGFractNoPhason} sets `ssgFractNoPhason` to the
   * `this._ssgFractNoPhason`. If `ssgFract` is not a space group of the
   * dimension to which `this` quasicrystal conforms, `this._ssgFractNoPhason`
   * is not set at `ssgFractNoPhason`.
   *
   * CAUTION: `ssgFractNoPhason` must be a super space group under no phason
   * strain, but currently this condition is not checked.
   *
   * @param {SpaceGroup} ssgFractNoPhason
   * A super space group to be set.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  setSSGFractNoPhason (ssgFractNoPhason) {
    const dim = this.dim
    if (
      ssgFractNoPhason instanceof SpaceGroup &&
      ssgFractNoPhason.dim === dim
    ) {
      this._ssgFractNoPhason = ssgFractNoPhason
    }
  }

  /**
   * @desc
   * The {@link Quasicrystal#setPhasonMatrix} sets `phasonMatrix` to the
   * `this._phasonMatrix`.
   *
   * If `phasonMatrix` cannot be interpreted as a matrix of the dimension
   * `this.dimPerp * this.dimPar`, `this._phasonMatrix` is not set at
   * `this.phasonMatrix`.
   *
   * @param {RealNumber[]} phasonMatrix
   * An array of real numbers representing a phason matrix.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  setPhasonMatrix (phasonMatrix) {
    const dimPar = this.dimPar
    const dimPerp = this.dimPerp
    const lalg = this._lalg
    if (
      Array.isArray(phasonMatrix) && phasonMatrix.length === dimPar * dimPerp
    ) {
      this._phasonMatrix = lalg.$(...phasonMatrix).setDim(dimPerp, dimPar)
    }
  }

  setAtomType (atomTypeSymbol, atomType) {
    if (atomType instanceof AtomType) {
      this._atomType[atomTypeSymbol] = atomType
    }
  }

  removeAtomType (atomTypeSymbol) {
    delete this._atomType[atomTypeSymbol]
  }

  getAtomTypeEntries () {
    return Object.entries(this._atomType)
  }

  /**
   * @desc
   * The {@link Quasicrystal#setAtomSite} sets a new instance of the
   * {@link AtomSite} which represents an atom site at `posFract` in the
   * fractional coordinate system to `this` quasicrystal with the given label
   * `label`.
   *
   * @param {string} atomSiteLabel
   * Used as a key.
   *
   * @param {RealNumber[]} posFract
   * The position of the atom site to be generated in the fractional coordinate
   * system of `this` quasicrystal.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  setAtomSite (atomSiteLabel, posFract) {
    const dim = this.dim
    if (Array.isArray(posFract) && posFract.length === dim) {
      this._atomSite[atomSiteLabel] = new AtomSite(posFract)
    }
  }

  removeAtomSite (atomSiteLabel) {
    delete this._atomSite[atomSiteLabel]
  }

  getAtomSiteEntries () {
    return Object.entries(this._atomSite)
  }

  getAtomSite (atomSiteLabel) {
    return this._atomSite[atomSiteLabel]
  }

  // currently, only the first equivalent position is supported
  getAtomSiteLabel (posFract) {
    const lalg = this._lalg
    for (const [label, atomSite] of this.getAtomSiteEntries()) {
      if (lalg.isInteger(lalg.sub(atomSite.posFract, posFract))) {
        return label
      }
    }
  }

  setAtomicSurface (atomicSurfaceLabel, atomicSurface) {
    const dim = this.dim
    const dimPerp = this.dimPerp
    if (
      atomicSurface instanceof AtomicSurface &&
      atomicSurface.dim === dim &&
      atomicSurface.dimPerp === dimPerp
    ) {
      this._atomicSurface[atomicSurfaceLabel] = atomicSurface
    }
  }

  removeAtomicSurface (atomicSurfaceLabel) {
    delete this._atomicSurface[atomicSurfaceLabel]
  }

  getAtomicSurfaceEntries () {
    return Object.entries(this._atomicSurface)
  }

  getAtomicSurfaceEntriesAtAtomSite (atomSiteLabel) {
    return this.getAtomicSurfaceEntries().filter(
      ([, surf]) => atomSiteLabel === surf.occDomainAsym.atomSiteLabel)
  }

  /**
   * @desc
   * The {@link Quasicrystal#genSGSymop} returns a new instance of
   * {@link SpaceGroupSymop} constructed from a rotation matrix `rot` and a
   * translation vector `trans`.
   *
   * @param {RealNumber[]} rot
   * An array containing `dim * dim` elements of rotation matrix in row-major
   * order.
   *
   * @param {RealNumber[]} trans
   * An array containing `dim` elements of translation vector.
   *
   * @return {SpaceGroupSymop|Error}
   * An instance of {@link SpaceGroupSymop} on successful exit, or an
   * {@link InvalidValue}.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  genSGSymop (rot, trans) {
    const lalg = this._lalg
    const dim = this.dim
    if (!Array.isArray(rot) || rot.length !== dim * dim) {
      return new InvalidValue(` (in Quasicrystal.genSGSymop)
        \`rot\` must be an array of length \`dim * dim\`.`)
    }
    if (!Array.isArray(trans) || trans.length !== dim) {
      return new InvalidValue(` (in Quasicrystal.genSGSymop)
        \`trans\` must be an array of length \`dim\`.`)
    }
    rot = lalg.copy(rot).setDim(dim, dim)
    trans = lalg.copy(trans).setDim(dim)
    return new SpaceGroupSymop(rot, trans)
  }

  /**
   * @desc
   * The {@link Quasicrystal#isSSGSymopFractNoPhason} checks if a given
   * space-group symmetry operation represented in the fractional coordinate
   * system of `this` quasicrystal is a super-space-group symmetry operation
   * under no phason strain or not.
   *
   * @param {SpaceGroupSymop} symopFract
   * A space-group symmetry operation to be checked.
   *
   * @return {boolean}
   * `true` is the `symopFract` is a super-space-group symmetry operation under
   * no phason strain, and `false` otherwise.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  isSSGSymopFractNoPhason (symopFract) {
    const lalg = this._lalg
    const aParCartn = this.aParCartn
    const aPerpCartnNoPhason = this.aPerpCartnNoPhason
    const bParCartnNoPhason = this.bParCartnNoPhason
    const bPerpCartn = this.bPerpCartn
    const rot = symopFract.rot
    const perpPar = lalg.mmul(aPerpCartnNoPhason,
      lalg.mmul(rot, bParCartnNoPhason))
    if (lalg.isZero(perpPar)) {
      const parPerp = lalg.mmul(aParCartn, lalg.mmul(rot, bPerpCartn))
      return lalg.isZero(parPerp)
    } else {
      return false
    }
  }

  /**
   * @desc
   * The {@link Quasicrystal#isSSGSymopFract} checks if a given space-group
   * symmetry operation represented in the fractional coordinate system of
   * `this` quasicrystal is a super-space-group symmetry operation under the
   * current phason strain or not.
   *
   * @param {SpaceGroupSymop} symopFract
   * A space-group symmetry operation to be checked.
   *
   * @return {boolean}
   * `true` is the `symopFract` is a super-space-group symmetry operation under
   * the current phason strain, and `false` otherwise.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  isSSGSymopFract (symopFract) {
    const lalg = this._lalg
    const aParCartn = this.aParCartn
    const aPerpCartn = this.aPerpCartn
    const bParCartn = this.bParCartn
    const bPerpCartn = this.bPerpCartn
    const rot = symopFract.rot
    const perpPar = lalg.mmul(aPerpCartn, lalg.mmul(rot, bParCartn))
    if (lalg.isZero(perpPar)) {
      const parPerp = lalg.mmul(aParCartn, lalg.mmul(rot, bPerpCartn))
      return lalg.isZero(parPerp)
    } else {
      return false
    }
  }

  /**
   * @desc
   * The {@link Quasicrystal#genSpaceGroup} generates a new instance of
   * {@link SpaceGroup} from the copies of the space-group symmetry operations
   * given as `symops`. `symops` must contain all the operations including the
   * identity operation (excluding lattice periodic translations). The identity
   * operation must be the first element.
   *
   * If no operation is given, the identity operation is used.
   *
   * If `symops` contains any invalid value, returns an instance of
   * {@link InvalidValue}.
   *
   * @param {...SpaceGroupSymop} symops
   * Space group operations to be used.
   *
   * @return {SpaceGroup|Error}
   * Generated space group on successful exit, or an {@link InvalidValue}.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  genSpaceGroup (...symop) {
    const lalg = this._lalg
    const dim = this.dim
    if (symop.length === 0) {
      // use identity
      return new SpaceGroup([SpaceGroupSymop.identity(lalg, dim)])
    } else {
      const sg = new SpaceGroup(symop.map(symopi => symopi.copy(lalg)))
      if (sg.dim !== dim) {
        return new InvalidValue(` (in Quasicrystal#genSpaceGroup)
          The dimension of \`sg\` (${sg.dim}) is not consistent with
          the dimension of \`this\` quasicrystal (${dim}).`)
      }
      return sg
    }
  }

  /**
   * @desc
   * The {@link Quasicrystal#genSGFractFromGenerators} generates a new instance
   * of {@link SpaceGroup} represented in the fractional coordinate system from
   * the given `generators` represented in the fractional coordinate system. The
   * `generators` may not include lattice periodic translations. The identity
   * operation need not be given explicitly since it is automatically generated.
   *
   * If `generators` contains any invalid value, returns an instance of
   * {@link InvalidValue}.
   *
   * @param {SpaceGroupSymop[]} generators
   * An array containing generators represented in the fractional coordinate
   * system.
   *
   * @param {number} [max = 192]
   * Stops if the number of space-group symmetry operations (excluding lattice
   * periodic translations) exceeds `max`. In this case, an instance of
   * {@link InvalidValue} is returned.
   *
   * @return {SpaceGroup|Error}
   * Generated space group on successful exit, or an {@link InvalidValue}.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  genSGFractFromGenerators (generators, max = 192) {
    const ralg = this._ralg
    const lalg = this._lalg
    const dim = this.dim
    if (!(generators instanceof Array)) {
      return new InvalidValue(` (in Quasicrystal#genSGFractFromGenerators)
        \`generators\` must be an array.`)
    }
    if (generators.some(
      symop => !(symop instanceof SpaceGroupSymop) || symop.dim !== dim
    )) {
      return new InvalidValue(` (in Quasicrystal#genSGFractFromGenerators)
        All the elements of \`generators\` must be an instanceof
        \`SpaceGroupSymops\` of the dimension which conforms to \`this\`
        quasicrystal.`)
    }
    const symop = Group.genElements(
      SpaceGroupSymop.identity(lalg, dim),
      generators,
      (gen, symopi) => {
        const rot = lalg.mmul(symopi.rot, gen.rot)
        const trans = lalg.iadd(lalg.mmul(symopi.rot, gen.trans), symopi.trans)
        for (let k = trans.length - 1; k >= 0; k -= 1) {
          if (ralg.isInteger(trans[k])) {
            trans[k] = ralg.$(0)
          }
        }
        return new SpaceGroupSymop(rot, trans)
      },
      (generated, symopi) =>
        lalg.eq(symopi.rot, generated.rot) &&
        lalg.isInteger(lalg.sub(symopi.trans, generated.trans)),
      max)
    if (symop instanceof InvalidValue) {
      return symop
    } else {
      return new SpaceGroup(symop)
    }
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgNoPhasonSymAtomSite} returns the information
   * about the atomic sites equivalent to the `atomSite` generated by the
   * super-space-group symmetry operations of `this` quasictystal under no
   * phason strain.
   *
   * @param {string} atomSiteLabel
   *
   * @return {object}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  ssgNoPhasonSymAtomSite (atomSiteLabel) {
    const lalg = this._lalg
    const ssgFractNoPhason = this._ssgFractNoPhason
    const atomSite = this._atomSite[atomSiteLabel]
    let ssgNoPhasonSymAtomSite =
      this._ssgNoPhasonSymAtomSite.get([ssgFractNoPhason, atomSiteLabel])
    if (!ssgNoPhasonSymAtomSite) {
      const pos = atomSite.posFract
      const symPos = ssgFractNoPhason.genStar(pos,
        (x, gi) => lalg.iadd(lalg.mmul(gi.rot, pos), gi.trans),
        (x, y) => lalg.isInteger(lalg.sub(x, y)))
      ssgNoPhasonSymAtomSite = {
        eqvPos: symPos.star,
        eqvPosSymopIds: symPos.starSymopIds,
        symopEqvPosId: symPos.symopStarId }
      this._ssgNoPhasonSymAtomSite.set([ssgFractNoPhason, atomSite],
        ssgNoPhasonSymAtomSite)
    }
    return {
      eqvPos: ssgNoPhasonSymAtomSite.eqvPos.map(pos => lalg.copy(pos)),
      eqvPosSymopIds: ssgNoPhasonSymAtomSite.eqvPosSymopIds.map(
        symopIds => symopIds.slice()),
      symopEqvPosId: ssgNoPhasonSymAtomSite.symopEqvPosId.slice()
    }
  }

  /**
   * @desc
   * The {@link Quasicrystal#ssgSymAtomSite} returns the information about the
   * atomic sites equivalent to the `atomSite` generated by the
   * super-space-group symmetry operations of `this` quasictystal under the
   * current phason strain and also the atomic sites nonequivqlent to the
   * `atomSite` which are equivalent if there is no phason strain.
   *
   * @param {string} atomSiteLabel
   *
   * @return {object}
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  ssgSymAtomSite (atomSiteLabel) {
    const lalg = this._lalg
    const ssgFractNoPhason = this._ssgFractNoPhason
    const phasonMatrix = this._phasonMatrix
    const atomSite = this._atomSite[atomSiteLabel]
    let ssgSymAtomSite =
      this._ssgSymAtomSite.get([ssgFractNoPhason, phasonMatrix, atomSite])
    if (!ssgSymAtomSite) {
      const ssgNoPhasonSymAtomSite = this.ssgNoPhasonSymAtomSite(atomSite)
      const ssgNoPhasonEqvPos = ssgNoPhasonSymAtomSite.eqvPos
      const ssgNoPhasonEqvPosSymopIds = ssgNoPhasonSymAtomSite.eqvPosSymopIds
      const ssgNoPhasonSymopEqvPosId = ssgNoPhasonSymAtomSite.symopEqvPosId
      const ssgRightCosetsSymopId = this.ssgRightCosetsSymopId
      const noneqvSite = []
      const symopNoneqvPosId = []
      const symopEqvPosId = []
      const done = new Array(ssgFractNoPhason.order).fill(false)
      for (const rcSymopId of ssgRightCosetsSymopId) {
        const eqvPos = []
        const eqvPosSSGNoPhasonSymopIds = []
        const eqvPosSSGSymopIds = []
        const symopSSGId = new Array(ssgFractNoPhason.order).fill(-1)
        for (const [i, idi] of rcSymopId.entries()) {
          if (!done[idi]) {
            const eqvPosId = ssgNoPhasonSymopEqvPosId[idi]
            for (const idj of ssgNoPhasonEqvPosSymopIds[eqvPosId]) {
              done[idj] = true
              symopSSGId[idj] = eqvPosSSGSymopIds.length
              symopEqvPosId[idj] = eqvPos.length
              symopNoneqvPosId[idj] = noneqvSite.length
            }
            eqvPos.push(ssgNoPhasonEqvPos[eqvPosId])
            eqvPosSSGNoPhasonSymopIds.push(ssgNoPhasonEqvPosSymopIds[eqvPosId])
            eqvPosSSGSymopIds.push([i])
          } else if (symopSSGId[idi] !== -1) {
            eqvPosSSGSymopIds[symopSSGId[idi]].push(i)
          }
        }
        if (eqvPos.length > 0) {
          noneqvSite.push({
            eqvPos: eqvPos,
            eqvPosSSGNoPhasonSymopIds: eqvPosSSGNoPhasonSymopIds,
            eqvPosSSGSymopIds: eqvPosSSGSymopIds
          })
        }
      }
      ssgSymAtomSite = {
        noneqvSite: noneqvSite,
        symopNoneqvPosId: symopNoneqvPosId,
        symopEqvPosId: symopEqvPosId }
      this._ssgSymAtomSite.set(
        [ssgFractNoPhason, phasonMatrix, atomSite], ssgSymAtomSite)
    }
    return {
      noneqvSite: ssgSymAtomSite.noneqvSite.map(obj => ({
        eqvPos: obj.eqvPos.map(pos => lalg.copy(pos)),
        eqvPosSSGNoPhasonSymopIds:
          obj.eqvPosSSGNoPhasonSymopIds.map(symopIds => symopIds.slice()),
        eqvPosSSGSymopIds:
          obj.eqvPosSSGSymopIds.map(symopIds => symopIds.slice())
      })),
      symopNoneqvPosId: ssgSymAtomSite.symopNoneqvPosId.slice(),
      symopEqvPosId: ssgSymAtomSite.symopEqvPosId.slice()
    }
  }

  /**
   * @desc
   * The {@link Quasicrystal#spgFractNoPhasonAtomSite} returns the super
   * point group under no phason strain of the first equivalent position of the
   * given atom site `atomSite` represented in the fractional coordinate system
   * of `this` quasicrystal.
   *
   * @param {string} atomSiteLabel
   * An atom site for which the super point group is generated.
   *
   * @return {PointGroup}
   * The generated super point group.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  spgFractNoPhasonAtomSite (atomSiteLabel) {
    const ssgFractNoPhason = this.ssgFractNoPhason
    const ssgFractNoPhasonSymop = ssgFractNoPhason.symop
    const ssgNoPhasonSymAtomSite = this.ssgNoPhasonSymAtomSite(atomSiteLabel)
    const eqvPos0SymopIds = ssgNoPhasonSymAtomSite.eqvPosSymopIds[0]
    return new PointGroup(
      eqvPos0SymopIds.map(id => ssgFractNoPhasonSymop[id].rot))
  }

  /**
   * @desc
   * The {@link Quasicrystal#spgPerpCartnNoPhasonAtomSite} returns the
   * super point group projected onto the perpendicular space of `this`
   * quasicrystal under no phason strain of the first equivalent position of the
   * given atom site `atomSite` represented in the Cartesian coordinate system
   *
   * @param {string} atomSiteLabel
   * An atom site for which the super point group is generated.
   *
   * @return {PointGroup}
   * The generated super point group.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  spgPerpCartnNoPhasonAtomSite (atomSiteLabel) {
    const lalg = this._lalg
    const ssgPerpCartnNoPhason = this.ssgPerpCartnNoPhason
    const ssgPerpCartnNoPhasonSymop = ssgPerpCartnNoPhason.symop
    const ssgNoPhasonSymAtomSite = this.ssgNoPhasonSymAtomSite(atomSiteLabel)
    const eqvPos0SymopIds = ssgNoPhasonSymAtomSite.eqvPosSymopIds[0]
    const symop = Group.removeDuplicates(
      eqvPos0SymopIds.map(id => ssgPerpCartnNoPhasonSymop[id].rot),
      (gi, gj) => lalg.eq(gi, gj))
    return new PointGroup(symop)
  }

  /**
   * @desc
   * The {@link Quasicrystal#spgPerpCartnAtomSite} returns the super point
   * groups projected onto the perpendicular space of `this` quasicrystal under
   * the current phason strain for the nonequivalent sites of the given atom
   * site `atomSite`.
   *
   * @param {string} atomSiteLabel
   * An atom site for which the super point groups are generated.
   *
   * @return {PointGroup[]}
   * An array containing the super point groups for the nonequivalent sites.
   * The order of the elements conforms to the `noneqvSite` property of the
   * returned value of the {@link Quasicrystal#ssgPhasonSymAtomSite} method.
   * Each element is the super point group for the first position in the set of
   * the equivalent positions of the corresponding nonequivalent site.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  // WIP
  // spgPerpCartnAtomSite (atomSiteLabel) {
  //   const ssgPerpCartn = this.ssgPerpCartn
  //   const ssgPerpCartnSymop = ssgPerpCartn.symop
  //   const ssgSymAtomSite = this.ssgSymAtomSite(atomSite)
  //   const noneqvSite = ssgSymAtomSite.noneqvSite
  //   return noneqvSite.map(({ eqvPosSSGSymopIds: [eqvPos0SymopIds] }) =>
  //     new PointGroup(eqvPos0SymopIds.map(id => ssgPerpCartnSymop[id].rot)))
  // }

  /**
   * @desc
   * The {@link Quasicrystal#genADTensorBetaNoPhasonFromUCartn} calculates the
   * atomic displacement tensor beta in `this` quasicrystal under no phason
   * strain from the given atomic displacement parameter *U* represented in the
   * Cartesian coordinate system.
   *
   * @param {number[]} uCartn
   * An array containing the elements of an atomic displacement parameter *U*
   * represented in the Cartesian coordinate system. The elements are considered
   * to be stored in row-major order.
   *
   * @return {Matrix}
   * A matrix representing the atomic diplacement tensor beta corresponding to
   * the `uCartn`.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  genADTensorBetaNoPhasonFromUCartn (uCartn) {
    // only numerical
    const lnum = this._lnum
    const dim = this.dim
    const bCartnNoPhason = lnum.copy(this.bCartnNoPhason)
    const twopi2 = 2 * (Math.PI ** 2)
    uCartn = lnum.$(...uCartn).setDim(dim, dim)
    return lnum.ismul(lnum.mmul(bCartnNoPhason, lnum.mmul(uCartn,
      lnum.transpose(bCartnNoPhason))), twopi2)
  }

  /**
   * @desc
   * The {@link Quasicrystal#structureFactor} returns the structure factor
   * for a reciprocal-space vector and a `rad`. The parameter `symQFract`
   * is an object containing the star generated from a reciprocal-space vector
   * represented in the fractional coordinate system of `this` quasicrystal.
   *
   * CAUTION: In this method, the possibility of `this` quasicrystal being an
   * approximant crystal due to a phason strain is not take into account.
   *
   * @param {Object} symQFrac
   * An object containing the star generated from the reciprocal-space vector
   * for which the structure factor is to be calculated.
   *
   * @param {Radiation} rad
   * A radiation for which the structure factor is to be calcualted.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  structureFactor (
    stolQNoneqv,
    rad,
    symQFractNoPhason,
    qPerpCartnStarNoPhason
  ) {
    // numerical only
    const rnum = this._rnum
    const cnum = this._cnum
    const lnum = this._lnum
    const pnum = this._pnum
    const twopi = 2 * Math.PI
    const hyperVolume = this.hyperVolumeNumerical
    const qFractStar = symQFractNoPhason.star
    const qPerpCartnStar = qPerpCartnStarNoPhason
    const symopQStarId = symQFractNoPhason.symopStarId
    const qStarSymopIds = symQFractNoPhason.starSymopIds
    const qFract0 = qFractStar[0]
    const ssgFract = this.ssgFractNoPhasonNumerical
    const ssgTransSymopId = this.ssgNoPhasonTransSymopId
    const atomTypeEntries = this.getAtomTypeEntries()
    const atomSiteEntries = this.getAtomSiteEntries()
    const atomicSurfaceEntries = this.getAtomicSurfaceEntries()
    // atomic scattering factor
    const stolQNoneqvASF = stolQNoneqv.map(stol =>
      new Map(atomTypeEntries.map(([symbol, atomType]) =>
        [symbol, atomType.atomicScatteringFactor(stol, rad)])))
    // translation factor
    const transFactor = new Array(ssgFract.order).fill(0)
    for (const symopId of ssgTransSymopId) {
      const trans = ssgFract.symop[symopId[0]].trans
      const iPhase = twopi * lnum.dot(qFract0, trans)
      const factor = cnum.$(Math.cos(iPhase), Math.sin(iPhase))
      for (const id of symopId) {
        transFactor[id] = factor
      }
    }
    // positional phase factor
    const atomSiteInfo = new Map(atomSiteEntries.map(([label, atomSite]) => {
      const spgFract = this.spgFractNoPhasonAtomSite(label)
      const spgPerpCartn = this.spgPerpCartnNoPhasonAtomSite(label)
      const spgPerpCartnMultiplicity =
        rnum.div(spgFract.order, spgPerpCartn.order)
      const symAtomSite = this.ssgNoPhasonSymAtomSite(label)
      const eqvPos0 = symAtomSite.eqvPos[0]
      const effEqvPosEffQFractStar = []
      const effEqvPosEffQPerpCartnStar = []
      const effEqvPosEffQStarMult = []
      const effEqvPosPhaseFactor = []
      const phaseFactorCache = new Map()
      const symopEffEqvPosId = new Array(ssgFract.order).fill(-1)
      symAtomSite.eqvPosSymopIds.forEach((eqvPosiSymopIds, i) => {
        let effEqvPosId = symopEffEqvPosId[eqvPosiSymopIds[0]]
        if (effEqvPosId === -1) {
          effEqvPosId = effEqvPosEffQFractStar.length
          const effQStarIds = Array.from(new Set(
            eqvPosiSymopIds.map(id => symopQStarId[id])))
          for (const qStarId of effQStarIds) {
            for (const id of qStarSymopIds[qStarId]) {
              symopEffEqvPosId[id] = effEqvPosId
            }
          }
          effEqvPosPhaseFactor.push(cnum.$(0))
          effEqvPosEffQFractStar.push(
            effQStarIds.map(id => qFractStar[id]))
          effEqvPosEffQPerpCartnStar.push(
            effQStarIds.map(id => qPerpCartnStar[id]))
          effEqvPosEffQStarMult.push(
            rnum.$(eqvPosiSymopIds.length, effQStarIds.length))
        }
        const effQStarId =
          Math.min(...eqvPosiSymopIds.map(id => symopQStarId[id]))
        let factor = phaseFactorCache.get(effQStarId)
        if (factor === undefined) {
          const effQFract = qFractStar[effQStarId]
          const iPhase = twopi * lnum.dot(effQFract, eqvPos0)
          factor = cnum.$(Math.cos(iPhase), Math.sin(iPhase))
          phaseFactorCache.set(effQStarId, factor)
        }
        effEqvPosPhaseFactor[effEqvPosId] = cnum.iadd(
          effEqvPosPhaseFactor[effEqvPosId],
          cnum.mul(factor, transFactor[eqvPosiSymopIds[0]]))
      })
      for (let i = effEqvPosPhaseFactor.length - 1; i >= 0; i -= 1) {
        effEqvPosPhaseFactor[i] = cnum.imul(
          effEqvPosPhaseFactor[i], effEqvPosEffQStarMult[i])
      }
      return [label, {
        effEqvPosEffQFractStar: effEqvPosEffQFractStar,
        effEqvPosEffQPerpCartnStar: effEqvPosEffQPerpCartnStar,
        effEqvPosPhaseFactor: effEqvPosPhaseFactor,
        spgPerpCartnMultiplicity: spgPerpCartnMultiplicity
      }]
    }))
    // structure factor
    const fQNoneqv = new Array(stolQNoneqv.length).fill(cnum.$(0))
    for (const [, atomicSurface] of atomicSurfaceEntries) {
      const atomSiteLabel = atomicSurface.atomSiteLabel
      const atomTypeSymbol = atomicSurface.atomTypeSymbol
      const {
        effEqvPosEffQFractStar,
        effEqvPosEffQPerpCartnStar,
        effEqvPosPhaseFactor,
        spgPerpCartnMultiplicity } = atomSiteInfo.get(atomSiteLabel)
      let fAS = cnum.$(0)
      for (let i = effEqvPosEffQFractStar.length - 1; i >= 0; i -= 1) {
        const effQFractStar = effEqvPosEffQFractStar[i]
        const effQPerpCartnStar = effEqvPosEffQPerpCartnStar[i]
        const phaseFactor = effEqvPosPhaseFactor[i]
        let fi = cnum.$(0)
        for (let j = effQFractStar.length - 1; j >= 0; j -= 1) {
          const qFract = effQFractStar[j]
          const qPerpCartn = effQPerpCartnStar[j]
          // geometrical form factor
          const gff = cnum.div(
            atomicSurface.geometricalFormFactor(pnum, qPerpCartn),
            spgPerpCartnMultiplicity)
          // atomic displacement factor
          const adp = atomicSurface.atomicDisplacementFactor(lnum, qFract)
          fi = cnum.iadd(fi, cnum.mul(gff, adp))
        }
        // positional phase factor
        fi = cnum.imul(fi, phaseFactor)
        fAS = cnum.iadd(fAS, fi)
      }
      // occupancy factor
      fAS = cnum.imul(fAS, atomicSurface.occupancyFactor())
      // atomic scattering factor for each stol
      stolQNoneqvASF.forEach((atomTypeASFi, i) => {
        const asfi = atomTypeASFi.get(atomTypeSymbol)
        fQNoneqv[i] = cnum.iadd(fQNoneqv[i], cnum.mul(fAS, asfi))
      })
    }
    // normalisation
    for (let i = fQNoneqv.length - 1; i >= 0; i -= 1) {
      fQNoneqv[i] = cnum.idiv(fQNoneqv[i], hyperVolume)
    }
    return fQNoneqv
  }

  * qFractNoPhasonGenerator (maxQParCartn, maxQPerpCartn) {
    const dim = this.dim
    const dimPar = this.dimPar
    const dimPerp = this.dimPerp
    if (typeof maxQParCartn !== 'number' || maxQParCartn <= 0) {
      throw Error('`maxQParCartn` must be a positive (non-zero) number.')
    }
    if (dimPerp > 0) {
      if (typeof maxQPerpCartn !== 'number' || maxQPerpCartn <= 0) {
        throw Error('`maxQPerpCartn` must be a positive (non-zero) number.')
      }
    }
    // numerical only
    const lnum = this._lnum
    const bParCartn = lnum.copy(this.bParCartn)
    const bPerpCartn = lnum.copy(this.bPerpCartn)
    const bCartn = lnum.copy(this.bCartn)
    const maxQParCartn2 = maxQParCartn ** 2
    const maxQPerpCartn2 = maxQPerpCartn ** 2
    const g = (() => {
      let scale = []
      for (let i = 0; i < dimPar; i += 1) {
        for (let j = 0; j < dim; j += 1) {
          if (i === j) {
            scale.push(1 / maxQParCartn)
          } else {
            scale.push(0)
          }
        }
      }
      for (let i = dimPar; i < dim; i += 1) {
        for (let j = 0; j < dim; j += 1) {
          if (i === j) {
            scale.push(1 / maxQPerpCartn)
          } else {
            scale.push(0)
          }
        }
      }
      scale = lnum.$(...scale).setDim(dim)
      if (dimPerp > 0) {
        scale = lnum.ismul(scale, 1 / Math.sqrt(2))
      }
      let b = lnum.mmul(bCartn, scale)
      return lnum.mmul(b, lnum.transpose(bCartn))
    })()
    const h1 = []
    const h2 = []
    for (let i = 0; i < dim - 1; i += 1) {
      const i1 = i + 1
      const g1 = lnum.$(...g.filter((a, j) => {
        return Math.floor(j / dim) > i && j % dim > i
      })).setDim(dim - i1)
      let g2 = lnum.$(...g.filter((a, j) => {
        return Math.floor(j / dim) > i && j % dim <= i
      })).setDim(dim - i1)
      g2 = lnum.ismul(lnum.isolve(lnum.ilup(g1), g2), -1)
      h1.push(lnum.$(...g2.filter((a, j) => {
        return j % i1 < i
      })).setDim(dim - i1))
      h2.push(lnum.$(...g2.filter((a, j) => {
        return j % i1 === i
      })))
    }
    const g11 = []
    const g12 = []
    const g22 = []
    for (let i = 0; i < dim; i += 1) {
      g11.push(lnum.$(...g.filter((a, j) => {
        return Math.floor(j / dim) < i && j % dim < i
      })).setDim(i))
      g12.push(lnum.$(...g.filter((a, j) => {
        return Math.floor(j / dim) < i && j % dim >= i
      })).setDim(i))
      g22.push(lnum.$(...g.filter((a, j) => {
        return Math.floor(j / dim) >= i && j % dim >= i
      })).setDim(dim - i))
    }
    const realRootsOfQuadEq = (a, b, c) => {
      let d = b ** 2 - 4 * a * c
      if (d <= 0) {
        const dummy = -b / (2 * a)
        return [dummy, dummy]
      }
      const rtd = Math.sqrt(d)
      const x = []
      if (b > 0) {
        x.push(-(b + rtd) / (2 * a))
      } else {
        x.push((-b + rtd) / (2 * a))
      }
      x.push(c / a / x[0])
      if (x[0] > x[1]) {
        const swap = x[0]
        x[0] = x[1]
        x[1] = swap
      }
      return x
    }
    const findRangeForDepth = (depth, current) => {
      current = current.slice(0, depth)
      let a
      let b
      let c
      if (depth === 0) {
        const v1 = lnum.$(1, ...h2[depth])
        a = lnum.dot(v1, lnum.mmul(g22[depth], v1))
        b = 0
        c = -1
      } else if (depth === dim - 1) {
        a = g22[depth][0]
        b = lnum.mmul(current, g12[depth])[0] * 2
        c = lnum.dot(current, lnum.mmul(g11[depth], current)) - 1
      } else {
        const v0 = lnum.$(0, ...lnum.mmul(h1[depth], current))
        const v1 = lnum.$(1, ...h2[depth].slice(0, dim - depth))
        a = lnum.dot(v1, lnum.mmul(g22[depth], v1))
        b = lnum.dot(v0, lnum.mmul(g22[depth], v1)) * 2
        b += lnum.dot(current, lnum.mmul(g12[depth], v1)) * 2
        c = lnum.dot(v0, lnum.mmul(g22[depth], v0))
        c += lnum.dot(current, lnum.mmul(g12[depth], v0)) * 2
        c += lnum.dot(current, lnum.mmul(g11[depth], current)) - 1
      }
      return realRootsOfQuadEq(a, b, c)
    }
    const stop = []
    const nextIncrement = []
    const current = []
    for (let i = 0; i < dim; i += 1) {
      stop.push(0)
      nextIncrement.push(0)
      current.push(0)
    }
    let depth = 0
    {
      const range = findRangeForDepth(depth, current)
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
    while (true) {
      if (current[depth] !== stop[depth]) {
        if (depth < dim - 1) {
          depth += 1
          const range = findRangeForDepth(depth, current)
          const min = Math.floor(range[0]) + 1
          const max = Math.ceil(range[1]) - 1
          const diff = max - min
          current[depth] = min + Math.floor(diff / 2)
          if (diff % 2 === 0) {
            nextIncrement[depth] = -1
          } else {
            nextIncrement[depth] = 1
          }
          stop[depth] = -(diff + 1)
          continue
        }
        const qParCartn = lnum.mmul(current, bParCartn)
        if (lnum.abs2(qParCartn) < maxQParCartn2) {
          const qPerpCartn = lnum.mmul(current, bPerpCartn)
          if (lnum.abs2(qPerpCartn) < maxQPerpCartn2) {
            yield current
          }
        }
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

  * symQFractNoPhasonGenerator (maxQParCartn, maxQPerpCartn) {
    // numerical only
    const lnum = this._lnum
    const ssg = this.ssgFractNoPhason.copy(lnum)
    const qFractCache = {}
    for (const qFract of
      this.qFractNoPhasonGenerator(maxQParCartn, maxQPerpCartn)
    ) {
      const g2 = lnum.abs2(qFract)
      if (!qFractCache[g2]) {
        qFractCache[g2] = []
      }
      const qFractCacheG2 = qFractCache[g2]
      if (qFractCacheG2.every((qFractCached, i) => {
        if (lnum.eq(qFractCached, qFract)) {
          qFractCacheG2.splice(i, 1)
          if (qFractCacheG2.length === 0) {
            delete qFractCache[g2]
          }
          return false
        } else {
          return true
        }
      })) {
        const ssgSymQFract = ssg.genStar(qFract,
          (a, g) => lnum.mmul(a, g.rot),
          (a, b) => lnum.eq(a, b))
        for (const qFracti of ssgSymQFract.star) {
          const g2i = lnum.abs2(qFracti)
          if (!qFractCache[g2i]) {
            qFractCache[g2i] = []
          }
          qFractCache[g2i].push(qFracti)
        }
        // ??? not confirmed ???
        yield ssgSymQFract
      }
    }
  }

  genPseudoWSCellPerpAsymNoPhason (
    atomSiteLabel,
    pseudoLattVecsFract,
    hintVAsymPerpCartn,
    dAsym
  ) {
    const palg = this._palg
    const lalg = this._lalg
    const ralg = this._ralg
    const spgPerpCartn = this.spgPerpCartnNoPhasonAtomSite(atomSiteLabel)
    const aPerp = this.aPerpCartnNoPhason
    const symVOrbit = []
    for (const v0 of pseudoLattVecsFract) {
      symVOrbit.push(...spgPerpCartn.genOrbit(lalg.mmul(aPerp, v0),
        (a, g) => lalg.mmul(g, a),
        (a, b) => lalg.eq(a, b)
      ).orbit)
    }
    let pAsym = spgPerpCartn.genAsymmetricUnit(palg, dAsym, hintVAsymPerpCartn)
    for (const v of symVOrbit) {
      const f = palg.facet(v, ralg.div(lalg.abs2(v), 2), true)
      pAsym = palg.iaddFacet(pAsym, f)
    }
    return new OccupationDomain(atomSiteLabel, pAsym)
  }

  // possible variants
  // * odStarAsymNoPhasonGenerator
  // * odAsymStarAsymNoPhasonGenerator

  * odStarNoPhasonGenerator (occDomain, displacementVecFract) {
    const palg = this._palg
    const lalg = this._lalg
    const atomSiteLabel0 = occDomain.atomSiteLabel
    const atomSite0 = this.getAtomSite(atomSiteLabel0)
    const posFract0 = atomSite0.posFract
    const spgFract = this.spgFractNoPhasonAtomSite(atomSiteLabel0)
    const spgPerpCartn = this.spgPerpCartnNoPhasonAtomSite(atomSiteLabel0)
    const aPerp = this.aPerpCartnNoPhason
    const symV = spgFract.genOrbit(displacementVecFract,
      (a, g) => lalg.mmul(g, a),
      (a, b) => lalg.eq(a, b))
    const atomSiteDisplaced = symV.orbit.map(v => {
      const posFract = lalg.add(v, posFract0)
      const atomSiteLabel = this.getAtomSiteLabel(posFract)
      const vPerpCartn = lalg.ineg(lalg.mmul(aPerp, v))
      return {
        atomSiteLabel: atomSiteLabel,
        vPerpCartn: vPerpCartn }
    })
    for (const rot of spgPerpCartn.symop) {
      const pRot = palg.rotate(occDomain.polytope, rot)
      for (const { atomSiteLabel, vPerpCartn } of atomSiteDisplaced) {
        const pRotTrans = palg.translate(pRot, vPerpCartn)
        yield new OccupationDomain(atomSiteLabel, pRotTrans)
      }
    }
  }

  * odAsymStarNoPhasonGenerator (occDomain, displacementVecFract) {
    const palg = this._palg
    const lalg = this._lalg
    const atomSiteLabel0 = occDomain.atomSiteLabel
    const atomSite0 = this.getAtomSite(atomSiteLabel0)
    const posFract0 = atomSite0.posFract
    const spgFract = this.spgFractNoPhasonAtomSite(atomSiteLabel0)
    const aPerp = this.aPerpCartnNoPhason
    const symV = spgFract.genOrbit(displacementVecFract,
      (a, g) => lalg.mmul(g, a),
      (a, b) => lalg.eq(a, b))
    const atomSiteDisplaced = symV.orbit.map(v => {
      const posFract = lalg.add(v, posFract0)
      const atomSiteLabel = this.getAtomSiteLabel(posFract)
      const vPerpCartn = lalg.ineg(lalg.mmul(aPerp, v))
      return {
        atomSiteLabel: atomSiteLabel,
        vPerpCartn: vPerpCartn }
    })
    for (const { atomSiteLabel, vPerpCartn } of atomSiteDisplaced) {
      const pTrans = palg.translate(occDomain.polytope, vPerpCartn)
      yield new OccupationDomain(atomSiteLabel, pTrans)
    }
  }
}

/* @license-end */
