Copy [UnityVfxCapture.cs](UnityVfxCapture.cs) into `Assets/ResearchCapture/` in an isolated copy of the source Unity project. Use its existing packages, renderer assets and project settings. The source project may stay open.

Launch the isolated editor hidden, with graphics enabled:

```text
Unity.exe -batchmode -projectPath <isolated project> -executeMethod UnityVfxCapture.Run -vfxConfig <absolute JSON> -vfxOutput <absolute directory> -logFile <absolute log>
```

The script enters real Play Mode, captures native camera RenderTextures, writes its report and exits. Omit `-quit` and `-nographics`. Start with one prefab, one view and two times; inspect images and metadata before a large batch. [The example](unity-vfx-capture.example.json) covers support/charge, a field and a liquid pour. Prefab paths are Unity asset paths beginning with `Assets/`.

The expanded MasterMagicFX study's [source selection](mastermagicfx/selection.json) and eight capture configurations are retained in [mastermagicfx/](mastermagicfx/). `unity-broad.json` covers the selected native cases; the volume, wide, detail and continuous configurations address specific observation gaps. The three condition configurations compare background and bloom. These files contain source references and research inputs; source binary assets remain in the supplied Unity project.

Use `stop: {"enabled": true, "at": 3}` to call the original `MLaser.StopLaser` when present, or native `StopEmitting` for particles. Optional `motion` supplies a linear velocity or orbit; `laser` supplies moving endpoints through the source `MLaser.SetLaser`. These also require `enabled: true`; omitted nested objects never activate a control. All prefab particle modules, shaders and source scripts execute in Unity. Instances are configured beneath an inactive staging parent, then activated with their authored child active states, PlayOnAwake and subemitter links intact. `visibleOnly` isolates renderer hierarchy paths while retaining simulation. See the small configuration classes at the start of the tool for these inputs.

For a moving trail's drain study, `stop.freezeMotion: true` freezes supplied movement/endpoints at the stop time and `stop.stopTrails: true` sets standalone TrailRenderer emission off. Both default to false. These are explicit researcher inputs, retained in frame metadata; remaining points expire according to the original trail lifetime.

`companions` optionally lists companion prefab asset paths, such as the original trail accompanying a bullet. Each is instantiated beneath the inactive stage at the root's world pose, then parented with `worldPositionStays=true`, matching the source preview's binding while preserving each companion's authored world scale. Companion particle seeds, stopping and cleanup participate in the same case. Their source paths are retained in frame metadata and the gallery.

Every PNG has JSON containing requested and actual capture time, global shader time, camera, GPU/pipeline conditions, particle count, material/shader errors, and pixel differences from the empty stage. `emptyCandidate` and `magentaCandidate` are screening flags: expected empty beginnings/endings and actual purple artwork need visual inspection. `capture-run.json` records run completion and errors, with editor/environment messages separated from capture and shader messages; the exact configuration is retained alongside it.

Capture uses an explicitly linear render target and RGBAFloat readback. In a Linear project the tool encodes RGB to sRGB before writing PNG; in a Gamma project it preserves display-encoded RGB. A separate camera with postprocessing disabled renders six known solid colors through the same target/readback path. `color-calibration.json` records expected and measured float/byte values; the run stops if calibration fails. PNG metadata also records the HDR peak and clipped-pixel count. Material brightness and exposure are untouched by this conversion.

The default stage has no bloom. `bloomIntensity`/`bloomThreshold` add explicitly recorded URP study bloom for comparison. The pack's `Commons/Miscs/Main Camera Profile.asset` is an older Post Processing Stack profile and is not automatically an SRP `VolumeProfile`; point `volumeProfile` only at a compatible asset. The capture log and metadata state failures rather than silently changing the render pipeline.

Generate the image viewer with `python tools/research/unity_vfx_gallery.py <capture directory>`. Its `gallery.html` contains a large current frame, case/view filters, discrete-time thumbnails and traceable diagnostics. It references existing PNGs and can also show a partial capture snapshot; rerun after completion to include the final frames.
