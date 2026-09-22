// Copy into Assets/ResearchCapture/UnityVfxCapture.cs in an isolated Unity project.
// Run with graphics: -batchmode -projectPath <copy> -executeMethod UnityVfxCapture.Run
// -vfxConfig <absolute JSON> -vfxOutput <absolute directory>. Do not pass -quit or -nographics.
#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.SceneManagement;

/// <summary>
/// Captures original prefabs in real Play Mode. Unity advances ParticleSystems,
/// TrailRenderers, source MonoBehaviours and shader time; this tool only supplies
/// a camera, a stage and explicit motion/laser inputs requested by a case.
/// All screenshots are read after the actual camera render, without WaitForEndOfFrame
/// (which does not resume in editor batch mode).
/// </summary>
public sealed class UnityVfxCapture : MonoBehaviour
{
    [Serializable] public sealed class Config
    {
        public int width = 960, height = 720;
        public float dt = 1f / 60f;
        public int warmupFrames = 8;
        public int seed = 1347;
        public bool ground = true, hdr = true;
        public bool captureGeometry = false, captureLinear = false, requireDepthTexture = false;
        public Color background = new Color(.055f, .065f, .09f, 1);
        public Color groundColor = new Color(.14f, .16f, .18f, 1);
        public float groundY = -.03f, groundSize = 40;
        public string volumeProfile = "";
        public float bloomIntensity = 0, bloomThreshold = .6f;
        public float timeoutSeconds = 90;
        public View[] views = { new View() };
        public Case[] cases = Array.Empty<Case>();
    }
    [Serializable] public sealed class View
    {
        public string id = "three-quarter";
        public Vector3 position = new Vector3(8, 5, -9), lookAt = new Vector3(0, 1, 0);
        public float fieldOfView = 42, orthographicSize = 6;
        public bool orthographic;
    }
    [Serializable] public sealed class Case
    {
        public string id = "effect", prefab = "";
        public float[] times = { 0, .05f, .1f, .2f, .4f, .7f, 1, 1.5f, 2, 3 };
        public Vector3 position, euler, scale = Vector3.one;
        public Stop stop;
        public Motion motion;
        public Laser laser;
        public string[] companions = Array.Empty<string>();
        // Names are relative hierarchy paths. Isolation hides only renderers;
        // simulation, subemitters and source scripts keep running.
        public string[] visibleOnly = Array.Empty<string>();
        public string notes = "";
    }
    // JsonUtility can create omitted nested objects. Presence is never authorization
    // to apply a motion/stop/laser input; every optional input is explicitly enabled.
    [Serializable] public sealed class Stop
    {
        public bool enabled;
        public float at;
        public bool freezeMotion, stopTrails;
    }
    [Serializable] public sealed class Motion
    {
        public bool enabled;
        public string kind = "linear";
        public Vector3 velocity = new Vector3(0, 0, 4);
        public Vector3 orbitAxis = Vector3.up;
        public float radius = 2, degreesPerSecond = 90;
        public bool faceVelocity = true;
    }
    [Serializable] public sealed class Laser
    {
        public bool enabled;
        public Vector3 start, end = new Vector3(0, 0, 6);
        public Vector3 endVelocity;
    }
    [Serializable] public sealed class Conditions
    {
        public string unity, graphicsApi, graphicsDevice, pipeline, colorSpace;
        public int width, height, seed;
        public bool hdr;
        public bool ground;
        public Color background, groundColor;
        public float dt, bloomIntensity, bloomThreshold;
        public string volumeProfile, timeMode, renderMode;
        public string targetGraphicsFormat, readbackFormat, pngEncoding;
        public bool targetSrgb;
    }
    [Serializable] public sealed class ShaderFact
    {
        public string renderer, material, shader;
        public bool supported;
        public string[] errors;
    }
    [Serializable] public sealed class FrameFact
    {
        public string caseId, prefab, image, view, notes;
        public float requestedTime, actualTime, globalTime;
        public int frame, caseFrame, particleCount, changedPixels, magentaPixels;
        public int clippedHdrPixels;
        public float peakLinearRgb;
        public int[] changedBounds;
        public bool emptyCandidate, magentaCandidate, rootMissing;
        public Vector3 cameraPosition, cameraEuler, rootPosition;
        public float fieldOfView, orthographicSize;
        public bool orthographic;
        public Conditions renderConditions;
        public ShaderFact[] shaders;
        public string[] messages;
        public Stop requestedStop;
        public Motion suppliedMotion;
        public Laser suppliedLaser;
        public string[] companions;
    }
    [Serializable] public sealed class CaseFact
    {
        public string id, prefab, status, error;
        public string[] metadata;
    }
    [Serializable] public sealed class RunFact
    {
        public string startedUtc, finishedUtc, status, error;
        public Conditions conditions;
        public List<CaseFact> cases = new List<CaseFact>();
        public List<string> messages = new List<string>();
        public List<string> environmentMessages = new List<string>();
        public List<string> captureMessages = new List<string>();
        public List<string> shaderMessages = new List<string>();
    }
    [Serializable] public sealed class ColorCalibrationSample
    {
        public Color inputSrgb, expectedTargetValue, rawTargetValue;
        public Color32 expectedPng, actualPng;
        public int maxByteError;
        public float maxTargetError;
        public bool passed;
    }
    [Serializable] public sealed class ColorCalibration
    {
        public string source, colorSpace, targetFormat, rawReadback, pngEncoding;
        public bool targetSrgb, passed;
        public List<ColorCalibrationSample> samples = new List<ColorCalibrationSample>();
    }
    sealed class CameraState
    {
        public View view;
        public Camera camera;
        public RenderTexture target;
        public Color32[] baseline;
        public int capturedRequest = -1;
    }

    public string configurationPath, outputPath;
    const string SessionKey = "WorldCombat.ResearchCapture";
    Config config;
    RunFact report;
    readonly List<CameraState> cameras = new List<CameraState>();
    readonly List<string> messages = new List<string>();
    readonly List<string> frameFiles = new List<string>();
    GameObject currentRoot, currentStage;
    Quaternion authoredRotation;
    Case currentCase;
    float caseStart;
    int caseStartFrame, caseIndex = -1, sampleIndex, requestId;
    bool pending, baselinePending, stopped, done;
    int warmupStart;
    double lastProgress;
    float currentRequestedTime;
    Conditions conditions;
    Camera calibrationCamera;
    RenderTexture calibrationTarget;
    Color[] calibrationColors;
    int calibrationIndex;
    ColorCalibration calibration;
    bool calibrationComplete;

    public static void Run()
    {
        var arguments = Environment.GetCommandLineArgs();
        string Argument(string name)
        {
            int i = Array.IndexOf(arguments, name);
            if (i < 0 || i + 1 >= arguments.Length) throw new ArgumentException("Missing " + name);
            return Path.GetFullPath(arguments[i + 1]);
        }
        try
        {
            string cfg = Argument("-vfxConfig"), output = Argument("-vfxOutput");
            if (!File.Exists(cfg)) throw new FileNotFoundException("Capture configuration", cfg);
            if (SystemInfo.graphicsDeviceType == GraphicsDeviceType.Null)
                throw new InvalidOperationException("A graphics device is required; remove -nographics.");
            if (!Application.isBatchMode)
                throw new InvalidOperationException("Use an isolated project in -batchmode.");
            Directory.CreateDirectory(output);
            // SessionState survives the Play Mode domain reload and lets the watchdog
            // detect a script compile failure or a Play Mode startup that never completes.
            SessionState.SetString(SessionKey, output);
            SessionState.SetFloat(SessionKey + ".start", (float)EditorApplication.timeSinceStartup);
            ShaderUtil.allowAsyncCompilation = false;
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            var host = new GameObject("WorldCombat asset study capture");
            var driver = host.AddComponent<UnityVfxCapture>();
            driver.configurationPath = cfg;
            driver.outputPath = output;
            Directory.CreateDirectory("Assets/__CaptureGenerated");
            EditorSceneManager.SaveScene(SceneManager.GetActiveScene(), "Assets/__CaptureGenerated/Study.unity");
            Debug.Log("VFX_CAPTURE_START " + cfg);
            EditorApplication.isPlaying = true;
        }
        catch (Exception e)
        {
            Debug.LogException(e);
            EditorApplication.Exit(2);
        }
    }

    [InitializeOnLoadMethod]
    static void InstallStartupWatchdog()
    {
        EditorApplication.update -= StartupWatchdog;
        EditorApplication.update += StartupWatchdog;
    }
    static void StartupWatchdog()
    {
        string output = SessionState.GetString(SessionKey, "");
        if (output.Length == 0) return;
        float start = SessionState.GetFloat(SessionKey + ".start", 0);
        if (EditorApplication.timeSinceStartup - start < 240) return;
        // The running component refreshes this timestamp, including while rendering.
        Directory.CreateDirectory(output);
        File.WriteAllText(Path.Combine(output, "startup-error.txt"),
            "Unity did not make capture progress for 240 seconds. Inspect the Unity log for shader, compilation, licensing or graphics errors.");
        SessionState.EraseString(SessionKey);
        EditorApplication.Exit(3);
    }

    void Start()
    {
        if (!Application.isPlaying || string.IsNullOrEmpty(configurationPath)) return;
        Application.logMessageReceived += OnLog;
        try
        {
            config = new Config();
            JsonUtility.FromJsonOverwrite(File.ReadAllText(configurationPath), config);
            if (config == null || config.cases == null || config.cases.Length == 0)
                throw new InvalidOperationException("At least one case is required.");
            if (config.dt <= 0 || config.dt > .1f) throw new InvalidOperationException("dt must be in (0, .1].");
            if (config.width < 64 || config.height < 64) throw new InvalidOperationException("Capture resolution is too small.");
            if (config.views == null || config.views.Length == 0) config.views = new[] { new View() };
            foreach (var view in config.views)
            {
                if (view.fieldOfView <= 0) view.fieldOfView = 42;
                if (view.orthographicSize <= 0) view.orthographicSize = 6;
            }
            foreach (var item in config.cases)
                if (item.scale == Vector3.zero) item.scale = Vector3.one;
            Directory.CreateDirectory(outputPath);
            string retainedConfig = Path.Combine(outputPath, "input-config.json");
            if (!string.Equals(Path.GetFullPath(configurationPath), Path.GetFullPath(retainedConfig), StringComparison.OrdinalIgnoreCase))
                File.Copy(configurationPath, retainedConfig, true);
            Time.timeScale = 1;
            Time.captureDeltaTime = config.dt;
            Time.fixedDeltaTime = config.dt;
            Time.maximumDeltaTime = config.dt;
            Application.runInBackground = true;
            QualitySettings.vSyncCount = 0;
            UnityEngine.Random.InitState(config.seed);
            MakeStage();
            conditions = new Conditions {
                unity = Application.unityVersion, graphicsApi = SystemInfo.graphicsDeviceType.ToString(),
                graphicsDevice = SystemInfo.graphicsDeviceName,
                pipeline = GraphicsSettings.currentRenderPipeline == null ? "Built-in" : GraphicsSettings.currentRenderPipeline.name,
                colorSpace = QualitySettings.activeColorSpace.ToString(), width = config.width, height = config.height, seed = config.seed,
                hdr = config.hdr, dt = config.dt, bloomIntensity = config.bloomIntensity,
                ground = config.ground, background = config.background, groundColor = config.groundColor,
                bloomThreshold = config.bloomThreshold, volumeProfile = config.volumeProfile,
                timeMode = "Real Play Mode; Time.captureDeltaTime and fixedDeltaTime; native automatic particle/trail/script update",
                renderMode = "Enabled cameras to RenderTexture; readback in endCameraRendering/onPostRender"
            };
            conditions.targetGraphicsFormat = cameras[0].target.graphicsFormat.ToString();
            conditions.targetSrgb = cameras[0].target.sRGB;
            conditions.readbackFormat = "RGBAFloat; no 8-bit quantization before color encoding";
            conditions.pngEncoding = QualitySettings.activeColorSpace == ColorSpace.Linear ?
                "Linear target RGB -> Mathf.LinearToGammaSpace -> clamped sRGB8 PNG" : "Gamma project target RGB -> clamped sRGB8 PNG";
            report = new RunFact { startedUtc = DateTime.UtcNow.ToString("O"), status = "running", conditions = conditions };
            RenderPipelineManager.endCameraRendering += OnSrpCamera;
            Camera.onPostRender += OnBuiltinCamera;
            MakeColorCalibration();
            warmupStart = Time.frameCount;
            Progress();
            WriteReport();
        }
        catch (Exception e) { Fail(e); }
    }

    void MakeStage()
    {
        RenderSettings.ambientMode = AmbientMode.Flat;
        RenderSettings.ambientLight = new Color(.45f, .45f, .45f);
        RenderSettings.fog = false;
        if (config.ground)
        {
            var ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Study ground";
            ground.transform.position = new Vector3(0, config.groundY, 0);
            ground.transform.localScale = Vector3.one * (config.groundSize / 10f);
            var shader = Shader.Find(GraphicsSettings.currentRenderPipeline == null ? "Standard" : "Universal Render Pipeline/Lit");
            if (shader == null || !shader.isSupported) throw new InvalidOperationException("No supported study ground shader.");
            var material = new Material(shader) { name = "Study ground material", color = config.groundColor };
            material.SetFloat("_Smoothness", .1f);
            ground.GetComponent<Renderer>().sharedMaterial = material;
        }
        var light = new GameObject("Study light").AddComponent<Light>();
        light.type = LightType.Directional;
        light.intensity = 1.1f;
        light.transform.rotation = Quaternion.Euler(45, -30, 0);
        foreach (var view in config.views)
        {
            var cam = new GameObject("Study camera " + view.id).AddComponent<Camera>();
            cam.transform.position = view.position;
            cam.transform.LookAt(view.lookAt);
            cam.fieldOfView = view.fieldOfView;
            cam.orthographic = view.orthographic;
            cam.orthographicSize = view.orthographicSize;
            cam.nearClipPlane = .03f;
            cam.farClipPlane = 150;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = config.background;
            cam.allowHDR = config.hdr;
            cam.allowMSAA = false;
            cam.depth = cameras.Count;
            if (cameras.Count == 0) cam.tag = "MainCamera";
            var rt = new RenderTexture(config.width, config.height, 24,
                config.hdr ? RenderTextureFormat.ARGBHalf : RenderTextureFormat.ARGB32, RenderTextureReadWrite.Linear) {
                name = "Study " + view.id, antiAliasing = 1
            };
            rt.Create();
            cam.targetTexture = rt;
            cameras.Add(new CameraState { view = view, camera = cam, target = rt });
            var extraType = Type.GetType("UnityEngine.Rendering.Universal.UniversalAdditionalCameraData, Unity.RenderPipelines.Universal.Runtime");
            if (extraType != null)
            {
                var extra = cam.gameObject.AddComponent(extraType);
                extraType.GetProperty("renderPostProcessing")?.SetValue(extra,
                    config.bloomIntensity > 0 || !string.IsNullOrEmpty(config.volumeProfile));
                if(config.requireDepthTexture)extraType.GetProperty("requiresDepthTexture")?.SetValue(extra,true);
            }
        }
        if (!string.IsNullOrEmpty(config.volumeProfile) || config.bloomIntensity > 0)
        {
            var volume = new GameObject("Study postprocess").AddComponent<Volume>();
            volume.isGlobal = true;
            volume.priority = 100;
            if (!string.IsNullOrEmpty(config.volumeProfile))
            {
                volume.sharedProfile = AssetDatabase.LoadAssetAtPath<VolumeProfile>(config.volumeProfile);
                if (volume.sharedProfile == null)
                    throw new InvalidOperationException("Volume profile is not a current SRP VolumeProfile: " + config.volumeProfile);
            }
            else volume.sharedProfile = ScriptableObject.CreateInstance<VolumeProfile>();
            if (config.bloomIntensity > 0)
            {
                var bloomType = Type.GetType("UnityEngine.Rendering.Universal.Bloom, Unity.RenderPipelines.Universal.Runtime");
                if (bloomType == null) throw new InvalidOperationException("Explicit study bloom requires URP.");
                var bloom = volume.profile.Add(bloomType, true);
                SetVolumeFloat(bloom, "intensity", config.bloomIntensity);
                SetVolumeFloat(bloom, "threshold", config.bloomThreshold);
            }
        }
    }
    void MakeColorCalibration()
    {
        calibrationColors = new[] { config.background, new Color(.18f, .18f, .18f, 1),
            new Color(.5f, .5f, .5f, 1), new Color(.75f, .75f, .75f, 1),
            new Color(.15f, .45f, .8f, 1), Color.white };
        calibrationCamera = new GameObject("Study readback color calibration").AddComponent<Camera>();
        calibrationCamera.cullingMask = 0;
        calibrationCamera.clearFlags = CameraClearFlags.SolidColor;
        calibrationCamera.backgroundColor = calibrationColors[0];
        calibrationCamera.allowHDR = config.hdr;
        calibrationCamera.allowMSAA = false;
        calibrationCamera.depth = cameras.Count;
        calibrationTarget = new RenderTexture(32, 32, 24,
            config.hdr ? RenderTextureFormat.ARGBHalf : RenderTextureFormat.ARGB32, RenderTextureReadWrite.Linear);
        calibrationTarget.Create();
        calibrationCamera.targetTexture = calibrationTarget;
        var extraType = Type.GetType("UnityEngine.Rendering.Universal.UniversalAdditionalCameraData, Unity.RenderPipelines.Universal.Runtime");
        if (extraType != null)
        {
            var extra = calibrationCamera.gameObject.AddComponent(extraType);
            extraType.GetProperty("renderPostProcessing")?.SetValue(extra, false);
        }
        calibration = new ColorCalibration {
            source = "Real camera solid-color clear; cullingMask=0; postprocessing disabled; same graphics format and readback as effect views",
            colorSpace = QualitySettings.activeColorSpace.ToString(), targetFormat = calibrationTarget.graphicsFormat.ToString(),
            targetSrgb = calibrationTarget.sRGB, rawReadback = "RGBAFloat", pngEncoding = conditions.pngEncoding
        };
    }
    void ReadColorCalibration()
    {
        if (calibrationComplete || done) return;
        Texture2D raw = null, encoded = null;
        var previous = RenderTexture.active;
        try
        {
            raw = ReadFloatTarget(calibrationTarget);
            var target = raw.GetPixel(16, 16);
            Color input = calibrationColors[calibrationIndex];
            Color expected = QualitySettings.activeColorSpace == ColorSpace.Linear ? input.linear : input;
            Color32 output = EncodeDisplayPixel(target);
            Color32 expectedPng = input;
            int byteError = Math.Max(Math.Abs(output.r - expectedPng.r), Math.Max(Math.Abs(output.g - expectedPng.g), Math.Abs(output.b - expectedPng.b)));
            float targetError = Mathf.Max(Mathf.Abs(target.r - expected.r), Mathf.Max(Mathf.Abs(target.g - expected.g), Mathf.Abs(target.b - expected.b)));
            calibration.samples.Add(new ColorCalibrationSample {
                inputSrgb = input, expectedTargetValue = expected, rawTargetValue = target,
                expectedPng = expectedPng, actualPng = output, maxByteError = byteError,
                maxTargetError = targetError, passed = byteError <= 2 && targetError <= .005f
            });
            encoded = EncodeDisplayImage(raw.GetPixels(), 32, 32, out _, out _);
            File.WriteAllBytes(Path.Combine(outputPath, "color-calibration-" + calibrationIndex + ".png"), encoded.EncodeToPNG());
            calibrationIndex++;
            if (calibrationIndex >= calibrationColors.Length)
            {
                calibrationComplete = true;
                calibration.passed = calibration.samples.All(s => s.passed);
                File.WriteAllText(Path.Combine(outputPath, "color-calibration.json"), JsonUtility.ToJson(calibration, true));
                calibrationCamera.enabled = false;
                if (!calibration.passed)
                    throw new InvalidOperationException("Known-color readback calibration failed. Inspect color-calibration.json before interpreting effect brightness.");
                Debug.Log("VFX_CAPTURE_COLOR_CALIBRATION passed");
            }
            else calibrationCamera.backgroundColor = calibrationColors[calibrationIndex];
            Progress();
        }
        catch (Exception e) { Fail(e); }
        finally
        {
            RenderTexture.active = previous;
            if (raw != null) Destroy(raw);
            if (encoded != null) Destroy(encoded);
        }
    }
    static Texture2D ReadFloatTarget(RenderTexture target)
    {
        RenderTexture.active = target;
        var raw = new Texture2D(target.width, target.height, TextureFormat.RGBAFloat, false, true);
        raw.ReadPixels(new Rect(0, 0, target.width, target.height), 0, 0, false);
        raw.Apply(false, false);
        return raw;
    }
    static Color32 EncodeDisplayPixel(Color value)
    {
        if (QualitySettings.activeColorSpace == ColorSpace.Linear)
        {
            value.r = Mathf.LinearToGammaSpace(Mathf.Max(0, value.r));
            value.g = Mathf.LinearToGammaSpace(Mathf.Max(0, value.g));
            value.b = Mathf.LinearToGammaSpace(Mathf.Max(0, value.b));
        }
        return new Color(Mathf.Clamp01(value.r), Mathf.Clamp01(value.g), Mathf.Clamp01(value.b), Mathf.Clamp01(value.a));
    }
    static Texture2D EncodeDisplayImage(Color[] raw, int width, int height, out float peak, out int clipped)
    {
        var colors = new Color32[raw.Length];
        peak = 0;
        clipped = 0;
        for (int i = 0; i < raw.Length; i++)
        {
            float maximum = Mathf.Max(raw[i].r, Mathf.Max(raw[i].g, raw[i].b));
            peak = Mathf.Max(peak, maximum);
            if (maximum > 1) clipped++;
            colors[i] = EncodeDisplayPixel(raw[i]);
        }
        // SetPixels32 stores already-encoded bytes; EncodeToPNG writes these bytes.
        // This texture's sRGB sampling flag does not perform an additional CPU encode.
        var encoded = new Texture2D(width, height, TextureFormat.RGBA32, false, false);
        encoded.SetPixels32(colors);
        encoded.Apply(false, false);
        return encoded;
    }
    static void SetVolumeFloat(VolumeComponent component, string field, float value)
    {
        var parameter = component.GetType().GetField(field)?.GetValue(component);
        if (parameter == null) throw new InvalidOperationException("Missing volume parameter " + field);
        parameter.GetType().GetProperty("value")?.SetValue(parameter, value);
        parameter.GetType().GetProperty("overrideState")?.SetValue(parameter, true);
    }

    void Update()
    {
        if (done || config == null) return;
        try
        {
            if (!calibrationComplete)
            {
                if (EditorApplication.timeSinceStartup - lastProgress > config.timeoutSeconds)
                    throw new TimeoutException("Known-color calibration camera did not render.");
                return;
            }
            // Motion and source control advance every frame, including the frame
            // after a screenshot. Capturing must not introduce stop/start motion.
            if (caseIndex >= 0 && currentCase != null)
            {
                float sourceTime = Time.time - caseStart;
                ApplyInputs(sourceTime);
                if (!stopped && currentCase.stop != null && currentCase.stop.enabled && sourceTime + config.dt * .1f >= currentCase.stop.at)
                {
                    stopped = true;
                    bool laserStopped = InvokeSource("MasterFX.MLaser", "StopLaser", Array.Empty<object>());
                    if (!laserStopped && currentRoot != null)
                        foreach (var ps in currentRoot.GetComponentsInChildren<ParticleSystem>())
                            ps.Stop(false, ParticleSystemStopBehavior.StopEmitting);
                    if (currentCase.stop.stopTrails && currentRoot != null)
                        foreach (var trail in currentRoot.GetComponentsInChildren<TrailRenderer>())
                            trail.emitting = false;
                }
            }
            if (pending)
            {
                if (EditorApplication.timeSinceStartup - lastProgress > config.timeoutSeconds)
                    throw new TimeoutException("Camera output did not arrive. Graphics API=" + SystemInfo.graphicsDeviceType +
                        "; pipeline=" + conditions.pipeline + ". Use graphics-enabled batchmode; inspect the Unity log.");
                if (cameras.Any(c => c.capturedRequest != requestId)) return;
                pending = false;
                Progress();
                if (baselinePending) { baselinePending = false; NextCase(); return; }
                else
                {
                    sampleIndex++;
                    if (sampleIndex >= currentCase.times.Length) { NextCase(); return; }
                }
            }
            if (caseIndex < 0)
            {
                if (Time.frameCount - warmupStart >= config.warmupFrames)
                {
                    baselinePending = true;
                    Request(0);
                }
                return;
            }
            float elapsed = Time.time - caseStart;
            if (sampleIndex < currentCase.times.Length && elapsed + config.dt * .1f >= currentCase.times[sampleIndex])
                Request(currentCase.times[sampleIndex]);
        }
        catch (Exception e) { Fail(e); }
    }

    void NextCase()
    {
        if (caseIndex >= 0)
        {
            report.cases.Add(new CaseFact { id = currentCase.id, prefab = currentCase.prefab,
                status = "captured", metadata = frameFiles.ToArray() });
            frameFiles.Clear();
            if (currentStage != null) Destroy(currentStage);
            currentStage = null;
            currentRoot = null;
            WriteReport();
        }
        caseIndex++;
        if (caseIndex >= config.cases.Length) { Finish(); return; }
        currentCase = config.cases[caseIndex];
        if (string.IsNullOrWhiteSpace(currentCase.id) || currentCase.times == null || currentCase.times.Length == 0)
            throw new InvalidOperationException("Every case needs an id and sample times.");
        if (currentCase.times.Any(t => t < 0) || !currentCase.times.SequenceEqual(currentCase.times.OrderBy(t => t)))
            throw new InvalidOperationException("Sample times must be nonnegative and ordered: " + currentCase.id);
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(currentCase.prefab);
        if (prefab == null) throw new FileNotFoundException("Missing prefab asset: " + currentCase.prefab);
        messages.Clear();
        // Instantiate under an inactive parent so native PlayOnAwake and source
        // OnEnable/Start cannot run before seeds, placement and isolation are ready.
        // The original hierarchy's activeSelf, playOnAwake and subemitter links stay intact.
        currentStage = new GameObject("Study case " + currentCase.id);
        currentStage.SetActive(false);
        currentRoot = Instantiate(prefab, currentStage.transform, false);
        currentRoot.name = prefab.name + " [study]";
        authoredRotation = currentRoot.transform.localRotation;
        currentRoot.transform.localPosition = currentCase.position;
        currentRoot.transform.localRotation = Quaternion.Euler(currentCase.euler) * authoredRotation;
        currentRoot.transform.localScale = Vector3.Scale(currentRoot.transform.localScale, currentCase.scale);
        foreach (var companionPath in currentCase.companions ?? Array.Empty<string>())
        {
            var companionPrefab = AssetDatabase.LoadAssetAtPath<GameObject>(companionPath);
            if (companionPrefab == null) throw new FileNotFoundException("Missing companion prefab asset: " + companionPath);
            // Match the source bullet preview: create the trail at the bullet pose,
            // then SetParent(worldPositionStays=true). The inactive identity stage
            // keeps it stopped while retaining the companion's own world scale.
            var companion = Instantiate(companionPrefab, currentStage.transform, false);
            companion.name = companionPrefab.name + " [study companion]";
            companion.transform.SetPositionAndRotation(currentRoot.transform.position, currentRoot.transform.rotation);
            companion.transform.SetParent(currentRoot.transform, true);
        }
        // Seeding changes only the random realization, never the authored modules.
        int n = 0;
        foreach (var ps in currentRoot.GetComponentsInChildren<ParticleSystem>(true))
        {
            // Normally inactive instantiation is already stopped. Serialized or
            // editor-preview playing state must also be fully stopped before seeding.
            if (ps.isPlaying || ps.particleCount != 0)
                ps.Stop(false, ParticleSystemStopBehavior.StopEmittingAndClear);
            ps.useAutoRandomSeed = false;
            ps.randomSeed = (uint)(config.seed + n++);
        }
        if (currentCase.visibleOnly != null && currentCase.visibleOnly.Length > 0)
            foreach (var renderer in currentRoot.GetComponentsInChildren<Renderer>(true))
            {
                string path = AnimationUtility.CalculateTransformPath(renderer.transform, currentRoot.transform);
                renderer.enabled = renderer.enabled && currentCase.visibleOnly.Any(p => path == p || path.StartsWith(p + "/", StringComparison.Ordinal));
            }
        caseStart = Time.time;
        caseStartFrame = Time.frameCount;
        sampleIndex = 0;
        stopped = false;
        ApplyInputs(0);
        currentStage.SetActive(true);
        Progress();
        Debug.Log("VFX_CAPTURE_CASE " + currentCase.id + " " + currentCase.prefab);
        if (currentCase.times[0] <= 0) Request(0);
    }

    void ApplyInputs(float time)
    {
        if (currentRoot == null) return;
        if (currentCase.stop != null && currentCase.stop.enabled && currentCase.stop.freezeMotion)
            time = Mathf.Min(time, currentCase.stop.at);
        var motion = currentCase.motion;
        if (motion != null && motion.enabled)
        {
            Vector3 offset, velocity;
            if (motion.kind == "orbit")
            {
                var axis = motion.orbitAxis.normalized;
                var radial = Vector3.Cross(axis, Vector3.forward);
                if (radial.sqrMagnitude < .01f) radial = Vector3.Cross(axis, Vector3.right);
                offset = Quaternion.AngleAxis(motion.degreesPerSecond * time, axis) * radial.normalized * motion.radius;
                velocity = Vector3.Cross(axis, offset) * motion.degreesPerSecond * Mathf.Deg2Rad;
            }
            else { offset = motion.velocity * time; velocity = motion.velocity; }
            currentRoot.transform.position = currentCase.position + offset;
            if (motion.faceVelocity && velocity.sqrMagnitude > .00001f)
                currentRoot.transform.rotation = Quaternion.LookRotation(velocity.normalized) * authoredRotation;
        }
        if (currentCase.laser != null && currentCase.laser.enabled)
        {
            var laser = currentCase.laser;
            if (!InvokeSource("MasterFX.MLaser", "SetLaser", new object[] { laser.start, laser.end + laser.endVelocity * time }))
                throw new InvalidOperationException("Case requested MLaser inputs but the prefab has no MasterFX.MLaser: " + currentCase.id);
        }
    }
    bool InvokeSource(string type, string method, object[] args)
    {
        if (currentRoot == null) return false;
        bool called = false;
        foreach (var source in currentRoot.GetComponentsInChildren<MonoBehaviour>(true))
        {
            if (source == null || source.GetType().FullName != type) continue;
            var call = source.GetType().GetMethod(method, BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Instance);
            if (call == null) continue;
            call.Invoke(source, args);
            called = true;
        }
        return called;
    }
    void Request(float time)
    {
        currentRequestedTime = time;
        requestId++;
        pending = true;
        Progress();
    }
    void OnSrpCamera(ScriptableRenderContext context, Camera camera) { ReadCamera(camera); }
    void OnBuiltinCamera(Camera camera)
    {
        if (GraphicsSettings.currentRenderPipeline == null) ReadCamera(camera);
    }
    void ReadCamera(Camera camera)
    {
        if (camera == calibrationCamera) { ReadColorCalibration(); return; }
        if (!pending || done) return;
        var state = cameras.FirstOrDefault(c => c.camera == camera);
        if (state == null || state.capturedRequest == requestId) return;
        Texture2D image = null, raw = null;
        var previous = RenderTexture.active;
        try
        {
            raw = ReadFloatTarget(state.target);
            image = EncodeDisplayImage(raw.GetPixels(), config.width, config.height, out float peak, out int clipped);
            var pixels = image.GetPixels32();
            if (baselinePending)
            {
                state.baseline = pixels;
                File.WriteAllBytes(Path.Combine(outputPath, "baseline-" + Safe(state.view.id) + ".png"), image.EncodeToPNG());
                if(config.captureLinear)UnityFrameGeometry.SaveColor(Path.Combine(outputPath,"baseline-"+Safe(state.view.id)),raw);
            }
            else SaveFrame(state, image, pixels, peak, clipped, raw);
            state.capturedRequest = requestId;
            Progress();
        }
        catch (Exception e) { Fail(e); }
        finally
        {
            RenderTexture.active = previous;
            if (image != null) Destroy(image);
            if (raw != null) Destroy(raw);
        }
    }
    void SaveFrame(CameraState state, Texture2D image, Color32[] pixels, float peak, int clipped, Texture2D raw)
    {
        int changed = 0, magenta = 0, minX = config.width, minY = config.height, maxX = -1, maxY = -1;
        for (int i = 0; i < pixels.Length; i++)
        {
            var p = pixels[i];
            var b = state.baseline[i];
            if (Math.Abs(p.r - b.r) + Math.Abs(p.g - b.g) + Math.Abs(p.b - b.b) > 24)
            {
                changed++;
                int x = i % config.width, y = i / config.width;
                minX = Math.Min(minX, x); maxX = Math.Max(maxX, x);
                minY = Math.Min(minY, y); maxY = Math.Max(maxY, y);
            }
            if (p.r > 180 && p.b > 180 && p.g < 80) magenta++;
        }
        string directory = Path.Combine(outputPath, Safe(currentCase.id));
        Directory.CreateDirectory(directory);
        string stem = sampleIndex.ToString("D4") + "-" + currentRequestedTime.ToString("0.000", System.Globalization.CultureInfo.InvariantCulture) + "s-" + Safe(state.view.id);
        string png = Path.Combine(directory, stem + ".png"), json = Path.Combine(directory, stem + ".json");
        File.WriteAllBytes(png, image.EncodeToPNG());
        if(config.captureLinear)UnityFrameGeometry.SaveColor(Path.Combine(directory,stem),raw);
        if(config.captureGeometry)UnityFrameGeometry.Save(Path.Combine(directory,stem),currentRoot,state.camera,Time.time-caseStart);
        var shaders = new List<ShaderFact>();
        int count = 0;
        if (currentRoot != null)
        {
            foreach (var ps in currentRoot.GetComponentsInChildren<ParticleSystem>()) count += ps.particleCount;
            foreach (var renderer in currentRoot.GetComponentsInChildren<Renderer>())
                foreach (var material in renderer.sharedMaterials)
                {
                    if (material == null) continue;
                    var shader = material.shader;
                    shaders.Add(new ShaderFact {
                        renderer = AnimationUtility.CalculateTransformPath(renderer.transform, currentRoot.transform),
                        material = material.name, shader = shader == null ? "<null>" : shader.name,
                        supported = shader != null && shader.isSupported,
                        errors = shader == null ? new[] { "Null shader" } : ShaderUtil.GetShaderMessages(shader)
                            .Where(m => m.severity.ToString() == "Error").Select(m => m.message).Distinct().ToArray()
                    });
                }
        }
        var metadata = new FrameFact {
            caseId = currentCase.id, prefab = currentCase.prefab, image = png, view = state.view.id,
            requestedTime = currentRequestedTime, actualTime = Time.time - caseStart, globalTime = Time.time, frame = Time.frameCount,
            caseFrame = Time.frameCount - caseStartFrame, particleCount = count, changedPixels = changed,
            peakLinearRgb = peak, clippedHdrPixels = clipped,
            magentaPixels = magenta, changedBounds = maxX < 0 ? Array.Empty<int>() : new[] { minX, minY, maxX, maxY },
            emptyCandidate = changed < Math.Max(16, pixels.Length / 20000),
            magentaCandidate = magenta > pixels.Length / 50,
            rootMissing = currentRoot == null, cameraPosition = state.camera.transform.position,
            cameraEuler = state.camera.transform.eulerAngles, rootPosition = currentRoot == null ? Vector3.zero : currentRoot.transform.position,
            fieldOfView = state.camera.fieldOfView, orthographic = state.camera.orthographic,
            orthographicSize = state.camera.orthographicSize, renderConditions = conditions,
            shaders = shaders.ToArray(), messages = messages.Distinct().ToArray(), notes = currentCase.notes,
            requestedStop = currentCase.stop, suppliedMotion = currentCase.motion, suppliedLaser = currentCase.laser,
            companions = currentCase.companions ?? Array.Empty<string>()
        };
        File.WriteAllText(json, JsonUtility.ToJson(metadata, true));
        frameFiles.Add(json);
    }
    static string Safe(string value)
    {
        foreach (char invalid in Path.GetInvalidFileNameChars()) value = value.Replace(invalid, '_');
        return value.Replace('/', '_').Replace('\\', '_');
    }
    void OnLog(string text, string stack, LogType type)
    {
        if (type == LogType.Error || type == LogType.Exception || type == LogType.Assert ||
            (type == LogType.Warning && (text.IndexOf("shader", StringComparison.OrdinalIgnoreCase) >= 0 || text.IndexOf("render", StringComparison.OrdinalIgnoreCase) >= 0)))
        {
            string message = type + ": " + text;
            bool editorEnvironment = caseIndex < 0 ||
                stack.IndexOf("UnityEditor.Search", StringComparison.Ordinal) >= 0 ||
                stack.IndexOf("SearchDatabase", StringComparison.Ordinal) >= 0 ||
                stack.IndexOf("IndexationOnStartup", StringComparison.Ordinal) >= 0;
            if (!editorEnvironment && messages.Count < 200) messages.Add(message);
            if (report != null)
            {
                if (report.messages.Count < 500 && !report.messages.Contains(message)) report.messages.Add(message);
                var destination = editorEnvironment ? report.environmentMessages : report.captureMessages;
                if (destination.Count < 200 && !destination.Contains(message)) destination.Add(message);
                if (!editorEnvironment && text.IndexOf("shader", StringComparison.OrdinalIgnoreCase) >= 0 &&
                    report.shaderMessages.Count < 200 && !report.shaderMessages.Contains(message))
                    report.shaderMessages.Add(message);
            }
        }
    }
    void Progress()
    {
        lastProgress = EditorApplication.timeSinceStartup;
        SessionState.SetFloat(SessionKey + ".start", (float)lastProgress);
    }
    void WriteReport()
    {
        if (report != null) File.WriteAllText(Path.Combine(outputPath, "capture-run.json"), JsonUtility.ToJson(report, true));
    }
    void Finish()
    {
        done = true;
        report.finishedUtc = DateTime.UtcNow.ToString("O");
        report.status = report.captureMessages.Any(m => m.StartsWith("Error:") || m.StartsWith("Exception:") || m.StartsWith("Assert:")) ? "captured-with-errors" : "captured";
        WriteReport();
        Debug.Log("VFX_CAPTURE_DONE " + outputPath);
        Quit(report.status == "captured" ? 0 : 1);
    }
    void Fail(Exception error)
    {
        if (done) return;
        done = true;
        Directory.CreateDirectory(outputPath);
        if (report == null) report = new RunFact { startedUtc = DateTime.UtcNow.ToString("O") };
        report.status = "failed";
        report.error = error.ToString();
        report.finishedUtc = DateTime.UtcNow.ToString("O");
        WriteReport();
        Debug.LogException(error);
        Quit(2);
    }
    void Quit(int code)
    {
        RenderPipelineManager.endCameraRendering -= OnSrpCamera;
        Camera.onPostRender -= OnBuiltinCamera;
        Application.logMessageReceived -= OnLog;
        SessionState.EraseString(SessionKey);
        EditorApplication.delayCall += () => EditorApplication.Exit(code);
    }
}
#endif
