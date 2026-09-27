/** 暗紫视线连接施术者与目标，命中后以头顶余悸标示减速仍在。 */
const ScaryfaceDefinition: ParticleDefinition = {
    interrupt: "drain",
    moments: {
        windup: {
            duration: 14,
            emitters: [
                {
                    name: "face_gather", bind: "source", height: 0.78,
                    particle: "world_combat_core:cobblemon/generic/orb/smokeorb",
                    rate: 16, shape: { kind: "sphere", radius: 0.3 },
                    direction: "inward", speed: [0.02, 0.07],
                    lifetime: [10, 18], size: [0.18, 0.03],
                    color: 0x5B2A86, alpha: [0.5, 0], light: "world", maxParticles: 30
                },
                {
                    name: "face_frost", bind: "source", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 8, shape: { kind: "ring", radius: 0.24 },
                    direction: "inward", speed: [0.02, 0.05],
                    lifetime: [8, 14], size: [0.09, 0.02],
                    color: 0xE8E4F0, alpha: [0.6, 0], light: "full", maxParticles: 16
                }
            ]
        },
        gaze: {
            duration: 26,
            emitters: [
                {
                    name: "gaze_line", bind: "path", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 70, shape: { kind: "polyline" },
                    speed: [0.0, 0.02],
                    lifetime: [6, 12], size: [0.11, 0.02],
                    color: 0x8A4FD0, alpha: [0.9, 0], light: "full", maxParticles: 90
                },
                {
                    name: "gaze_core", bind: "target", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/impact/impact_dark",
                    burst: { count: { data: "shards", fallback: 26 } }, shape: { kind: "sphere_surface", radius: 0.34 },
                    direction: "outward", speed: [0.05, 0.18], spread: 26,
                    lifetime: [9, 16], size: [0.34, 0.08], sizeMode: "index",
                    color: 0x5B2A86, alpha: [1, 0], light: "full", bloom: 0.2, maxParticles: 60
                },
                {
                    name: "gaze_shock", bind: "target", height: 0.92,
                    particle: "world_combat_core:cobblemon/generic/orb/smallfadeorb",
                    burst: { count: 18 }, shape: { kind: "sphere", radius: 0.3 },
                    direction: "outward", speed: [0.03, 0.1],
                    lifetime: [10, 18], size: [0.14, 0.03],
                    color: 0xE8E4F0, alpha: [0.7, 0], light: "full", maxParticles: 30
                }
            ]
        },
        blocked: {
            duration: 20,
            emitters: [
                {
                    name: "blocked_line", bind: "path", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/sparkle/glowingsparkle",
                    rate: 24, shape: { kind: "polyline" },
                    speed: [0.0, 0.01],
                    lifetime: [5, 9], size: [0.09, 0.02],
                    color: 0x5B2A86, alpha: [0.45, 0], light: "world", maxParticles: 36
                },
                {
                    name: "blocked_scuff", bind: "point", height: 0.8,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 14 }, shape: { kind: "sphere", radius: 0.22 },
                    direction: "outward", speed: [0.01, 0.05], drag: 0.9,
                    lifetime: [6, 12], size: [0.06, 0.01],
                    color: 0x3A1E52, alpha: [0.4, 0], light: "world", maxParticles: 22
                }
            ]
        },
        fizzle: {
            duration: 14,
            emitters: [
                {
                    name: "fizzle_dust", bind: "point", height: 0.6,
                    particle: "world_combat_core:cobblemon/generic/tinydust",
                    burst: { count: 16 }, shape: { kind: "sphere", radius: 0.24 },
                    direction: "outward", speed: [0.02, 0.07], drag: 0.9,
                    lifetime: [8, 14], size: [0.06, 0.01],
                    color: 0x5B2A86, alpha: [0.4, 0], light: "world", maxParticles: 24
                }
            ]
        },
        linger: {
            exit: { drain: 30 },
            emitters: [
                {
                    name: "linger_wisp", bind: "target", height: 1.1,
                    particle: "world_combat_core:cobblemon/generic/smoke/obscuringsmoke",
                    rate: 3, shape: { kind: "circle", radius: 0.26 },
                    direction: "up", speed: [0.01, 0.03],
                    lifetime: [16, 26], size: [0.15, 0.03],
                    color: 0x5B2A86, alpha: [0.25, 0], alphaMode: "sin", light: "world", maxParticles: 14
                },
                {
                    name: "linger_fret", bind: "target", height: 0.9,
                    particle: "world_combat_core:cobblemon/generic/sparkle/smallsparkle",
                    rate: 4, shape: { kind: "sphere", radius: 0.18 },
                    direction: "up", speed: [0.01, 0.04],
                    lifetime: [12, 20], size: [0.07, 0.01],
                    color: 0xE8E4F0, alpha: [0.4, 0], light: "world", maxParticles: 16
                }
            ]
        }
    }
};

WorldCombatParticles.scene("world_combat:move_scaryface", 1, ScaryfaceDefinition);

/**
 * 鬼面本体：一张短面形，带两只眼与一张嘴，出现在施法者真实身前。
 * 服务端用 `WorldGeometry.basis` 从真实朝向算出 face 平面（center／right／up），这里只用 line 画轮廓与眼口，
 * 不生成粒子、不新增实体；`drop`（实际降低的级数）决定眼睛与嘴的亮度，越大越狰狞。
 */
function scaryfaceVector(value: any, fallback: number[]): number[] {
    if (Array.isArray(value) && value.length === 3 && (value as any[]).every(function (n) { return typeof n === "number" && isFinite(n); }))
        return [Number(value[0]), Number(value[1]), Number(value[2])];
    return fallback;
}

function scaryfaceNumber(value: any, fallback: number): number {
    return typeof value === "number" && isFinite(value) ? value : fallback;
}

WorldCombatClient.scene("world_combat:move_scaryface_face", 1, function (frame: CombatClientFrame) {
    const entry: CombatSceneEntry = JSON.parse(frame.data());
    if (entry.lifecycle || (entry.data && (entry.data as any).lifecycle)) return;
    const data: any = entry.data || {};
    const centre = scaryfaceVector(data.center, entry.position);
    const right = scaryfaceVector(data.right, [1, 0, 0]);
    const up = scaryfaceVector(data.up, [0, 1, 0]);
    const width = Math.max(0.08, scaryfaceNumber(data.width, 0.34));
    const height = Math.max(0.12, scaryfaceNumber(data.height, 0.5));
    const drop = Math.max(0, Math.min(3, scaryfaceNumber(data.drop, 0)));
    function at(lr: number, lu: number): number[] {
        return [centre[0] + right[0] * lr + up[0] * lu,
            centre[1] + right[1] * lr + up[1] * lu,
            centre[2] + right[2] * lr + up[2] * lu];
    }
    const dim = Math.round(120 + drop * 26);
    const bright = Math.round(150 + drop * 30);
    const edge = ((220 << 24) | 0x8A4FD0) | 0;
    const eye = (((bright) << 24) | 0xE8E4F0) | 0;
    // 面形轮廓：上尖下收的一张短脸。
    const top = at(0, height), jaw = at(0, -height), left = at(-width, height * 0.15), rightP = at(width, height * 0.15);
    frame.line(left[0], left[1], left[2], top[0], top[1], top[2], edge);
    frame.line(top[0], top[1], top[2], rightP[0], rightP[1], rightP[2], edge);
    frame.line(rightP[0], rightP[1], rightP[2], jaw[0], jaw[1], jaw[2], edge);
    frame.line(jaw[0], jaw[1], jaw[2], left[0], left[1], left[2], edge);
    // 两只眼：短横线；嘴：一道下压的弧口。
    const eyeU = height * 0.34, eyeX = width * 0.42;
    const eyeL0 = at(-eyeX - 0.03, eyeU), eyeL1 = at(-eyeX + 0.03, eyeU);
    const eyeR0 = at(eyeX - 0.03, eyeU), eyeR1 = at(eyeX + 0.03, eyeU);
    frame.line(eyeL0[0], eyeL0[1], eyeL0[2], eyeL1[0], eyeL1[1], eyeL1[2], eye);
    frame.line(eyeR0[0], eyeR0[1], eyeR0[2], eyeR1[0], eyeR1[1], eyeR1[2], eye);
    const mouthL = at(-eyeX, -height * 0.28), mouthM = at(0, -height * 0.42), mouthR = at(eyeX, -height * 0.28);
    frame.line(mouthL[0], mouthL[1], mouthL[2], mouthM[0], mouthM[1], mouthM[2], ((dim << 24) | 0xE8E4F0) | 0);
    frame.line(mouthM[0], mouthM[1], mouthM[2], mouthR[0], mouthR[1], mouthR[2], ((dim << 24) | 0xE8E4F0) | 0);
});
