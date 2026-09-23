/**
 * 冰锥 / iciclespear 的出手方式。本族「2～5 连发硬物」的冰型。
 *
 * 核心念头：**碎冰齐射**——呼出一排冰晶，一根接一根笔直射向目标；每根命中留一次伤害，并碎在目标身上散出冰屑；
 *   落点脚下的地面结霜。它是本族里命中 100、PP 最多的一梭，也是唯一在地面留下痕迹的冰。
 *
 * 三幕（提交前只播预告）：
 *   起（gather）：寒气收敛、身侧凝出一排冰锥，只播预告。
 *   射（volley → shatter）：提交后每 `gap` 刻射出一根直飞冰锥（带微小 `spread`，几乎不散）；
 *       冰锥是可见的冰晶投递（原生实体外观）。
 *   碎（shatter / frost）：命中结算一次 `spear` 物理伤害，散出 `shards` 片冰屑，并按 `chill` 时长施加
 *       `world_combat:iciclespear_chill`（霜附式振幅 +1 → 减速等级高一档）；落点按 `frost` 半径结霜。
 *       没打中的冰锥只在地面结霜。
 *
 * 与同族分开：岩石爆击走弧线落碎石、飞弹针追踪钉身、尖刺加农炮直线穿排；只有冰锥直飞几乎不散，
 *   碎在目标身上并冻住脚下的地面。
 *
 * 配置 `rime`（霜附式）由公式改霜寒振幅／时长、锥数、威力与时序；提交后才触碰世界。
 */
namespace PokemonSkills {
    /** 在落点地面结一层霜（用雪块替换那层地表）；实体占着的格子由宿主等它走开再合上。 */
    function icicleSpearFrost(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): void {
        const cells: any[] = [], r = Math.ceil(radius);
        const px = point.x(), py = point.y(), pz = point.z();
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            if (Math.sqrt(dx * dx + dz * dz) > radius) continue;
            const x = Math.floor(px) + dx, z = Math.floor(pz) + dz;
            for (let dy = 0; dy >= -3; dy--) {
                const y = Math.floor(py) + dy;
                const found = world.block(WorldCombat.point(x, y, z));
                if (found === null) break;
                const id = String(found.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                if (id === "minecraft:snow_block") break;
                cells.push({ x: x, y: y, z: z, block: "minecraft:snow_block" });
                break;
            }
        }
        if (!cells.length) return;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return; }
    }

    define({
        id: "iciclespear",
        cooldownParameter: "recharge",
        name: "Icicle Spear",
        description: "呼出一排冰晶，一根接一根笔直射向目标：每根命中留一次伤害，碎在目标身上散出冰屑，并把落点冻出一小片霜。几乎不偏、命中可靠；霜附式减速更狠、留霜更大。",
        uses: ["远距离最可靠的一梭直飞冰锥", "用霜寒减速目标，同时冻住脚下地面", "纯碎式堆单锥伤害"],
        kind: "enemy",
        range: 8,
        maxRange: 13,
        prepare: 8,
        active: 0,
        recover: 6,
        cooldown: 24,
        maximumTicks: 240,
        style: "ice",
        defaults: { rime: false, ai: { maxChase: 11, finish: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("iciclespear", "reach", pokemon), geometry: "line", style: "ice", color: 0x9FD8E8,
                label: config && config.rime === true ? "霜附冰锥" : "纯碎冰锥" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["iciclespear"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("iciclespear", "tempo", context)),
                recover: Math.round(p("iciclespear", "aftercast", context)),
                cooldown: Math.round(p("iciclespear", "recharge", context)),
                active: 0,
                range: p("iciclespear", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const shots = Math.max(2, Math.min(5, Math.round(p("iciclespear", "shots", action))));
            action.present("iciclespear:gather", icicleSpearScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", shots: shots, rime: config && config.rime === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            if (target === null || !world.valid(target)) { done(action); return; }
            const targetRef = String(target.ref());
            const power = p("iciclespear", "spear", action);
            const shots = Math.max(2, Math.min(5, Math.round(p("iciclespear", "shots", action))));
            const gap = Math.max(2, Math.round(p("iciclespear", "gap", action)));
            const speed = Math.max(0.8, p("iciclespear", "velocity", action));
            const radius = Math.max(0.1, p("iciclespear", "radius", action));
            const spread = Math.max(0.5, p("iciclespear", "spread", action));
            const chillTicks = Math.max(40, Math.round(p("iciclespear", "chill", action)));
            const frostRadius = Math.max(0.6, p("iciclespear", "frost", action));
            const shards = Math.max(6, Math.round(p("iciclespear", "shards", action)));
            const rime = !!(config && config.rime);
            const amplitude = rime ? 1 : 0;
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.16));
            const intensity = Math.max(0.5, Math.min(2.0, power / 25));
            let shot = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function volley(current: CombatAction): void {
                if (shot >= shots) { finish(current); return; }
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null) { finish(current); return; }
                const origin = current.origin(), centre = body.position();
                let heading = centre.minus(origin);
                if (heading.length() < 0.05) heading = current.direction();
                heading = heading.unit();
                const angle = (scope.random() * 2 - 1) * spread * Math.PI / 180;
                const cos = Math.cos(angle), sin = Math.sin(angle);
                const direction = WorldCombat.point(heading.x() * cos - heading.z() * sin, heading.y(), heading.x() * sin + heading.z() * cos);
                const distance = centre.minus(origin).length();
                const index = shot + 1;
                shot = index;
                sound(current, "cobblemon:move.iceshard.actor_1");
                WorldFeedback.emit(scope, icicleSpearScene, 1, origin,
                    { moment: "volley", shot: index, shots: shots, shards: shards, scale: scale, intensity: intensity, rime: rime ? 1 : 0 }, 16);
                LivingActions.projectile(current, {
                    speed: speed, range: distance + 4, radius: radius, direction: direction,
                    lifetime: Math.max(24, Math.round(distance / Math.max(0.4, speed)) + 24),
                    appearance: { sprite: "cobblemon:particle/generic/ice/iceshard", tint: 0xBFE8F5, glow: true, scale: Math.max(0.8, Math.min(1.6, radius / 0.16)) },
                    impact: function (inner: CombatAction, hit: CombatImpact): void {
                        const scope2 = inner.world();
                        const at = hit.position();
                        const struck = hit.target();
                        const enemy = struck !== null && scope2.valid(struck) && !scope2.friendly(struck);
                        if (enemy) {
                            if (!impact(inner, hit, "iciclespear", power, { damage: damageSpec("iciclespear", "spear") })) return;
                            CombatStatus.apply(scope2, struck!, "chill", icicleSpearChill, chillTicks, amplitude);
                            WorldFeedback.emit(scope2, icicleSpearScene, 1, at,
                                { moment: "shatter", target: String(struck!.ref()), shot: index, shots: shots, shards: shards,
                                    scale: scale, intensity: intensity, rime: rime ? 1 : 0, duration: chillTicks }, 20);
                            sound(inner, "cobblemon:impact.ice");
                            sound(inner, "minecraft:block.glass.break");
                        }
                        icicleSpearFrost(scope2, at, frostRadius, chillTicks);
                        WorldFeedback.emit(scope2, icicleSpearScene, 1, at,
                            { moment: "frost", shot: index, shots: shots, shards: Math.round(shards * 0.6), scale: Math.max(0.5, frostRadius), intensity: Math.max(0.4, intensity * 0.7) }, 18);
                    }
                }, function (inner: CombatAction) {
                    inner.after(gap, function (next: CombatAction) { volley(next); });
                });
            }

            sound(action, "cobblemon:move.iceshard.actor_2");
            WorldFeedback.emit(world, icicleSpearScene, 1, action.origin(),
                { moment: "gather", shots: shots, shards: shards, scale: scale, intensity: intensity, rime: rime ? 1 : 0 }, 14);
            volley(action);
        }
    });
}
