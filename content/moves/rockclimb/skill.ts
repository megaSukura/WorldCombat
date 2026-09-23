/**
 * 攀岩 / rockclimb —— 注册与动作。
 *
 * 核心念头：一次**带高度的蹬地扑跃**。低头蹬地攀上、整个身体越过地面砸向目标；命中又重又可能把人撞得
 * 晕头转向，落点还蹬翻一小片土。它的身份是重量与冲程——单发本族最重，但 85 的命中会真的扑偏。
 *
 * 两幕（扑跃里逐刻推进）：
 *   起（windup，提交前）：低头、收腿蹬地，只播预告。
 *   扑（leap → slam，提交后）：沿被命中偏角修正过的方向划一条抛物线扑过去；落地时对落点一圈内的非友方
 *       各结算一次 ram 接触伤害（最多 maxTargets 人），按 confuseChance 掷混乱（本单元自己的共享身份载体
 *       world_combat:status/confusion），并把落点地表蹬出一小片土痕。
 *
 * 混乱行为（本单元自己的变体）：目标每次想出手都可能被打散；被打散时它踉跄半步——朝随机方向被撞开一点、
 * 并被短暂减速。这是攀岩区别于幻象光线（续时长）、信号光束（挨打反冲）的地方。
 */
namespace PokemonSkills {
    /** 踉跄：被打散时朝随机方向撞开的最大格数，以及短暂减速时长（刻）。 */
    const rockclimbStumble = 0.7;
    const rockclimbStumbleTicks = 30;

    /** 只有当代表载体就是本单元的 id 时，本单元的门禁才接管。 */
    function rockclimbCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === rockclimbEffect ? effect : null;
    }

    /** 把混乱挂到目标身上：借共享身份 confusion，振幅存失手概率百分数，独一无二地替换同类载体。 */
    function rockclimbDaze(world: CombatWorld, victim: CombatActor, at: CombatPoint, ticks: number, fumblePct: number): boolean {
        if (!CombatStatus.apply(world, victim, "confusion", rockclimbEffect, ticks, fumblePct, { unique: true })) return false;
        const body = world.observe(victim);
        const point = body !== null ? body.position() : at;
        WorldFeedback.emit(world, rockclimbScene, 1, at, { moment: "daze", target: String(victim.ref()), fumble: fumblePct }, 24);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.25, 0)), rockclimbDazeText, [], 28);
        return true;
    }

    /** 在落点周围把最上一层地表蹬成粗土，到期原方块回来；返回实际蹬翻的格数。 */
    function rockclimbScuff(world: CombatWorld, point: CombatPoint, cells: number, ticks: number): number {
        const placed: any[] = [];
        const limit = Math.max(3, Math.round(cells));
        const baseY = Math.floor(point.y()), centreX = Math.floor(point.x()), centreZ = Math.floor(point.z());
        for (let dx = -2; dx <= 2 && placed.length < limit; dx++) {
            for (let dz = -2; dz <= 2 && placed.length < limit; dz++) {
                if (dx * dx + dz * dz > 5) continue;
                const x = centreX + dx, z = centreZ + dz;
                for (let dy = 1; dy >= -3; dy--) {
                    const y = baseY + dy;
                    const block = world.block(WorldCombat.point(x, y, z));
                    if (block === null) break;
                    const id = String(block.id());
                    if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                    if (id === "minecraft:water" || id === "minecraft:lava" || id === "minecraft:bedrock" || id === "minecraft:barrier") break;
                    const above = world.block(WorldCombat.point(x, y + 1, z));
                    const over = above === null ? "" : String(above.id());
                    if (over === "minecraft:air" || over === "minecraft:cave_air" || over === "minecraft:void_air")
                        placed.push({ x: x, y: y, z: z, block: "minecraft:coarse_dirt" });
                    break;
                }
            }
        }
        if (!placed.length) return 0;
        try { world.terrain(JSON.stringify({ cells: placed, replace: true, linger: true }), Math.max(40, Math.round(ticks))); }
        catch (error) { return 0; }
        return placed.length;
    }

    define({
        id: rockclimbId,
        cooldownParameter: "recharge",
        name: "Rock Climb",
        description: "蹬地攀上、整个身体越过地面砸向目标：落地那一下很重，可能把目标撞得混乱；落点一圈内的敌人各挨一记，地表被蹬出一小片土痕。命中只有 85，扑偏是常事。",
        uses: ["贴身的一次重扑", "越过一小段距离砸进敌群", "用落地范围一次撞到两三个"],
        kind: "enemy",
        range: 6,
        maxRange: 10,
        prepare: 12,
        active: 0,
        recover: 11,
        cooldown: 34,
        style: "impact",
        defaults: { vault: false, ai: { maxChase: 11, finish: true, crowd: false } },
        fields: [flag("vault", "跃攀")],
        indicator: function (config, pokemon) {
            return { radius: p(rockclimbId, "reach", pokemon) + p(rockclimbId, "impactRadius", pokemon), geometry: "line", style: "impact", color: 0x9A6B3F,
                label: config && config.vault === true ? "攀岩·跃攀" : "攀岩·贴地扑" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[rockclimbId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(rockclimbId, "tempo", context)),
                recover: Math.round(p(rockclimbId, "aftercast", context)),
                cooldown: Math.round(p(rockclimbId, "recharge", context)),
                active: 0,
                range: p(rockclimbId, "reach", context) + p(rockclimbId, "impactRadius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:rockclimb:windup", rockclimbScene, 1, action.origin(),
                JSON.stringify({ moment: "crouch", vault: config && config.vault === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const origin = action.origin();
            const power = p(rockclimbId, "ram", action);
            const reach = p(rockclimbId, "reach", action);
            const arc = p(rockclimbId, "arc", action);
            const duration = Math.max(1, Math.round(p(rockclimbId, "leapTicks", action)));
            const radius = p(rockclimbId, "impactRadius", action);
            const spread = p(rockclimbId, "spread", action);
            const chance = Math.max(0.02, Math.min(0.9, p(rockclimbId, "confuseChance", action)));
            const daze = Math.max(40, Math.round(p(rockclimbId, "dazeTicks", action)));
            const fumblePct = Math.round(Math.max(0.05, Math.min(0.9, p(rockclimbId, "fumble", action))) * 100);
            const scuffCells = Math.round(p(rockclimbId, "scuffCells", action));
            const scuffTicks = Math.round(p(rockclimbId, "scuffTicks", action));
            const motes = Math.max(10, Math.round(p(rockclimbId, "motes", action)));
            const maxTargets = Math.max(1, Math.round(p(rockclimbId, "maxTargets", action)));
            const scale = Math.max(0.6, Math.min(2.2, radius / 1.0));
            const intensity = Math.max(0.6, Math.min(2.4, power / 90));
            const target = action.target();

            let heading = aim(action);
            heading = WorldCombat.point(heading.x(), 0, heading.z());
            if (heading.length() < 1e-3) heading = WorldCombat.point(0, 0, 1);
            const aimed = NativeSemantics.aim(action, move, heading.unit(), spread);
            let direction = WorldCombat.point(aimed.x(), 0, aimed.z());
            direction = direction.length() < 1e-3 ? heading.unit() : direction.unit();

            let tick = 0, previousVertical = 0;
            sound(action, "minecraft:entity.ravager.roar");
            WorldFeedback.emit(world, rockclimbScene, 1, origin,
                { moment: "leap", direction: [direction.x(), direction.y(), direction.z()], reach: reach, arc: arc,
                    motes: motes, scale: scale, intensity: intensity }, 60);

            function land(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(actor);
                const point = body !== null ? body.position() : current.origin();
                let hits = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, radius, { below: 1.6, above: 2.8 }),
                    function (victim, facts) {
                        if (hits >= maxTargets) return;
                        const landed = hurt(current, victim, rockclimbId, power, { damage: damageSpec(rockclimbId, "ram"), contact: true });
                        hits++;
                        if (landed) {
                            WorldFeedback.emit(scope, rockclimbScene, 1, facts.position(),
                                { moment: "slam", target: String(victim.ref()), motes: motes, scale: scale, intensity: intensity }, 26);
                            if (scope.valid(victim) && scope.random() < chance) rockclimbDaze(scope, victim, facts.position(), daze, fumblePct);
                        }
                    });
                const scuffed = rockclimbScuff(scope, point, scuffCells, scuffTicks);
                WorldFeedback.emit(scope, rockclimbScene, 1, point,
                    { moment: "crater", cells: scuffed, radius: radius, motes: motes, scale: scale }, 30);
                if (hits > 0) {
                    sound(current, "minecraft:item.mace.smash_ground");
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.3, 0)), rockclimbHitText, [hits], 26);
                } else {
                    WorldFeedback.emit(scope, rockclimbScene, 1, point, { moment: "miss", motes: motes, scale: scale }, 24);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), rockclimbMissText, [], 24);
                }
                done(current);
            }

            function advance(current: CombatAction): void {
                const scope = current.world();
                const local = scope.observe(actor);
                if (local === null) { done(current); return; }
                tick++;
                const fraction = tick / duration;
                const vertical = Math.sin(fraction * Math.PI) * arc;
                const horizontal = reach / duration;
                const moved = scope.displace(actor,
                    WorldCombat.point(direction.x() * horizontal, vertical - previousVertical, direction.z() * horizontal));
                previousVertical = vertical;
                if (tick >= duration || moved < 0.02) { land(current); return; }
                WorldFeedback.keep(scope, "rockclimb:leap:" + String(actor.ref()), rockclimbScene, 1, local.position(),
                    { moment: "air", direction: [direction.x(), direction.y(), direction.z()], arc: arc, scale: scale, intensity: intensity }, 8);
                current.after(1, advance);
            }

            advance(action);
        }
    });


    // 混乱存续期：低密度的飞鸟与土点每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_rockclimb/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== rockclimbEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "rockclimb:daze:" + String(actor.ref()), rockclimbScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()), fumble: data.amplifier }, 40);
    });
}
