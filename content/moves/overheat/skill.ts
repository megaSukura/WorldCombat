/**
 * 过热 / overheat 的出手方式。
 *
 * 核心念头：**一次排空全身的热量**——把热量逼到身前压成一张扇形热浪推出去，站在扇面里的人一起挨烧，
 *   落点地上留下一片焦痕；热量排空的同时精神力也被抽走，自身特攻掉 2 级（过载式掉 3 级）。
 *
 * 三幕（提交前只播预告）：
 *   起（gather）：喉间与胸口聚起白热的光，热气从甲缝往外冒，只播预告，此时代价未结清。
 *   排（release → wave → blast）：提交后立刻付反作用力（自身特攻 −insightLoss，中与不中都照付），
 *       热浪沿准线推出去；到 `travel` 刻后按扇形结算：主目标吃满额 `heat`、扇内其他敌人各吃 `share`，
 *       每人各掷一次 `burnChance` 点燃；落点地面烧出 `scorch` 半径、`scorchTicks` 时长的焦痕（terrain 租借，linger）。
 *   散（slump / miss）：排空后身上腾起余烟、浮字提示降级；一名也没扫到就是空放。
 *
 * 与同族分开：飞叶风暴是旋转前进并留场的叶刃、流星群是从头顶砸下的陨石群、精神突进是隔空内爆；
 *   过热是唯一身前一张同时罩住几人的扇形热浪，也是唯一在过载式下比原生多掉一级特攻的那记。
 *
 * 配置 `vent`（过载式）由 `resolve` 改时序、由公式改威力与降级，由本文件改判定与表现；提交后才触碰世界。
 */
namespace PokemonSkills {
    const overheatScene = "world_combat:move_overheat";
    const overheatHitText = "world_combat.move.overheat.text.hit";
    const overheatSlumpText = "world_combat.move.overheat.text.slump";
    const overheatMissText = "world_combat.move.overheat.text.miss";

    /** 落点烧出的焦地：铺深板岩与黑石，只换地表，到期原方块回来。 */
    function overheatScorch(world: CombatWorld, centre: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [];
        const r = Math.ceil(radius);
        const cx = Math.floor(centre.x()), cz = Math.floor(centre.z()), cy = Math.floor(centre.y());
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius) continue;
            const x = cx + dx, z = cz + dz;
            for (let dy = 1; dy >= -4; dy--) {
                const y = cy + dy;
                const block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const surface = distance <= radius * 0.5 ? "minecraft:magma_block" : "minecraft:deepslate";
                if (id !== surface) cells.push({ x: x, y: y, z: z, block: surface });
                break;
            }
        }
        if (!cells.length) return 0;
        try { return world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
    }

    define({
        id: "overheat",
        name: "Overheat",
        description: "Dumps all of the user's heat into one searing fan and burns everything in it; the recoil harshly lowers the user's Sp. Atk.",
        uses: ["中近距离用一张扇形热浪同时烧到几个人", "把目标点着并在地上留下焦痕", "过载式用更重的单发与更大的自身消耗换时间"],
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 36,
        maximumTicks: 240,
        style: "inferno",
        defaults: { vent: false, ai: { maxChase: 13, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("overheat", "reach", pokemon) : 8, geometry: "area", style: "inferno",
                color: 0xFF7A2A, label: config && config.vent === true ? "过热·过载式" : "过热·收束式" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["overheat"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("overheat", "tempo", context)),
                recover: Math.round(p("overheat", "aftercast", context)),
                cooldown: Math.round(p("overheat", "recharge", context)),
                active: 0,
                range: p("overheat", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_overheat:gather", overheatScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", vent: config && config.vent === true ? 1 : 0,
                    embers: Math.round(p("overheat", "embers", action)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const power = p("overheat", "heat", action);
            const coneAngle = p("overheat", "cone", action);
            const gust = Math.max(0.3, p("overheat", "gust", action));
            const reach = p("overheat", "reach", action);
            const share = Math.max(0, Math.min(0.8, p("overheat", "share", action)));
            const scorch = p("overheat", "scorch", action);
            const scorchTicks = Math.max(40, Math.round(p("overheat", "scorchTicks", action)));
            const burnChance = Math.max(0.01, Math.min(0.5, p("overheat", "burnChance", action)));
            const embers = Math.max(14, Math.round(p("overheat", "embers", action)));
            const insightLoss = Math.max(0, Math.round(p("overheat", "insightLoss", action)));
            const dir = aim(action);
            const direction = [dir.x(), dir.y(), dir.z()];
            const front = origin.plus(dir.scale(reach));
            const target = action.target();
            const targetRef = target !== null ? String(target.ref()) : "";
            const travel = Math.max(2, Math.round(reach / gust));
            const scale = Math.max(0.6, Math.min(1.9, coneAngle / 44));
            const intensity = Math.max(0.5, Math.min(2.4, power / 120));
            let settled = false;

            // 排空热量：反作用力在提交那一刻付。
            NativeEffects.boost(world, actor, "spa", -insightLoss);
            WorldFeedback.emit(world, overheatScene, 1, origin,
                { moment: "gather", direction: direction, embers: embers, cone: coneAngle, scale: scale, intensity: intensity }, 20);
            sound(action, "cobblemon:move.fireblast.actor");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            action.after(travel, function (current: CombatAction) {
                const scope = current.world();
                const region = WorldGeometry.sector(origin, dir, reach, coneAngle, { below: 3, above: 3.5 });
                let hits = 0, primaryLanded = false, centre = front;
                WorldGeometry.selectEnemies(scope, region, function (enemy, facts) {
                    const isPrimary = targetRef !== "" && String(enemy.ref()) === targetRef;
                    const amount = isPrimary ? power : power * share;
                    if (!hurt(current, enemy, "overheat", amount,
                        { damage: damageSpec("overheat", "heat"), status: "burn", chance: burnChance })) return;
                    hits++;
                    if (isPrimary) { primaryLanded = true; centre = facts.position(); }
                    WorldFeedback.emit(scope, overheatScene, 1, facts.position(),
                        { moment: "blast", target: String(enemy.ref()), primary: isPrimary ? 1 : 0, embers: embers,
                            scale: scale, intensity: isPrimary ? intensity : intensity * 0.8 }, 24);
                });
                const cells = overheatScorch(scope, centre, scorch, scorchTicks);
                WorldFeedback.emit(scope, overheatScene, 1, centre,
                    { moment: "scorch", cells: cells, scorch: scorch, scorchTicks: scorchTicks, scale: scale, intensity: intensity, hits: hits }, 30);
                sound(current, "cobblemon:impact.fire");
                sound(current, "minecraft:entity.blaze.shoot");
                if (hits > 0) WorldFeedback.text(scope, centre.plus(WorldCombat.point(0, 1.2, 0)), overheatHitText, [hits], 24);
                else WorldFeedback.text(scope, front.plus(WorldCombat.point(0, 1.0, 0)), overheatMissText, [], 22);
                const self = scope.observe(actor);
                if (self !== null) {
                    WorldFeedback.emit(scope, overheatScene, 1, self.position(),
                        { moment: "slump", insightLoss: insightLoss, scale: scale, intensity: intensity }, 22);
                    WorldFeedback.text(scope, self.position().plus(WorldCombat.point(0, 1.25, 0)), overheatSlumpText, [insightLoss], 26);
                }
                finish(current);
            });

            WorldFeedback.keep(world, "overheat:wave:" + action.id(), overheatScene, 1, origin,
                { moment: "wave", direction: direction, embers: embers, cone: coneAngle / 2, reach: reach, intensity: intensity }, travel + 18);
        }
    });
}
