import testDriver from '@kkitahara/esdoc-examples-test-plugin/src/simple-test-driver.mjs'

import {
  AtomType,
  scatCromerMannCoeffs,
  scatHiAngFoxCoeffs,
  Radiation,
  XRayRadiation,
  InvalidValue } from '../../src/index.mjs'

let cm = scatCromerMannCoeffs['Li1+']
let fox = scatHiAngFoxCoeffs['Li']
let li1p = new AtomType(cm, fox)
testDriver.test(() => { return li1p._scatCromerMannCoeffs.length }, 9, 'src/atom-type.mjs~AtomType-example0_0', false)
testDriver.test(() => { return li1p._scatCromerMannCoeffs[0] }, 0.696800, 'src/atom-type.mjs~AtomType-example0_1', false)
testDriver.test(() => { return li1p._scatCromerMannCoeffs[1] }, 4.62370, 'src/atom-type.mjs~AtomType-example0_2', false)
testDriver.test(() => { return li1p._scatCromerMannCoeffs[2] }, 0.788800, 'src/atom-type.mjs~AtomType-example0_3', false)
testDriver.test(() => { return li1p._scatCromerMannCoeffs[3] }, 1.95570, 'src/atom-type.mjs~AtomType-example0_4', false)
testDriver.test(() => { return li1p._scatCromerMannCoeffs[4] }, 0.341400, 'src/atom-type.mjs~AtomType-example0_5', false)
testDriver.test(() => { return li1p._scatCromerMannCoeffs[5] }, 0.631600, 'src/atom-type.mjs~AtomType-example0_6', false)
testDriver.test(() => { return li1p._scatCromerMannCoeffs[6] }, 0.156300, 'src/atom-type.mjs~AtomType-example0_7', false)
testDriver.test(() => { return li1p._scatCromerMannCoeffs[7] }, 10.0953, 'src/atom-type.mjs~AtomType-example0_8', false)
testDriver.test(() => { return li1p._scatCromerMannCoeffs[8] }, 0.016700, 'src/atom-type.mjs~AtomType-example0_9', false)
testDriver.test(() => { return li1p._scatHiAngFoxCoeffs.length }, 4, 'src/atom-type.mjs~AtomType-example0_10', false)
testDriver.test(() => { return li1p._scatHiAngFoxCoeffs[0] }, 0.89463, 'src/atom-type.mjs~AtomType-example0_11', false)
testDriver.test(() => { return li1p._scatHiAngFoxCoeffs[1] }, -2.43660, 'src/atom-type.mjs~AtomType-example0_12', false)
testDriver.test(() => { return li1p._scatHiAngFoxCoeffs[2] }, 0.232500, 'src/atom-type.mjs~AtomType-example0_13', false)
testDriver.test(() => { return li1p._scatHiAngFoxCoeffs[3] }, -0.0071949, 'src/atom-type.mjs~AtomType-example0_14', false)

let o1m = new AtomType(
  scatCromerMannCoeffs['O1-'],
  scatHiAngFoxCoeffs['O'])
let rad = XRayRadiation.cuKL3
testDriver.test(() => { return rad.wavelength }, 1.540562, 'src/atom-type.mjs~AtomType-example0_15', false)
testDriver.test(() => { return Math.abs(o1m.atomicScatteringFactor(1.5, rad) - 0.994) < 0.012 }, true, 'src/atom-type.mjs~AtomType-example0_16', false)
testDriver.test(() => { return Math.abs(o1m.atomicScatteringFactor(3.5, rad) - 0.196) < 0.196 * 0.03 }, true, 'src/atom-type.mjs~AtomType-example0_17', false)
testDriver.test(() => { return o1m.atomicScatteringFactor(-0.1, rad) instanceof InvalidValue }, true, 'src/atom-type.mjs~AtomType-example0_18', false)
testDriver.test(() => { return o1m.atomicScatteringFactor(6.1, rad) instanceof InvalidValue }, true, 'src/atom-type.mjs~AtomType-example0_19', false)

rad = new Radiation()
// invalid probe
testDriver.test(() => { return o1m.atomicScatteringFactor(1.5, rad) instanceof InvalidValue }, true, 'src/atom-type.mjs~AtomType-example0_20', false)
