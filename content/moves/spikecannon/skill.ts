/**
 * 尖刺加农炮 / spikecannon 的出手方式。本族「2～5 连发硬物」的普通型。
 *
 * 核心念头：**架炮直贯**——稳住架势，把一排重型金属钉沿一条固定的准线一发接一发打出去；每发穿透一线上的目标，
 *   并把命中的对象顶退。它是本族最慢、最重、射程最长的一梭，也是唯一会把人推开的。
 *
 * 三幕（提交前只播预告）：
 *   起（brace）：扎稳下盘、炮口收拢聚力，只播预告。
 *   射（volley → pierce）：提交后每 `gap` 刻打出一发直飞重钉；首发时按当刻瞄准把炮身方向固定下来，
 *       之后每发都沿同一条线贯穿（不再追人）。带 `pierce`，贯穿一线的目标。
 *   贯（pierce / spark / fade）：每穿透一个非友方各结算一次 `spike` 物理伤害，并沿炮口方向把对象顶退 `knock` 格；
 *       崩出 `shards` 片金属屑。撞块在原生方块格与表面溅火星；空飞耗尽只淡出。
 *
 * 与同族分开：岩石爆击走弧线、飞弹针追踪钉身、冰锥齐排平行；只有尖刺加农炮是固定阵地、无追踪、无残留的直线贯穿与顶退。
 *
 * 选取 `kind: "aim"`：自由方向、可射空；实体只用来定首发方向，墙由原生投射物真实截断。
 *   收到移动／输入中断时，尚未发出的钉直接取消，已付的 PP 不退回（提交时已结算）。
 *
 * 配置 `lance`（穿甲式）由公式改威力／钉数／穿透／顶退与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    const spikecannonScene = "world_combat:move_spikecannon";

    /** 把方向绕世界 Y 轴偏一个角度，作为炮口的首发偏角。 */
    function spikecannonScatter(direction: CombatPoint, angle: number): CombatPoint {
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return WorldCombat.point(direction.x() * cos - direction.z() * sin, direction.y(), direction.x() * sin + direction.z() * cos);
    }

    define({
        id: "spikecannon",
        cooldownParameter: "recharge",
        name: "Spike Cannon",
        description: "扎稳下盘，把一排重型金属钉沿一条固定的准线一发接一发打出去：首发定下炮身方向，之后每发都沿同一条线贯穿一线的敌人、各结算一次伤害，并把命中的对象顶退。最慢最重、射程最长；可射空，墙会截断。穿甲式少而狠、能贯穿三人。",
        uses: ["远距离一梭直线重钉", "贯穿一线上的多个敌人", "把贴脸的目标顶退、拉开距离"],
        kind: "aim",
        range: 8,
        maxRange: 15,
        prepare: 11,
        active: 0,
        recover: 9,
        cooldown: 32,
        maximumTicks: 280,
        style: "cannon",
        defaults: { lance: false, ai: { maxChase: 14, pushMelee: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("spikecannon", "reach", pokemon), geometry: "line", style: "cannon", color: 0xB8BEC9,
                label: config && config.lance === true ? "穿甲加农" : "连发加农" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spikecannon"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("spikecannon", "tempo", context)),
                recover: Math.round(p("spikecannon", "aftercast", context)),
                cooldown: Math.round(p("spikecannon", "recharge", context)),
                active: 0,
                range: p("spikecannon", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const shots = Math.max(2, Math.min(5, Math.round(p("spikecannon", "shots", action))));
            const facing = aim(action);
            action.present("spikecannon:brace", spikecannonScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", shots: shots, lance: config && config.lance === true ? 1 : 0,
                    direction: [facing.x(), facing.y(), facing.z()] }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p("spikecannon", "spike", action);
            const shots = Math.max(2, Math.min(5, Math.round(p("spikecannon", "shots", action))));
            const gap = Math.max(3, Math.round(p("spikecannon", "gap", action)));
            const speed = Math.max(0.8, p("spikecannon", "velocity", action));
            const radius = Math.max(0.12, p("spikecannon", "radius", action));
            const reach = p("spikecannon", "reach", action);
            const spread = Math.max(0.3, p("spikecannon", "spread", action));
            const pierce = Math.max(1, Math.min(3, Math.round(p("spikecannon", "pierce", action))));
            const knock = Math.max(0.2, p("spikecannon", "knock", action));
            const shards = Math.max(6, Math.round(p("spikecannon", "shards", action)));
            const lance = !!(config && config.lance);
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.2));
            const intensity = Math.max(0.5, Math.min(2.0, power / 20));
            // 首发即固定炮身方向：之后每发都沿这条线，不再随目标移动转向。
            const line = spikecannonScatter(aim(action), (world.random() * 2 - 1) * spread * Math.PI / 180);
            const pushDir = WorldCombat.point(line.x(), 0, line.z()).length() < 0.01 ? null : WorldCombat.point(line.x(), 0, line.z()).unit();
            const directionData = [line.x(), line.y(), line.z()];
            const scenes = WorldFeedback.actionScenes(spikecannonScene);
            const lifetime = Math.max(24, Math.round((reach + 3) / Math.max(0.4, speed)) + 24);
            let shot = 0, settled = false, stopped = false;

            function finish(current: CombatAction): void { if (settled) return; settled = true; scenes.finish(current, done); }
            // 移动／输入中断：停止尚未发出的钉；已经支付的 PP 不退回。
            action.on("world_combat:interrupt", function () { stopped = true; });
            action.on("world_combat:input-stop", function () { stopped = true; });

            function volley(current: CombatAction): void {
                if (settled || stopped) return;
                if (shot >= shots) { finish(current); return; }
                const origin = current.origin();
                const index = shot + 1;
                shot = index;
                const key = "spike:" + index;
                let resolved = false;
                sound(current, "minecraft:item.crossbow.shoot");
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: reach + 3, radius: radius, direction: line,
                    lifetime: lifetime,
                    appearance: { sprite: "cobblemon:particle/generic/spike", tint: 0xC9CDD6, glow: true,
                        scale: Math.max(0.9, Math.min(1.8, radius / 0.2)), pierce: pierce },
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        resolved = true;
                        const scope = inner.world();
                        const struck = hit.target();
                        const at = hit.position();
                        if (struck !== null && scope.valid(struck) && !scope.friendly(struck)) {
                            const landed = impact(inner, hit, "spikecannon", power, { damage: damageSpec("spikecannon", "spike") });
                            if (landed) {
                                // 只有真正结算成功才顶退，被拒时不假装推开。
                                if (pushDir !== null && scope.valid(struck)) scope.hitDisplace(struck, pushDir.scale(knock));
                                WorldFeedback.emit(scope, spikecannonScene, 1, at,
                                    { moment: "pierce", target: String(struck.ref()), shot: index, shots: shots, shards: shards,
                                        scale: scale, intensity: intensity, pierce: pierce, knock: knock, lance: lance ? 1 : 0,
                                        direction: directionData }, 20);
                                sound(inner, "cobblemon:impact.normal");
                                sound(inner, "minecraft:block.metal.hit");
                            } else {
                                WorldFeedback.emit(scope, spikecannonScene, 1, at,
                                    { moment: "spark", target: String(struck.ref()), shot: index, shots: shots, shards: Math.round(shards * 0.5),
                                        scale: scale, intensity: Math.max(0.4, intensity * 0.7), direction: directionData }, 16);
                            }
                            return;
                        }
                        const cell = hit.blockPosition();
                        WorldFeedback.emit(scope, spikecannonScene, 1, cell === null ? at : cell,
                            { moment: "spark", shot: index, shots: shots, shards: Math.round(shards * 0.5), scale: scale,
                                intensity: Math.max(0.4, intensity * 0.7), face: hit.blockFace(), blocked: hit.blocked() ? 1 : 0,
                                direction: directionData }, 16);
                    }
                }, function (inner: CombatAction) {
                    scenes.stop(inner, key);
                    if (!resolved)
                        WorldFeedback.emit(inner.world(), spikecannonScene, 1, origin.plus(line.scale(reach + 3)),
                            { moment: "fade", shot: index, shots: shots, scale: scale, intensity: Math.max(0.3, intensity * 0.5) }, 14);
                    if (stopped) return;
                    if (shot < shots) inner.after(gap, function (next: CombatAction) { volley(next); });
                    else finish(inner);
                });
                if (!settled) scenes.show(current, key, origin,
                    { moment: "volley", projectile: flight, shot: index, shots: shots, shards: shards, scale: scale,
                        intensity: intensity, pierce: pierce, knock: knock, lance: lance ? 1 : 0, direction: directionData });
            }

            sound(action, "minecraft:block.anvil.place");
            WorldFeedback.emit(world, spikecannonScene, 1, action.origin(),
                { moment: "brace", shots: shots, shards: shards, scale: scale, intensity: intensity, pierce: pierce, knock: knock,
                    lance: lance ? 1 : 0, direction: directionData, span: reach }, 16);
            volley(action);
        }
    });
}
