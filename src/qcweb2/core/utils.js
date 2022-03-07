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

export const createVertexShader = (gl, src) => {
  const vs = gl.createShader(gl.VERTEX_SHADER)
  gl.shaderSource(vs, src)
  gl.compileShader(vs)
  return vs
}

export const createVertexShaderDebug = (gl, src) => {
  const vs = createVertexShader(gl, src)
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.warn(`
      Failed to compile a vertex shader: ${gl.getShaderInfoLog(vs)}
    `)
  }
  return vs
}

export const createFragmentShader = (gl, src) => {
  const fs = gl.createShader(gl.FRAGMENT_SHADER)
  gl.shaderSource(fs, src)
  gl.compileShader(fs)
  return fs
}

export const createFragmentShaderDebug = (gl, src) => {
  const fs = createFragmentShader(gl, src)
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.warn(`
      Failed to compile a fragment shader: ${gl.getShaderInfoLog(fs)}
    `)
  }
  return fs
}

export const createProgram = (
  gl, vs, fs, { tfVaryings, tfBuffMode, uboBlockBindings = [] } = {}
) => {
  const prg = gl.createProgram()
  gl.attachShader(prg, vs)
  gl.attachShader(prg, fs)
  if (tfVaryings) {
    gl.transformFeedbackVaryings(prg, tfVaryings, tfBuffMode)
  }
  gl.linkProgram(prg)
  for (const { blockName, bindingPointIndex } of uboBlockBindings) {
    gl.uniformBlockBinding(prg, gl.getUniformBlockIndex(prg, blockName),
      bindingPointIndex)
  }
  return prg
}

export const createProgramDebug = (gl, ...args) => {
  const prg = createProgram(gl, ...args)
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
    console.warn(`
      Failed to link a program: ${gl.getProgramInfoLog(prg)}
    `)
  }
  return prg
}

export const createBuffer = (gl, target, dataOrSize, usage) => {
  const buf = gl.createBuffer()
  gl.bindBuffer(target, buf)
  gl.bufferData(target, dataOrSize, usage)
  gl.bindBuffer(target, null)
  return buf
}

export const updateBuffer = (
  gl, target, buf, offset, data, srcOffset = 0, length = 0
) => {
  gl.bindBuffer(target, buf)
  gl.bufferSubData(target, offset, data, srcOffset, length)
  gl.bindBuffer(target, null)
}

export const createUniformBuffer = (gl, size, usage, index) => {
  const target = gl.UNIFORM_BUFFER
  const buf = createBuffer(gl, target, size, usage)
  gl.bindBufferBase(target, index, buf)
  return buf
}

/* @license-end */
