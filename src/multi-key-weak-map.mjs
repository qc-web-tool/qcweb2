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

const _value = new WeakMap()

/**
 * @desc
 * The {@link MultiKeyWeakMap} is the class for multi-key weak map.
 *
 * @version 1.0.0
 * @since 1.0.0
 *
 * @example
 * import { MultiKeyWeakMap } from '@kkitahara/qc-tools'
 *
 * let a = new MultiKeyWeakMap()
 * let b = {}
 * let c = {}
 * let d = {}
 *
 * a.set([b, c], 1)
 * a.set([c, b], 2)
 * a.set([b], 3)
 * a.set([c, b, d], 4)
 *
 * a.get([b, c]) // 1
 * a.get([c, b]) // 2
 * a.get([b]) // 3
 * a.get([c, b, d]) // 4
 * a.get([c]) // undefined
 * a.get([c, d, b]) // undefined
 *
 * a.has([b, c]) // true
 * a.has([c, b]) // true
 * a.has([b]) // true
 * a.has([c, b, d]) // true
 * a.has([c]) // false
 * a.has([c, d, b]) // false
 *
 * a.delete([b]) // true
 * a.delete([c, b, d]) // true
 * a.delete([c]) // false
 * a.delete([c, d, b]) // false
 *
 * a.has([b, c]) // true
 * a.has([c, b]) // true
 * a.has([b]) // false
 * a.has([c, b, d]) // false
 * a.has([c]) // false
 * a.has([c, d, b]) // false
 *
 * a = new MultiKeyWeakMap([
 *   [[b, c], 1],
 *   [[c, b], 2],
 *   [[b], 3],
 *   [[c, b, d], 4]])
 * a.get([b, c]) // 1
 * a.get([c, b]) // 2
 * a.get([b]) // 3
 * a.get([c, b, d]) // 4
 * a.get([c]) // undefined
 * a.get([c, d, b]) // undefined
 */
class MultiKeyWeakMap extends WeakMap {
  /**
   * @desc
   * The constructor function of the {@link MultiKeyWeakMap} class.
   *
   * @param {object} iterable
   * An iterable object of which elements are arrays of [keys, value] pairs.
   * Each `keys` is an array of keys.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  constructor (...args) {
    super()
    const iterable = args[0]
    if (iterable !== undefined && iterable !== null) {
      for (const [keys, value] of iterable) {
        this.set(keys, value)
      }
    }
  }

  /**
   * @desc
   * The {@link MultiKeyWeakMap#delete} removes any value associated to the
   * `keys` from `this` weak map.
   *
   * @param {object[]} keys
   *
   * @return {boolean}
   * `true` if a value is successfully removed, and `false` otherwise.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  delete (keys) {
    if (keys.length === 0) {
      return _value.delete(this)
    }
    const child = super.get(keys[0])
    if (!child) {
      return false
    }
    return child.delete(keys.slice(1))
  }

  /**
   * @desc
   * The {@link MultiKeyWeakMap#get} returns the value associated to the `keys`
   * if exist in `this` weak map, or `undefined` otherwise.
   *
   * @param {object[]} keys
   *
   * @return {object|undefined}
   * The value associated to the `keys` if exist, or `undefined.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  get (keys) {
    if (keys.length === 0) {
      return _value.get(this)
    }
    const child = super.get(keys[0])
    if (!child) {
      return undefined
    }
    return child.get(keys.slice(1))
  }

  /**
   * @desc
   * The {@link MultiKeyWeakMap#has} returns `true` if a value is associated to
   * the `keys` in `this` weak map, or `false` otherwise.
   *
   * @param {object[]} keys
   *
   * @return {boolean}
   * `true` if a value is associated to the `keys`, or `false` otherwise.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  has (keys) {
    if (keys.length === 0) {
      return _value.has(this)
    }
    const child = super.get(keys[0])
    if (!child) {
      return false
    }
    return child.has(keys.slice(1))
  }

  /**
   * @desc
   * The {@link MultiKeyWeakMap#set} sets the `value` for the `keys` in `this`
   * weak map.
   *
   * @param {object[]} keys
   * @param {Any} value
   *
   * @return {MultiKeyWeakMap}
   * `this`.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  set (keys, value) {
    if (keys.length === 0) {
      _value.set(this, value)
      return this
    }
    const key0 = keys[0]
    let child = super.get(key0)
    if (!child) {
      child = new MultiKeyWeakMap()
      super.set(key0, child)
    }
    child.set(keys.slice(1), value)
    return this
  }
}

Object.defineProperty(
  MultiKeyWeakMap.prototype,
  Symbol.toStringTag,
  {
    value: 'MultiKeyWeakMap',
    writable: false,
    enumerable: false,
    configurable: true
  }
)

export { MultiKeyWeakMap }

/* @license-end */
