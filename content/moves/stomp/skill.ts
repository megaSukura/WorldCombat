/**
 * 踩踏 / stomp 的出手方式。
 *
 * 核心念头：把全身重量往下砸——高高抬起、对准目标落脚；砸中的那一下最重，脚下的震波还把附近站着的人一起震懵，
 * 落点留下一小片被踩实的塌陷。它只砸得到**站在地上**的目标：空中的人躲得开（原生的 nonsky 落成可读的反制）。
 *
 * 三幕：
 *   起（raise，提交前）：抬脚、沉身，脚边尘土上跳的预告。
 *   砸（slam → hit / whiff）：提交后不移动，整只身体落到目标点上；目标站在地上且在射程内就结算 slam 接触伤害、
 *       按 flinchChance 掷畏缩，并以落点为心震出 shock 半径：圈内其他站在地上的敌人各吃一记 aftershock、
 *       按 staggerChance 掷畏缩。目标在空中或已走远则踩空，只踩实脚下的地。
 *   痕（crater）：落点的地表被踩成粗土／圆石／砂岩，停留一会儿后原方块回来。
 *
 * 与同族分开：重踏是一圈外推的地裂、跺脚是一条朝目标的地缝、咬住是钩住拉近、骨棒是长柄横扫；
 * 只有踩踏是**垂直下砸、单体最重、附带一小圈震波、且只认站在地上的对手**。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `heavy`（重踏式）由 resolve 改时序、由公式改威力／范围，提交后才触碰世界。
 */
namespace PokemonSkills {
    const stompScene = "world_combat:move_stomp";
    const stompFlinchEffect = "world_combat:stomp_flinch";
    const stompHitText = "world_combat.move.stomp.text.hit";
    const stompFlinchText = "world_combat.move.stomp.text.flinch";
    const stompShockText = "world_combat.move.stomp.text.shock";
    const stompMissText = "world_combat.move.stomp.text.miss";

    function stompFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, stompFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 落脚处的地表形态：泥土类踩成粗土，石头类踩裂成圆石，沙地踩成砂岩；其余不动。 */
    function stompCracked(id: string): string {
        if (id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
            id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block") return "minecraft:coarse_dirt";
        if (id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" ||
            id === "minecraft:andesite" || id === "minecraft:tuff" || id === "minecraft:deepslate" ||
            id === "minecraft:gravel") return "minecraft:cobblestone";
        if (id === "minecraft:sand" || id === "minecraft:red_sand") return "minecraft:sandstone";
        return "";
    }

    /** 把落脚点周围的地表踩实→换成同层的地痕；只动地表方块，到期原方块回来。 */
    function stompCrater(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const limit = Math.max(6, Math.round(radius * radius * 6));
        const r = Math.ceil(radius), inner = Math.max(0.3, radius * 0.2);
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            const distance = Math.sqrt(dx * dx + dz * dz);
            if (distance > radius || distance < inner) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 1; dy >= -2; dy--) {
                const y = baseY + dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const key = x + "," + y + "," + z;
                const cracked = stompCracked(id);
                if (!seen[key] && cracked !== "" && cracked !== id) { seen[key] = true; cells.push({ x: x, y: y, z: z, block: cracked }); }
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    define({
        requiresGround: true,
        id: "stomp",
        cooldownParameter: "recharge",
        name: "Stomp",
        description: "把全身重量往下砸的一脚：近身招里单发最重，命中后有机会踩懵目标，脚下的震波还会波及落点周围站着的其他敌人、也有机会震懵——但只砸得到站在地上的目标，空中的人躲得开。",
        uses: ["把靠近的地面目标一脚踩实，并尝试震懵", "顺带震到落点周围站着的其他敌人", "在对手被逼到地面时兑现最重的一击"],
        kind: "enemy",
        range: 2.4,
        maxRange: 3.2,
        prepare: 10,
        active: 14,
        recover: 9,
        cooldown: 26,
        style: "stomp",
        defaults: { heavy: false, ai: { maxChase: 7, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("stomp", "shock", pokemon) : 1.6, geometry: "area", style: "stomp",
                color: 0x8A7A62, label: config && config.heavy === true ? "重踏" : "踩踏" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["stomp"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("stomp", "tempo", context)),
                recover: Math.round(p("stomp", "aftercast", context)),
                cooldown: Math.round(p("stomp", "recharge", context)),
                active: skills["stomp"].active
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:stomp:" + action.id(), stompScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", heavy: config && config.heavy === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const self = world.observe(actor);
            const body = target !== null && world.valid(target) ? world.observe(target) : null;
            if (self === null) { done(action); return; }

            const power = p("stomp", "slam", action);
            const shockPower = p("stomp", "aftershock", action);
            const shock = p("stomp", "shock", action);
            const foot = p("stomp", "foot", action);
            const crater = p("stomp", "crater", action);
            const craterTicks = Math.round(p("stomp", "craterTicks", action));
            const chance = p("stomp", "flinchChance", action);
            const stagger = p("stomp", "staggerChance", action);
            const flinchTicks = Math.round(p("stomp", "flinchTicks", action));
            const direction = aim(action);
            const scale = foot / 0.5;
            const intensity = Math.max(0.5, Math.min(2.4, power / 80));
            const grounded = body !== null && body.grounded() && body.position().minus(self.position()).length() <= skills["stomp"].range + 0.6;
            const landing = body !== null
                ? (grounded ? body.position() : WorldCombat.point(body.position().x(), self.position().y(), body.position().z()))
                : self.position().plus(direction.scale(1.2));

            WorldFeedback.emit(world, stompScene, 1, landing,
                { moment: "slam", scale: 1, intensity: intensity, foot: foot, shock: Math.round(shock * 100) / 100,
                    quake: Math.max(10, Math.round(shock * 24)), heavy: config && config.heavy === true ? 1 : 0 }, 26);
            sound(action, "minecraft:item.mace.smash_ground_heavy");
            sound(action, "cobblemon:impact.ground");

            let hits = 0;
            if (grounded && target !== null) {
                const foe = target;
                if (hurt(action, foe, "stomp", power, { damage: damageSpec("stomp", "slam"), contact: true })) {
                    hits++;
                    WorldFeedback.emit(world, stompScene, 1, landing,
                        { moment: "hit", target: String(foe.ref()), scale: scale, intensity: intensity,
                            quake: Math.max(10, Math.round(shock * 24)) }, 24);
                    WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.2, 0)), stompHitText, [], 22);
                    if (world.valid(foe) && world.random() < chance && stompFlinch(world, foe, flinchTicks)) {
                        WorldFeedback.emit(world, stompScene, 1, landing, { moment: "flinch", target: String(foe.ref()) }, 24);
                        WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.35, 0)), stompFlinchText, [], 24);
                    }
                }
            } else {
                WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.0, 0)), stompMissText, [], 22);
            }

            // 震波：落点周围站在地上的其他人各吃一记较轻的 aftershock，并按 staggerChance 掷畏缩。
            let shaken = 0;
            WorldGeometry.selectEnemies(world, WorldGeometry.ring(landing, 0, shock, { below: 2, above: 1 }), function (enemy, facts) {
                const ref = String(enemy.ref());
                if (ref === String(actor.ref()) || (target !== null && ref === String(target.ref()))) return;
                if (!facts.grounded() || shaken >= 3) return;
                if (!hurt(action, enemy, "stomp", shockPower, { damage: damageSpec("stomp", "aftershock") })) return;
                shaken++;
                WorldFeedback.emit(world, stompScene, 1, facts.position(),
                    { moment: "shock", target: ref, scale: Math.max(0.5, Math.min(2, shock / 1.6)),
                        quake: Math.max(8, Math.round(shockPower * 1.5)) }, 22);
                if (world.valid(enemy) && world.random() < stagger && stompFlinch(world, enemy, flinchTicks)) {
                    WorldFeedback.emit(world, stompScene, 1, facts.position(), { moment: "flinch", target: ref }, 22);
                }
            });
            if (shaken > 0) WorldFeedback.text(world, landing.plus(WorldCombat.point(0, 1.45, 0)), stompShockText, [shaken], 24);

            const placed = stompCrater(world, landing, crater, craterTicks);
            WorldFeedback.emit(world, stompScene, 1, landing,
                { moment: "crater", radius: Math.round(crater * 100) / 100, cells: placed, scale: 1, intensity: intensity }, 28);
            done(action);
        }
    });

}
