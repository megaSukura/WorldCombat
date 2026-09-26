/**
 * 琉光冲激 / luminacrash —— 注册与动作。
 *
 * 核心念头：**在目标头顶引下一道会拐弯的怪光柱，让它砸进对方的脑子里**——光柱先在半空聚起，
 * 坠落时跟着目标走（只在 `leash` 以内），最后一小段时间冻结锚点、给对手留一个躲开的窗口；砸中时在最终锚点
 * 炸开一圈。被砸的人特防狠狠掉两级，圈里被卷进的人各挨一记溅射。它是四式里唯一从天而降、唯一单点重击带小范围溅射的那个。
 *
 * 三幕（提交前只播预告）：
 *   起（windup）：施法者头顶聚起怪光（`action.present` 预告，不碰世界）。
 *   落（charge → lock）：提交后在目标头顶 `pillarHeight` 处点起光柱；坠落前段每刻把真实锚点更新到目标当前位置
 *       （目标跑出 `leash` 就不再追），画面从同一高度画出光柱；最后 `lockTicks` 冻结锚点，锚环由虚变实。
 *   砸（impact → hit / splash / dazzle）：在最终锚点一次结算——锚点附近的目标吃 `core` 并无条件 `NativeEffects.boost(..., "spd", -2)`，
 *       `burstRadius` 内其他人结算 `splash`；目标身上残留一段怪光残影。
 *
 * 选取 `kind: "aim"`：可点实体跟踪（坠落前段更新锚点），也可只点世界点（从开始就固定）；空点照样落柱，
 * `target` 为 null 时不要求存在敌人，命中权限仍由命中层结算。
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
        description: "在目标（或选中的点）头顶引下一道怪光柱：坠落前段沿目标方向更新锚点，最后短暂冻结锚点、给对手留出躲开的窗口；砸中造成特殊伤害并狠狠削掉 2 级特防，最终锚点周围的光圈卷到的人各挨一记溅射；命中后目标身上残留怪光残影。目标在冻结前跑出追踪距离就不再追，落柱可能砸空。弥散式砸一群、单发略轻，聚焦式一道细光柱、单点更重。",
        uses: ["单点狠狠削掉 2 级特防，给特攻手开路", "从远处引光砸一个点名目标", "用弥散式在落点连周围一起砸"],
        kind: "aim",
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
            const lock = Math.max(2, Math.min(fall - 1, Math.round(p("luminacrash", "lockTicks", action))));
            const leash = Math.max(3, p("luminacrash", "leash", action));
            const dazzle = Math.max(24, Math.round(p("luminacrash", "dazzleTicks", action)));
            const rays = Math.max(8, Math.round(p("luminacrash", "rays", action)));
            const stages = Math.max(1, Math.round(p("luminacrash", "sunderStages", action)));
            const scale = Math.max(0.6, Math.min(2.4, burstRadius / 2.0));
            const intensity = Math.max(0.5, Math.min(2.4, power / 68));
            const scenes = WorldFeedback.actionScenes(luminacrashScene);
            // 可跟踪的实体：坠落前段更新真实锚点；点选则从开始就固定。
            const tracking = target !== null && world.valid(target) && !world.friendly(target);
            const tracked = tracking ? world.observe(target!) : null;
            const baseAnchor = tracked !== null ? tracked.position() : action.targetPosition();
            let anchor = baseAnchor;
            let elapsed = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; scenes.finish(current, done); } }

            function strike(current: CombatAction): void {
                const scope = current.world();
                let point = anchor, primary: CombatActor | null = null, landed = false;
                if (tracking && scope.valid(target!)) {
                    const at = scope.observe(target!);
                    if (at !== null) {
                        primary = target;
                        if (at.position().minus(anchor).length() <= Math.max(burstRadius, 1.0)) point = at.position();
                        else primary = null; // 冻结前没追上：不自动追到出范围者，只在最终锚点炸开。
                    }
                }
                if (primary !== null) {
                    const held = scope.observe(primary);
                    if (held !== null && held.position().minus(point).length() <= Math.max(burstRadius, 1.0)
                        && hurt(current, primary, "luminacrash", power, { damage: damageSpec("luminacrash", "core") })) {
                        NativeEffects.boost(scope, primary, "spd", -stages);
                        landed = true;
                        WorldFeedback.emit(scope, luminacrashScene, 1, held.position(),
                            { moment: "hit", target: String(primary.ref()), rays: rays, scale: scale, intensity: intensity }, 26);
                        WorldFeedback.text(scope, held.position().plus(WorldCombat.point(0, 1.3, 0)), luminacrashSunderText, [stages], 30);
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
                    const held = scope.observe(primary);
                    if (held !== null) WorldFeedback.keep(scope, "luminacrash:dazzle:" + String(current.id()), luminacrashScene, 1,
                        held.position(), { moment: "dazzle", target: String(primary.ref()), rays: rays, scale: scale,
                            intensity: Math.max(0.4, Math.min(1.6, dazzle / 60)) }, dazzle);
                } else {
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), luminacrashMissText, [], 24);
                }
                sound(current, "cobblemon:impact.psychic");
                finish(current);
            }

            function step(current: CombatAction): void {
                const scope = current.world();
                if (elapsed < fall - lock) {
                    // 坠落前段：跟住真实目标（超出 leash 就不再追），锚环仍是虚的。
                    if (tracking && scope.valid(target!)) {
                        const at = scope.observe(target!);
                        if (at !== null && at.position().minus(baseAnchor).length() <= leash) anchor = at.position();
                    }
                    scenes.show(action, "charge", anchor.plus(WorldCombat.point(0, height, 0)),
                        { moment: "charge", height: height, radius: radius, burst: burstRadius, rays: rays, scale: scale,
                            intensity: intensity });
                    scenes.show(action, "mark", anchor,
                        { moment: "mark", height: height, radius: radius, burst: burstRadius, rays: rays, scale: scale,
                            intensity: intensity });
                } else {
                    // 最后一段冻结锚点：锚环由虚变实，给对手一个躲开的窗口。
                    scenes.stop(action, "mark");
                    scenes.show(action, "lock", anchor,
                        { moment: "lock", height: height, radius: radius, burst: burstRadius, rays: rays, scale: scale,
                            intensity: intensity });
                    scenes.show(action, "fall", anchor.plus(WorldCombat.point(0, height, 0)),
                        { moment: "fall", height: height, radius: radius, burst: burstRadius, rays: rays, scale: scale,
                            intensity: intensity });
                }
                elapsed++;
                if (elapsed >= fall) { strike(current); return; }
                current.after(1, step);
            }

            if (!tracking) {
                // 空点／纯点选：从开始就固定在选中点，不跟踪平移。
                anchor = action.targetPosition();
            }
            sound(action, "minecraft:block.beacon.activate");
            step(action);
        }
    });
}
