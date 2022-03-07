import testDriver from '@kkitahara/esdoc-examples-test-plugin/src/simple-test-driver.mjs'

import './src_legacy_atom-type.mjs_AtomType-example0.mjs'
import './src_legacy_point-group.mjs_PointGroup_genAsymmetricUnit-example0.mjs'
import './src_legacy_quasicrystal.mjs_Quasicrystal-example0.mjs'
import './src_legacy_quasicrystal.mjs_Quasicrystal-example1.mjs'
import './src_legacy_quasicrystal.mjs_Quasicrystal-example2.mjs'
import './src_legacy_space-group-symop.mjs_SpaceGroupSymop_copy-example0.mjs'
import './src_legacy_space-group.mjs_SpaceGroup_constructor-example0.mjs'
import './src_multi-key-map.mjs_MultiKeyMap_constructor-example0.mjs'
import './src_multi-key-weak-map.mjs_MultiKeyWeakMap-example0.mjs'

testDriver.showSummary()
if (testDriver.fail) {
  process.exit(1)
}
