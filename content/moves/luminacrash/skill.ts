/**
 * 琉光冲激 / luminacrash —— 注册与动作。
 *
 * 核心念头：**在目标头顶引下一道会拐弯的怪光柱，让它砸进对方的脑子里**——光柱先在半空聚起，
 * 坠落时沿着目标的方向追（`leash` 以内），砸中时在脚下炸开一圈；被砸的人特防狠狠掉两级，
 * 圈里被卷进的人各挨一记溅射。它是四式里唯一从天而降、唯一单点重击带小范围溅射的那个。
 *
 * 三幕：
 *   起（windup，提交前）：头顶聚起怪光（`action.present` 预告，不碰世界）。
 *   坠（charge → fall）：提交后在目标头顶 `pillarHeight` 处点起光柱，坠落 `fallTicks`；
 *       画面从同一高度画出整根光柱往下压。
 *   砸（impact → hit / splash / dazzle）：落点取目标当前位置（若还在 `leash` 内），否则取原锚点；
 *       直击结算 `core` 并无条件 `NativeEffects.boost(..., "spd", -2)`，脚下 `burstRadius` 内其他人结算 `splash`；
 *       目标身上残留一段怪光残影（`dazzle`）。
 *
 * 与同族分开：洁净光芒以自身为中心炸开一圈；琉光冲激是从天而降的一道、单点重击带小范围。
 *
 * 配置 `disperse`（弥散式）由 resolve 改时序与射程、由公式改炸落与单发：开启＝砸一群、单发略轻；
 * 关闭（聚焦式）＝一道细光柱、单点更重。
 */
namespace PokemonSkills {
    const luminacrashScene = "world_combat:move_luminacrash";
    const luminacrashSunderText = "world_combat.move.luminacrash.text.sunder";
    const luminacrashMissText = "world_combat.move.luminacrash.text.miss";

    define({
        id: "luminacrash",
        name: "Lumina Crash",
        description: "在目标头顶引下一道怪光柱：光柱坠落时沿目标方向追踪，砸中造成特殊伤害并狠狠削掉 2 级特防，脚下光圈卷到的人各挨一记溅射；命中后目标身上残留怪光残影。目标在坠落期间跑远会砸空。弥散式砸一群、单发略轻，聚焦式一道细光柱、单点更重。",
        uses: ["单点狠狠削掉 2 级特防，给特攻手开路", "从远处引光砸一个点名目标", "用弥散式在落点连周围一起砸"],
        kind: "enemy",
        range: 10,
        maxRange: 15,
        prepare: 10,
        active: 0,
        recover: 8,
        cooldown: 28,
        style: "radiance",
        defaults: { disperse: false, ai: { maxChase: 13, cluster: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("luminacrash", "burstRadius", pokemon), geometry: "area", style: "radiance",
                color: 0xB7A8FF, label: config && config.disperse === true ? "弥散琉光冲激" : "聚焦琉光冲激" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["luminacrash"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const disperse = !!(config && config.disperse);
            return {
                prepare: Math.round(p("luminacrash", "tempo", context)),
                recover: 8,
                cooldown: 28 + (disperse ? 5 : 0),
                active: 0,
                range: p("luminacrash", "castRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:luminacrash:" + action.id(), luminacrashScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", disperse: config && config.disperse ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const power = p("luminacrash", "core", action);
            const splashPower = p("luminacrash", "splash", action);
            const height = p("luminacrash", "pillarHeight", action);
            const radius = p("luminacrash", "pillarRadius", action);
            const burstRadius = p("luminacrash", "burstRadius", action);
            const fall = Math.max(6, Math.round(p("luminacrash", "fallTicks", action)));
            const leash = Math.max(3, p("luminacrash", "leash", action));
            const dazzle = Math.max(24, Math.round(p("luminacrash", "dazzleTicks", action)));
            const rays = Math.max(8, Math.round(p("luminacrash", "rays", action)));
            const stages = Math.max(1, Math.round(p("luminacrash", "sunderStages", action)));
            const scale = Math.max(0.6, Math.min(2.4, burstRadius / 2.0));
            const intensity = Math.max(0.5, Math.min(2.4, power / 68));
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function strike(current: CombatAction, anchor: CombatPoint): void {
                const scope = current.world();
                let point = anchor, primary: CombatActor | null = null, landed = false;
                if (target !== null && scope.valid(target) && !scope.friendly(target)) {
                    const at = scope.observe(target);
                    if (at !== null) {
                        primary = target;
                        if (at.position().minus(anchor).length() <= leash) point = at.position();
                    }
                }
                if (primary !== null) {
                    const body = scope.observe(primary);
                    if (body !== null && body.position().minus(point).length() <= Math.max(burstRadius, 1.0)
                        && hurt(current, primary, "luminacrash", power, { damage: damageSpec("luminacrash", "core") })) {
                        NativeEffects.boost(scope, primary, "spd", -stages);
                        landed = true;
                        WorldFeedback.emit(scope, luminacrashScene, 1, body.position(),
                            { moment: "hit", target: String(primary.ref()), rays: rays, scale: scale, intensity: intensity }, 26);
                        WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), luminacrashSunderText, [stages], 30);
                    }
                }
                let splashed = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, burstRadius, { below: 2, above: 3 }), function (other, facts) {
                    if (primary !== null && String(other.ref()) === String(primary.ref())) return;
                    if (!hurt(current, other, "luminacrash", splashPower, { damage: damageSpec("luminacrash", "splash") })) return;
                    splashed++;
                    WorldFeedback.emit(scope, luminacrashScene, 1, facts.position(),
                        { moment: "splash_hit", target: String(other.ref()), rays: rays, scale: scale,
                            intensity: Math.max(0.4, Math.min(1.8, splashPower / 26)) }, 20);
                });
                WorldFeedback.emit(scope, luminacrashScene, 1, point,
                    { moment: "impact", target: primary === null ? "" : String(primary.ref()), rays: rays,
                        radius: radius, burst: burstRadius, scale: scale, intensity: intensity, splash: splashed }, 28);
                if (landed && primary !== null) {
                    const body = scope.observe(primary);
                    if (body !== null) WorldFeedback.keep(scope, "luminacrash:dazzle:" + String(current.id()), luminacrashScene, 1,
                        body.position(), { moment: "dazzle", target: String(primary.ref()), rays: rays, scale: scale,
                            intensity: Math.max(0.4, Math.min(1.6, dazzle / 60)) }, dazzle);
                } else if (!landed) {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), luminacrashMissText, [], 24);
                }
                sound(current, "cobblemon:impact.psychic");
                finish(current);
            }

            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, luminacrashScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                finish(action); return;
            }
            const body = world.observe(target);
            if (body === null) { finish(action); return; }
            const anchor = body.position();
            const sky = anchor.plus(WorldCombat.point(0, height, 0));

            sound(action, "minecraft:block.beacon.activate");
            WorldFeedback.emit(world, luminacrashScene, 1, sky,
                { moment: "charge", height: height, radius: radius, burst: burstRadius, rays: rays, scale: scale, intensity: intensity }, 22);
            WorldFeedback.keep(world, "luminacrash:fall:" + action.id(), luminacrashScene, 1, sky,
                { moment: "fall", height: height, radius: radius, burst: burstRadius, rays: rays, scale: scale, intensity: intensity }, fall + 8);
            action.after(fall, function (current: CombatAction): void { strike(current, anchor); });
        }
    });
}
