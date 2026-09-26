/**
 * 飞叶快刀 / razorleaf —— 注册与动作。
 *
 * 核心念头：一口气把一列锋利的叶顺着瞄准方向连甩出去——每一波是一道短寿命的叶幕，从身前沿同一条窄带
 *   真实地向前推进，叶幕经过谁、谁才被削；站桩排成一列的对手会被一波接一波地削，横移的人能在后波到来前
 *   走出窄带躲开。它有两幕：甩出、连发推进。
 *
 * 幕：
 *   起（windup，提交前）：叶在身侧排成一列、边缘亮起，只播预告，可被打断。
 *   发（execute → wave × N → hit/miss）：提交时锁定方向；每隔 `gap` 刻甩出新一波叶幕。每波每刻按 `pace`
 *       沿窄带推进一段，对刚扫过的这一小段（判定与表现共用同一段位移）里的每个非友方各结算一次 `leaf`
 *       物理伤害，每个目标每波只吃一次；撞到方块则这一波后段被截断。所有波走完收势。没人被削到只留一阵空叶风。
 *
 * 选取：`kind: "aim"`——方向或世界点都能瞄，提交后方向不再追随；空放也成立，命中权限仍由命中层判断。
 *
 * 高暴击沿用原生 critRatio 2 的共享结算；暴击命中时由本单元监听器在命中点补一记更亮的叶光强调。
 */
namespace PokemonSkills {
    define({
        id: razorleafId,
        cooldownParameter: "recharge",
        name: "Razor Leaf",
        description: "朝选定方向沿同一条窄带一波波甩出锋利的叶，每道叶幕真实向前推进、削穿排成一列的对手；横移的人能在后波到来前走出窄带躲开。起手极短、连发多拍，容易击中要害。撒叶式铺得更宽、每波更重但少一波，连叶式连发更多但叶幕更窄。",
        uses: ["沿同一条窄带连发一波波叶刃", "削穿排成一列的对手", "站桩的敌人被一拍接一拍反复削"],
        kind: "aim",
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
            const pace = Math.max(0.2, p(razorleafId, "pace", action));
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const heading = WorldGeometry.flatUnit(direction, WorldCombat.point(0, 0, 1));
            const scale = Math.max(0.6, Math.min(2.0, reach / razorleafReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 16));
            const directionList = [heading.x(), 0, heading.z()];
            const scenes = WorldFeedback.actionScenes(razorleafScene);
            interface Front { key: string; wave: number; point: CombatPoint; travelled: number; seen: { [ref: string]: boolean }; }
            const fronts: Front[] = [];
            let launched = 0, active = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                if (hits === 0) {
                    WorldFeedback.emit(scope, razorleafScene, 1, origin, { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, origin.plus(WorldCombat.point(0, 1.0, 0)), razorleafMissText, [], 20);
                } else {
                    WorldFeedback.text(scope, origin.plus(heading.scale(reach * 0.5)).plus(WorldCombat.point(0, 0.95, 0)),
                        razorleafHitText, [hits], 22);
                }
                scenes.finish(current, done);
            }

            function launch(current: CombatAction): void {
                fronts.push({ key: "front" + launched, wave: launched + 1, point: origin, travelled: 0, seen: {} });
                active++;
                sound(current, launched % 2 === 0 ? "cobblemon:move.razorleaf.actor_1" : "cobblemon:move.razorleaf.actor_2");
                launched++;
            }

            function step(current: CombatAction, elapsed: number): void {
                if (settled) return;
                const scope = current.world();
                if (launched < waves && elapsed >= launched * gap) launch(current);
                for (let index = 0; index < fronts.length; index++) {
                    const front = fronts[index];
                    const remaining = reach - front.travelled;
                    if (remaining <= 0.01) { scenes.stop(current, front.key); active--; fronts.splice(index, 1); index--; continue; }
                    const from = front.point;
                    const desired = from.plus(heading.scale(Math.min(pace, remaining)));
                    const clip = scope.clipBlocks(from, desired);
                    const wall = clip !== null && clip.blocked();
                    const end = wall && clip !== null ? clip.position() : desired;
                    const span = end.minus(from).length();
                    if (span > 0.01) {
                        const region = WorldGeometry.bodyLane(from, heading, span, spread, { below: 1.4, above: 2.6 });
                        WorldGeometry.selectBodies(scope, region, function (target, facts) {
                            const ref = String(target.ref());
                            if (scope.friendly(target) || front.seen[ref]) return;
                            front.seen[ref] = true;
                            if (!hurt(current, target, razorleafId, power,
                                { damage: damageSpec(razorleafId, "leaf"), slice: true })) return;
                            hits++;
                            WorldFeedback.emit(scope, razorleafScene, 1, facts.position(),
                                { moment: "cut", target: ref, leaves: leaves, leafRadius: leafRadius,
                                    wave: front.wave, scale: scale, intensity: intensity }, 18);
                        });
                    }
                    front.point = end;
                    front.travelled += span;
                    if (wall || front.travelled >= reach - 0.01) {
                        scenes.stop(current, front.key);
                        active--;
                        fronts.splice(index, 1);
                        index--;
                        continue;
                    }
                    scenes.show(current, front.key, front.point, {
                        moment: "sweep", path: [[from.x(), from.y(), from.z()], [end.x(), end.y(), end.z()]],
                        direction: directionList, leaves: leaves, leafRadius: leafRadius, spread: spread,
                        wave: front.wave, waves: waves, scale: scale, intensity: intensity
                    });
                }
                if (launched >= waves && active <= 0) { finish(current); return; }
                current.after(1, function (next: CombatAction) { step(next, elapsed + 1); });
            }

            step(action, 0);
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
