/**
 * 飞叶快刀 / razorleaf —— 注册与动作。
 *
 * 核心念头：一口气把一列锋利的叶顺着瞄准方向连甩出去——叶一片接一片地削过同一条窄带，站在这条带子里的
 *   对手被一波接一波地削。它有两幕：甩出、连发。
 *
 * 幕：
 *   起（windup，提交前）：叶在身侧排成一列、边缘亮起，只播预告，可被打断。
 *   发（execute → wave × N → hit/miss）：提交后叶片沿瞄准方向一波一波飞出，每波扫过同一段窄带
 *       （WorldGeometry.lane，判定与表现共用这组范围），带里的每个非友方各吃一次 `leaf` 物理伤害；
 *       每波之间有 `gap` 刻的间隔，`waves` 波走完收势。没人被削到只留一阵空叶风。
 *
 * 高暴击沿用原生 critRatio 2 的共享结算；暴击命中时由本单元监听器在命中点补一记更亮的叶光强调。
 */
namespace PokemonSkills {
    define({
        id: razorleafId,
        cooldownParameter: "recharge",
        name: "Razor Leaf",
        description: "Sharp-edged leaves are launched to slash at opposing Pokémon. This move has a heightened chance of landing a critical hit.",
        uses: ["沿同一条窄带连发一波波叶刃", "削穿排成一列的对手", "站桩的敌人被一拍接一拍反复削"],
        kind: "enemy",
        range: 9,
        maxRange: 14,
        prepare: 6,
        active: 0,
        recover: 5,
        cooldown: 20,
        style: "leaf",
        defaults: { broad: false, ai: { maxChase: 12, line: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(razorleafId, "reach", pokemon), geometry: "line", style: "leaf", color: 0x7CC24E,
                label: config && config.broad === true ? "撒叶飞叶快刀" : "飞叶快刀" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[razorleafId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(razorleafId, "tempo", context)),
                recover: Math.round(p(razorleafId, "aftercast", context)),
                cooldown: Math.round(p(razorleafId, "recharge", context)),
                active: 0,
                range: p(razorleafId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("razorleaf:gather", razorleafScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", broad: config && config.broad === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const power = p(razorleafId, "leaf", action);
            const reach = p(razorleafId, "reach", action);
            const spread = p(razorleafId, "spread", action);
            const leafRadius = p(razorleafId, "leafRadius", action);
            const leaves = Math.max(6, Math.round(p(razorleafId, "leaves", action)));
            const waves = Math.max(1, Math.round(p(razorleafId, "waves", action)));
            const gap = Math.max(1, Math.round(p(razorleafId, "gap", action)));
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const scale = Math.max(0.6, Math.min(2.0, reach / razorleafReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 16));
            const heading = [direction.x(), direction.y(), direction.z()];
            const lane = WorldGeometry.lane(origin, direction, reach, spread, { below: 1.4, above: 2.6 });
            let index = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (hits === 0) {
                    WorldFeedback.emit(scope, razorleafScene, 1, origin, { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), razorleafMissText, [], 20);
                } else {
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(direction.x(), 0, direction.z()).unit().scale(reach * 0.5))
                        .plus(WorldCombat.point(0, 0.95, 0)), razorleafHitText, [hits], 22);
                }
                done(current);
            }

            function wave(current: CombatAction): void {
                if (settled) return;
                if (index >= waves) { finish(current); return; }
                index++;
                const scope = current.world();
                WorldFeedback.emit(scope, razorleafScene, 1, origin,
                    { moment: "sweep", direction: heading, reach: reach, spread: spread, leaves: leaves,
                        wave: index, waves: waves, scale: scale, intensity: intensity }, gap + 16);
                WorldGeometry.selectEnemies(scope, lane, function (target, facts) {
                    if (!hurt(current, target, razorleafId, power,
                        { damage: damageSpec(razorleafId, "leaf"), slice: true })) return;
                    hits++;
                    WorldFeedback.emit(scope, razorleafScene, 1, facts.position(),
                        { moment: "cut", target: String(target.ref()), leaves: leaves, leafRadius: leafRadius,
                            wave: index, scale: scale, intensity: intensity }, 18);
                });
                sound(current, index % 2 === 0 ? "cobblemon:move.razorleaf.actor_1" : "cobblemon:move.razorleaf.actor_2");
                if (index >= waves) { finish(current); return; }
                current.after(gap, wave);
            }

            sound(action, "cobblemon:move.razorleaf.actor_1");
            wave(action);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的叶光与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_razorleaf/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== razorleafId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 6;
        WorldFeedback.emit(world, razorleafScene, 1, at,
            { moment: "crit", target: String(target.ref()), leaves: Math.max(8, Math.min(30, Math.round(ratio * 4))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 20);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.15, 0)), razorleafCritText, [], 24);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
