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

import { MultiKeyMap, MultiKeyWeakMap } from './dependencies.mjs'
import { toCanonicalCaseFold } from '@kkitahara/unicode-tools'

export const nullItem = { value: null, source: 'missing', alert: '' }
export const storedItem = value => ({
  value,
  source: 'stored',
  alert: ''
})
export const evaluatedItem = value => ({
  value,
  source: 'evaluated',
  alert: ''
})
export const defaultItem = value => ({
  value,
  source: 'default',
  alert: ''
})
export const loopItem = value => ({
  value,
  source: 'internal', // only for internal use
  alert: ''
})
const emptySetCategory = { value: new Map(), source: 'default', alert: '' }
const emptyLoopCategory = { value: [], source: 'default', alert: '' }
const defCache = new MultiKeyMap()
const validatedCache = new MultiKeyMap()
const wrappedStoredCatCache = new WeakMap()
const evaluatedCache = new MultiKeyMap()
const loopCache = new MultiKeyWeakMap()

// limitation:
// * Loop category items as dependencies (ad hoc):
//     [catId, INAPPLICABLE]: whole category
//     [catId, objId]: item in the current packet
// * Loop category items cannot be dependencies of an item of a different
//   category. Use categories instead of items as dependencies.
// * currentPacket does not need to be in data.
export const selectDefinition = (
  dict,
  data,
  catId,
  objId = false,
  currentPacket = false
) => {
  const attr = dict.get([catId, objId]) || new MultiKeyMap()
  const defMethod = attr.get(['method', 'Definition'])
  if (defMethod) {
    const deps = (defMethod.dependencies || []).map(
      ([cId, oId]) => cId === catId && oId !== false
        ? selectDataItem(dict, data, cId, oId, currentPacket)
        : selectDataItem(dict, data, cId, oId, false)
    )
    const cacheKey = [catId, objId]
    let cache = defCache.get(cacheKey)
    if (!cache) {
      cache = new MultiKeyWeakMap()
      defCache.set(cacheKey, cache)
    }
    const key = currentPacket
      ? [currentPacket, ...deps]
      : [...deps]
    if (cache.has(key)) {
      return cache.get(key)
    }
    const def = defMethod.function(deps, attr, dict, data, currentPacket)
    cache.set(key, def)
    return def
  } else {
    return attr
  }
}

const checkSingleValue = (value, def) => {
  const contents = def.get(['type', 'contents'])
  switch (contents) {
    case 'code': {
      if (value === null) {
        return ''
      } else if (value === false) {
        return ''
      }
      // ad hoc, incomplete test
      if (typeof value !== 'string') {
        return 'Throw: value must be a CIF2 string.'
      }
      break
    }
    case 'integer' : {
      if (value === null || value === false || Number.isNaN(value)) {
        return ''
      }
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return 'Throw: value must be an integer.'
      }
      break
    }
    case 'real' : {
      if (value === null || value === false || Number.isNaN(value)) {
        return ''
      }
      if (typeof value !== 'number') {
        return 'Throw: value must be a number.'
      }
      break
    }
    case 'colour': {
      if (value === null) {
        return ''
      } else if (value === false) {
        return ''
      }
      if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
        return 'Throw: invalid colour value.'
      }
      break
    }
    case 'polytope': {
      // no check here
      break
    }
    default: {
      return 'Debug info: unsupported contents.'
    }
  }
  /* valid only for single items ??? ... */
  switch (contents) {
    case 'integer':
    case 'real': {
      let from = -Infinity
      let to = Infinity
      const range = def.get(['enumeration', 'range'])
      if (range) {
        if (typeof range[0] === 'number') {
          from = Math.max(from, range[0])
        }
        if (typeof range[1] === 'number') {
          to = Math.min(to, range[1])
        }
      }
      if (value < from || value > to) {
        return 'Throw: out of enumeration range.'
      }
      break
    }
  }
  const set = def.get(['enumeration_set', 'state'])
  if (set) {
    switch (contents) {
      case 'code': {
        const folded = toCanonicalCaseFold(value)
        if (!set.some(state => state === folded)) {
          return 'Throw: value is not listed in enumeration set.'
        }
        break
      }
      default: {
        if (!set.some(state => state === value)) {
          return 'Throw: value is not listed in enumeration set.'
        }
        break
      }
    }
  }
  /* ... valid only for single items ??? */
  return ''
}

const checkMatrixValue = (value, def) => {
  const dimension = def.get(['type', 'dimension'])
  if (!dimension) {
    if (value === false) {
      return ''
    } else {
      return 'Throw: value is not inapplicable while dimension is not well-defined.'
    }
  } else {
    if (
      !Array.isArray(value) ||
      value.length !== dimension.reduce((len, dimi) => len * dimi, 1)
    ) {
      return 'Throw: value is not a matrix of valid dimension.'
    }
    let msg
    for (const elem of value) {
      msg = checkSingleValue(elem, def)
      if (msg) {
        return msg
      }
    }
    return ''
  }
}

const checkListValue = (value, def) => {
  const dimension = def.get(['type', 'dimension'])
  if (!dimension) {
    if (value === false) {
      return ''
    } else {
      return 'Throw: value is not inapplicable while dimension is not well-defined.'
    }
  } else {
    if (
      !Array.isArray(value) ||
      (dimension.length === 1 && value.length !== dimension[0])
    ) {
      return 'Throw: value is not a list of valid dimension.'
    }
    let msg
    for (const elem of value) {
      msg = checkSingleValue(elem, def)
      if (msg) {
        return msg
      }
    }
    return ''
  }
}

const basicValidation = (target, def) => {
  const catClass = def.get(['definition', 'class'])
  if (catClass === 'set' || catClass === 'loop') {
    return ''
  }
  // assume 'datum'
  const container = def.get(['type', 'container'])
  switch (container) {
    case 'single': {
      return checkSingleValue(target.value, def)
    }
    case 'matrix': {
      return checkMatrixValue(target.value, def)
    }
    case 'list': {
      return checkListValue(target.value, def)
    }
    default: {
      return 'Debug info: unsupported container.'
    }
  }
}

export const selectValidatedDataItem = (
  target,
  dict,
  data,
  catId,
  objId = false,
  currentPacket = false
) => {
  const def = selectDefinition(dict, data, catId, objId, currentPacket)
  const valMethod = def.get(['method', 'Validation'])
  const deps = []
  if (valMethod) {
    deps.push(
      ...(valMethod.dependencies || []).map(
        ([cId, oId]) => cId === catId && oId !== false
          ? selectDataItem(dict, data, cId, oId, currentPacket)
          : selectDataItem(dict, data, cId, oId, false)
      )
    )
  }
  const cacheKey = [catId, objId]
  let cache = validatedCache.get(cacheKey)
  if (!cache) {
    cache = new MultiKeyWeakMap()
    validatedCache.set(cacheKey, cache)
  }
  const key = currentPacket
    ? [target, def, currentPacket, ...deps]
    : [target, def, ...deps]
  if (cache.has(key)) {
    return cache.get(key)
  }
  const alert = basicValidation(target, def) ||
    (
      valMethod
        ? valMethod.function(target, def, deps, dict, data, currentPacket)
        : ''
    )
  let validated = target
  if (alert !== target.alert) {
    validated = { ...target, alert }
  }
  cache.set(key, validated)
  return validated
}

const selectWrappedStoredCategory = (
  data,
  catId
) => {
  const stored = data.get(catId)
  if (!stored) {
    return nullItem
  }
  if (wrappedStoredCatCache.has(stored)) {
    return wrappedStoredCatCache.get(stored)
  }
  const wrapped = storedItem(stored)
  wrappedStoredCatCache.set(stored, wrapped)
  return wrapped
}

export const selectStoredDataItem = (
  dict,
  data,
  catId,
  objId = false,
  currentPacket = false
) => {
  const catDef = selectDefinition(dict, data, catId)
  let stored
  if (objId === false) {
    // select category
    stored = selectWrappedStoredCategory(data, catId)
  } else {
    // select item
    const catClass = catDef.get(['definition', 'class'])
    if (catClass === 'set') {
      // from set category
      const cat = data.get(catId)
      if (cat) {
        stored = cat.get(objId)
      }
    } else if (catClass === 'loop') {
      // from loop category (currentPacket)
      stored = currentPacket.get(objId)
    } else {
      throw Error(`Debug info: unsupported category class (${catClass}).`)
    }
  }
  stored = stored || nullItem
  const validated =
    selectValidatedDataItem(stored, dict, data, catId, objId, currentPacket)
  if (/^Throw: /.test(validated.alert)) {
    // ignore stored item if the type of alert is 'Throw'
    return nullItem
  } else {
    return validated
  }
}

const basicEvaluation = (deps, def) => {
  if (
    deps.some(x =>
      /^Throw: /.test(x.alert) || x.value === false || x.value === null
    )
  ) {
    return evaluatedItem(false)
  }
  const catClass = def.get(['definition', 'class'])
  if (catClass === 'set' || catClass === 'loop') {
    return nullItem
  }
  // assume 'datum'
  const container = def.get(['type', 'container'])
  switch (container) {
    case 'matrix': {
      const dimension = def.get(['type', 'dimension'])
      if (!dimension) {
        return evaluatedItem(false)
      }
    }
  }
  return nullItem
}

export const selectEvaluatedDataItem = (
  dict,
  data,
  catId,
  objId = false,
  currentPacket = false
) => {
  const def = selectDefinition(dict, data, catId, objId, currentPacket)
  const evalMethod = def.get(['method', 'Evaluation'])
  let deps = []
  if (evalMethod) {
    deps = evalMethod.dependencies.map(
      ([cId, oId]) => cId === catId && oId !== false
        ? selectDataItem(dict, data, cId, oId, currentPacket)
        : selectDataItem(dict, data, cId, oId, false)
    )
  }
  const cacheKey = [catId, objId]
  let cache = evaluatedCache.get(cacheKey)
  if (!cache) {
    cache = new MultiKeyWeakMap()
    evaluatedCache.set(cacheKey, cache)
  }
  const key = currentPacket
    ? [def, currentPacket, ...deps]
    : [def, ...deps]
  if (cache.has(key)) {
    return cache.get(key)
  }
  let evaluated = basicEvaluation(deps, def)
  if (evaluated.value === null && evalMethod) {
    evaluated = evalMethod.function(deps, def, dict, data, currentPacket)
  }
  cache.set(key, evaluated)
  return evaluated
}

export const selectDefaultDataItem = (
  dict,
  data,
  catId,
  objId = false,
  currentPacket = false
) => {
  const def = selectDefinition(dict, data, catId, objId, currentPacket)
  if (objId === false) {
    // select category
    const catClass = def.get(['definition', 'class'])
    if (catClass === 'set') {
      return emptySetCategory
    } else if (catClass === 'loop') {
      return emptyLoopCategory
    } else {
      throw Error(`Debug info: unsupported category class (${catClass}).`)
    }
  } else {
    // select item
    return def.get(['enumeration', 'default']) || nullItem
  }
}

const selectLoopDataItem = items => {
  if (loopCache.has(items)) {
    return loopCache.get(items)
  }
  const wrapped = loopItem(items)
  loopCache.set(items, wrapped)
  return wrapped
}

export const selectDataItem = (
  dict,
  data,
  catId,
  objId = false,
  currentPacket = false
) => {
  const catDef = selectDefinition(dict, data, catId)
  const catClass = catDef.get(['definition', 'class'])
  if (catClass === 'loop' && objId !== false && currentPacket === false) {
    const catData = selectDataItem(dict, data, catId).value
    if (catData !== null) {
      return selectLoopDataItem(
        catData.map(packet => selectDataItem(dict, data, catId, objId, packet))
      )
    } else {
      return nullItem
    }
  }
  const stored = selectStoredDataItem(dict, data, catId, objId, currentPacket)
  if (stored.value !== null) {
    return stored
  }
  const evaluated =
    selectEvaluatedDataItem(dict, data, catId, objId, currentPacket)
  if (evaluated.value !== null) {
    return evaluated
  }
  const defaultItem =
    selectDefaultDataItem(dict, data, catId, objId, currentPacket)
  return defaultItem
}

/* @license-end */
