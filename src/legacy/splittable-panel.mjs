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

const splitX = new WeakMap()
const splitY = new WeakMap()
const child1 = new WeakMap()
const child2 = new WeakMap()
const parent = new WeakMap()

function moveContents (src, dst) {
  if (splitX.has(src)) {
    splitX.set(dst, splitX.get(src))
  }
  if (splitY.has(src)) {
    splitY.set(dst, splitY.get(src))
  }
  if (child1.has(src)) {
    const ch1 = child1.get(src)
    child1.delete(src)
    child1.set(dst, ch1)
    parent.set(ch1, dst)
  }
  if (child2.has(src)) {
    const ch2 = child2.get(src)
    child2.delete(src)
    child2.set(dst, ch2)
    parent.set(ch2, dst)
  }
  Object.assign(dst, src)
}

function getParentX () {
  return parent.get(this).x
}

function getParentSplitX () {
  return splitX.get(parent.get(this))
}

function getParentY () {
  return parent.get(this).y
}

function getParentSplitY () {
  return splitY.get(parent.get(this))
}

function getParentWidth () {
  return parent.get(this).width
}

function getParentHeight () {
  return parent.get(this).height
}

function getVSplitChild1Width () {
  const p = parent.get(this)
  return splitX.get(p) - p.x
}

function getVSplitChild2Width () {
  const p = parent.get(this)
  return p.width - (splitX.get(p) - p.x)
}

function getSplitChild1Height () {
  const p = parent.get(this)
  return splitY.get(p) - p.y
}

function getSplitChild2Height () {
  const p = parent.get(this)
  return p.height - (splitY.get(p) - p.y)
}

export class SplittablePanel {
  constructor (
    xGetter,
    yGetter,
    widthGetter,
    heightGetter
  ) {
    Object.defineProperties(this, {
      x: Object.create(null, {
        configurable: { value: false },
        enumerable: { value: false },
        get: { value: xGetter } }),
      y: Object.create(null, {
        configurable: { value: false },
        enumerable: { value: false },
        get: { value: yGetter } }),
      width: Object.create(null, {
        configurable: { value: false },
        enumerable: { value: false },
        get: { value: widthGetter } }),
      height: Object.create(null, {
        configurable: { value: false },
        enumerable: { value: false },
        get: { value: heightGetter } })
    })
  }

  get isVSplitted () {
    if (splitX.has(this)) {
      const x = splitX.get(this)
      if (x <= this.x) {
        splitX.delete(this)
        child1.get(this).clear()
        child1.delete(this)
        const remainingChild = child2.get(this)
        child2.delete(this)
        moveContents(remainingChild, this)
        parent.delete(remainingChild)
        return false
      } else if (x >= this.x + this.width - 1) {
        splitX.delete(this)
        child2.get(this).clear()
        child2.delete(this)
        const remainingChild = child1.get(this)
        child1.delete(this)
        moveContents(remainingChild, this)
        parent.delete(remainingChild)
        return false
      } else {
        return true
      }
    } else {
      return false
    }
  }

  get isSplitted () {
    if (splitY.has(this)) {
      const y = splitY.get(this)
      if (y <= this.y) {
        splitY.delete(this)
        child1.get(this).clear()
        child1.delete(this)
        const remainingChild = child2.get(this)
        child2.delete(this)
        moveContents(remainingChild, this)
        parent.delete(remainingChild)
        return false
      } else if (y >= this.y + this.height - 1) {
        splitY.delete(this)
        child2.get(this).clear()
        child2.delete(this)
        const remainingChild = child1.get(this)
        child1.delete(this)
        moveContents(remainingChild, this)
        parent.delete(remainingChild)
        return false
      } else {
        return true
      }
    } else {
      return false
    }
  }

  vsplit (x) {
    if (
      !splitX.has(this) &&
      !splitY.has(this) &&
      x > this.x &&
      x < this.x + this.width - 1
    ) {
      splitX.set(this, x)
      const ch1 = Object.assign(new SplittablePanel(
        getParentX,
        getParentY,
        getVSplitChild1Width,
        getParentHeight
      ), this)
      const ch2 = Object.assign(new SplittablePanel(
        getParentSplitX,
        getParentY,
        getVSplitChild2Width,
        getParentHeight
      ), this)
      child1.set(this, ch1)
      child2.set(this, ch2)
      parent.set(ch1, this)
      parent.set(ch2, this)
      return [child1.get(this), child2.get(this)]
    } else if (splitX.has(this) && !splitY.has(this)) {
      x = Math.min(Math.max(this.x, x), this.x + this.width - 1)
      splitX.set(this, x)
    }
  }

  split (y) {
    if (
      !splitX.has(this) &&
      !splitY.has(this) &&
      y > this.y &&
      y < this.y + this.height - 1
    ) {
      splitY.set(this, y)
      const ch1 = Object.assign(new SplittablePanel(
        getParentX,
        getParentY,
        getParentWidth,
        getSplitChild1Height
      ), this)
      const ch2 = Object.assign(new SplittablePanel(
        getParentX,
        getParentSplitY,
        getParentWidth,
        getSplitChild2Height
      ), this)
      child1.set(this, ch1)
      child2.set(this, ch2)
      parent.set(ch1, this)
      parent.set(ch2, this)
      return [child1.get(this), child2.get(this)]
    } else if (!splitX.has(this) && splitY.has(this)) {
      y = Math.min(Math.max(this.y, y), this.y + this.height - 1)
      splitY.set(this, y)
    }
  }

  panelAt (x, y, separatorDetectWidth = 0) {
    if (
      x >= this.x &&
      x < this.x + this.width &&
      y >= this.y &&
      y < this.y + this.height
    ) {
      if (this.isVSplitted) {
        const relX = x - splitX.get(this)
        if (Math.abs(relX + 0.5) < separatorDetectWidth) {
          return this
        } else if (relX < 0) {
          return child1.get(this).panelAt(x, y, separatorDetectWidth)
        } else {
          return child2.get(this).panelAt(x, y, separatorDetectWidth)
        }
      } else if (this.isSplitted) {
        const relY = y - splitY.get(this)
        if (Math.abs(relY + 0.5) < separatorDetectWidth) {
          return this
        } else if (relY < 0) {
          return child1.get(this).panelAt(x, y, separatorDetectWidth)
        } else {
          return child2.get(this).panelAt(x, y, separatorDetectWidth)
        }
      } else {
        return this
      }
    }
  }

  clear () {
    if (child1.has(this)) {
      child1.get(this).clear()
      child1.delete(this)
      child2.get(this).clear()
      child2.delete(this)
    }
    if (parent.has(this)) {
      parent.delete(this)
    }
  }

  * [Symbol.iterator] () {
    if (this.isVSplitted || this.isSplitted) {
      for (const panel of child1.get(this)) {
        yield panel
      }
      if (child2.has(this)) {
        for (const panel of child2.get(this)) {
          yield panel
        }
      }
    } else {
      yield this
    }
  }

  * separators (separatorDetectWidth = 0) {
    if (separatorDetectWidth > 0 && (this.isVSplitted || this.isSplitted)) {
      if (this.isVSplitted) {
        yield {
          x: splitX.get(this) - separatorDetectWidth,
          y: this.y,
          width: separatorDetectWidth * 2,
          height: this.height }
      } else {
        yield {
          x: this.x,
          y: splitY.get(this) - separatorDetectWidth,
          width: this.width,
          height: separatorDetectWidth * 2 }
      }
      if (child1.has(this)) {
        for (
          const separator of child1.get(this).separators(separatorDetectWidth)
        ) {
          yield separator
        }
      }
      if (child2.has(this)) {
        for (
          const separator of child2.get(this).separators(separatorDetectWidth)
        ) {
          yield separator
        }
      }
    }
  }

  static fromWebGLContext (gl) {
    return new SplittablePanel(
      () => 0,
      () => 0,
      () => gl.drawingBufferWidth,
      () => gl.drawingBufferHeight
    )
  }
}

/* @license-end */
