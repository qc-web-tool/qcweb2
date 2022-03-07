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

const _internalKey = new WeakMap()

class InternalKeyMap extends Map {
  delete (keys) {
    if (keys.length === 0) {
      return _internalKey.delete(this)
    }
    const key0 = keys[0]
    const child = super.get(key0)
    if (!child) {
      return false
    }
    const deleted = child.delete(keys.slice(1))
    if (deleted && child.size === 0 && !child.has([])) {
      super.delete(key0)
    }
    return deleted
  }

  get (keys) {
    if (keys.length === 0) {
      return _internalKey.get(this)
    }
    const child = super.get(keys[0])
    if (!child) {
      return undefined
    }
    return child.get(keys.slice(1))
  }

  has (keys) {
    if (keys.length === 0) {
      return _internalKey.has(this)
    }
    const child = super.get(keys[0])
    if (!child) {
      return false
    }
    return child.has(keys.slice(1))
  }

  set (keys, internalKey) {
    if (keys.length === 0) {
      _internalKey.set(this, internalKey)
      return this
    }
    const key0 = keys[0]
    let child = super.get(key0)
    if (!child) {
      child = new InternalKeyMap()
      super.set(key0, child)
    }
    child.set(keys.slice(1), internalKey)
    return this
  }
}

/**
 * @desc
 * The {@link MultiKeyMap} is the class for multi-key map.
 *
 * @version 1.0.0
 * @since 1.0.0
 */
class MultiKeyMap extends Map {
  /**
   * @desc
   * The constructor function of the {@link MultiKeyMap} class.
   *
   * @param {object} iterable
   * An iterable object of which elements are arrays of [keys, value] pairs.
   * Each `keys` is an array of keys.
   *
   * @version 1.0.0
   * @since 1.0.0
   *
   * @example
   * import { MultiKeyMap } from '@kkitahara/qc-tools'
   *
   * let a = new MultiKeyMap()
   * a.set([1, 2, 3], 1)
   * a.set([1, null], 2)
   * a.set([], 3)
   * a.set([undefined], 4)
   *
   * a.get([1, 2, 3]) // 1
   * a.get([1, null]) // 2
   * a.get([]) // 3
   * a.get([undefined]) // 4
   * a.get([1]) // undefined
   *
   * a.has([1, 2, 3]) // true
   * a.has([1, null]) // true
   * a.has([]) // true
   * a.has([undefined]) // true
   * a.has([1]) // false
   *
   * a.delete([1, 2, 3]) // true
   * a.delete([1, null]) // true
   * a.delete([]) // true
   * a.delete([undefined]) // true
   * a.delete([1]) // false
   *
   * a.has([1, 2, 3]) // false
   * a.has([1, null]) // false
   * a.has([]) // false
   * a.has([undefined]) // false
   * a.has([1]) // false
   *
   * a = new MultiKeyMap([
   *   [[1, 2, 3], 1],
   *   [[1, null], 2],
   *   [[], 3],
   *   [[undefined], 4]
   * ])
   * a.get([1, 2, 3]) // 1
   * a.get([1, null]) // 2
   * a.get([]) // 3
   * a.get([undefined]) // 4
   */
  constructor (...args) {
    super()
    _internalKey.set(this, new InternalKeyMap())
    const iterable = args[0]
    if (iterable !== undefined && iterable !== null) {
      for (const [keys, value] of iterable) {
        this.set(keys, value)
      }
    }
  }

  clear () {
    const internalKeyMap = _internalKey.get(this)
    for (const internalKey of this.keys()) {
      internalKeyMap.delete(internalKey)
    }
    super.clear()
  }

  /**
   * @desc
   * The {@link MultiKeyMap#delete} removes any value associated to the
   * `keys` from `this` map.
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
    const internalKeyMap = _internalKey.get(this)
    const internalKey = internalKeyMap.get(keys)
    if (internalKey) {
      internalKeyMap.delete(keys)
    }
    return super.delete(internalKey)
  }

  /**
   * @desc
   * The {@link MultiKeyMap#get} returns the value associated to the `keys`
   * if exist in `this` map, or `undefined` otherwise.
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
    const internalKey = _internalKey.get(this).get(keys)
    return super.get(internalKey)
  }

  /**
   * @desc
   * The {@link MultiKeyMap#has} returns `true` if a value is associated to
   * the `keys` in `this` map, or `false` otherwise.
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
    return _internalKey.get(this).has(keys)
  }

  /**
   * @desc
   * The {@link MultiKeyMap#set} sets the `value` for the `keys` in `this`
   * map.
   * When a new entry is created, the given `keys` is used as the internal key.
   * Therefore, a mutation of the given `keys` should be avoided.
   *
   * @param {object[]} keys
   * @param {Any} value
   *
   * @return {MultiKeyMap}
   * `this`.
   *
   * @version 1.0.0
   * @since 1.0.0
   */
  set (keys, value) {
    const internalKeyMap = _internalKey.get(this)
    let internalKey = internalKeyMap.get(keys)
    if (!internalKey) {
      internalKey = keys
      internalKeyMap.set(keys, internalKey)
    }
    super.set(internalKey, value)
    return this
  }
}

Object.defineProperty(
  MultiKeyMap.prototype,
  Symbol.iterator,
  {
    value: MultiKeyMap.prototype.entries,
    writable: true,
    enumerable: false,
    configurable: true
  }
)

Object.defineProperty(
  MultiKeyMap.prototype,
  Symbol.toStringTag,
  {
    value: 'MultiKeyMap',
    writable: false,
    enumerable: false,
    configurable: true
  }
)

export { MultiKeyMap }

/* @license-end */
