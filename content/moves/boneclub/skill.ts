/**
 * 骨棒 / boneclub 的出手方式。
 *
 * 核心念头：抡起手里的骨头当棍子——骨头比身体够得远，沿瞄准方向扫出一条窄长走廊；扫中的目标吃一记不接触的重击，
 * 偶尔被敲懵。命中只有 85，抡偏是常事：共享的命中偏角让骨头的方向真的会歪，歪出走廊就抡空、磕在地上留下土痕。
 * 它是畏缩家族里唯一用武器够得更远、也是唯一会真的打偏的一式。
 *
 * 三幕：
 *   起（raise，提交前）：举棍、转腰，棍影在身侧扫开的预告。
 *   挥（swing → hit / scuff）：提交后沿命中偏角修正过的方向踏近一小步，扫出一条 lane；
 *       走廊内的敌人各吃一记 club 不接触伤害（最多 maxTargets 人），按 staggerChance 掷畏缩。
 *   果（arc / scuff）：命中浮字并沿尽端扫出一道弧光；抡空则骨头磕地，留下土痕。
 *
 * 与同族分开：暗影之骨把骨头掷出去、碎岩/铁尾是贴身打击；只有骨棒把骨头握在手里、够得更远。
 *
 * 畏缩：施加本单元声明的 MobEffect（共享身份 `world_combat:status/flinch`，只借身份、行为自写）并投递
 * `world_combat:interrupt`；下方门禁在窗口内拒绝新动作，伤害阶段不受影响。
 *
 * 配置 `sweep`（横扫式）由 resolve 改时序、由公式改宽度与威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const boneclubScene = "world_combat:move_boneclub";
    const boneclubFlinchEffect = "world_combat:boneclub_flinch";
    const boneclubHitText = "world_combat.move.boneclub.text.hit";
    const boneclubFlinchText = "world_combat.move.boneclub.text.flinch";
    const boneclubScuffText = "world_combat.move.boneclub.text.scuff";

    function boneclubFlinch(world: CombatWorld, target: CombatActor, ticks: number): boolean {
        if (MobEffects.apply(world, target, boneclubFlinchEffect, ticks, 0) === null) return false;
        world.deliver(target, "world_combat:interrupt");
        return true;
    }

    /** 扫过的走廊四角：判定与表现读同一组顶点。 */
    function boneclubLane(origin: CombatPoint, direction: CombatPoint, reach: number, half: number): CombatPoint[] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const end = origin.plus(heading.scale(reach));
        return [origin.plus(side.scale(half)), origin.minus(side.scale(half)), end.minus(side.scale(half)), end.plus(side.scale(half))];
    }
    function boneclubPath(vertices: CombatPoint[]): number[][] {
        return vertices.map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /** 骨头磕地：把落点周围一小片地表换成同层的地痕，到期原方块回来。 */
    function boneclubScuff(world: CombatWorld, point: CombatPoint, radius: number, ticks: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const r = Math.max(1, Math.ceil(radius)), limit = Math.max(4, Math.round(radius * radius * 4)), inner = Math.max(0.2, radius * 0.25);
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
                const cracked = id === "minecraft:grass_block" || id === "minecraft:dirt" || id === "minecraft:coarse_dirt" ||
                    id === "minecraft:podzol" || id === "minecraft:rooted_dirt" || id === "minecraft:moss_block" ? "minecraft:coarse_dirt"
                    : id === "minecraft:stone" || id === "minecraft:granite" || id === "minecraft:diorite" || id === "minecraft:andesite" ||
                        id === "minecraft:tuff" || id === "minecraft:deepslate" || id === "minecraft:gravel" ? "minecraft:cobblestone"
                        : id === "minecraft:sand" || id === "minecraft:red_sand" ? "minecraft:sandstone" : "";
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
        freeMovement: true,
        id: "boneclub",
        cooldownParameter: "recharge",
        name: "Bone Club",
        description: "抡起手里的骨头当棍子：骨头比身体够得远，沿瞄准方向扫出一条窄长走廊，扫中的人吃一记不接触重击、偶尔被敲懵。命中只有 85，抡偏是常事，抡空还会把骨头磕在地上。",
        uses: ["用比身体更长的骨头先手够到一个目标", "一次横扫兜住并肩的两三个人", "在对手还没贴上来时敲懵它"],
        kind: "enemy",
        range: 3.2,
        maxRange: 4.4,
        prepare: 8,
        active: 24,
        recover: 9,
        cooldown: 22,
        style: "swing",
        defaults: { sweep: false, ai: { maxChase: 8, spacing: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("boneclub", "reach", pokemon) : 3.2, geometry: "line", style: "swing",
                color: 0xC8B48E, label: config && config.sweep === true ? "横扫" : "直刺" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["boneclub"], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("boneclub", "tempo", context)),
                recover: Math.round(p("boneclub", "aftercast", context)),
                cooldown: Math.round(p("boneclub", "recharge", context)),
                active: skills["boneclub"].active,
                range: p("boneclub", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:boneclub:" + action.id(), boneclubScene, 1, action.origin(),
                JSON.stringify({ moment: "raise", sweep: config && config.sweep === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const reach = p("boneclub", "reach", action);
            const gauge = p("boneclub", "gauge", action);
            const power = p("boneclub", "club", action);
            const step = p("boneclub", "step", action);
            const chance = p("boneclub", "staggerChance", action);
            const flinchTicks = Math.round(p("boneclub", "staggerTicks", action));
            const scuffTicks = Math.round(p("boneclub", "scuffTicks", action));
            const cap = Math.max(1, Math.round(p("boneclub", "maxTargets", action)));
            // 命中 85：共享偏角让骨头的方向真的会歪；歪出走廊就抡空。
            const direction = NativeSemantics.aim(action, move, aim(action), 1.4);
            const clubs = Math.max(8, Math.round(power * 0.16));
            const scale = gauge / 0.5;
            let hits = 0, first: CombatPoint | null = null, settled = false;

            if (step > 0.05) world.displace(actor, direction.scale(step));
            const moved = world.observe(actor);
            const origin = moved !== null ? moved.position() : action.origin();
            const vertices = boneclubLane(origin, direction, reach, gauge);
            const end = origin.plus(WorldCombat.point(direction.x(), 0, direction.z()).unit().scale(reach));

            WorldFeedback.emit(world, boneclubScene, 1, origin,
                { moment: "swing", path: boneclubPath(vertices), direction: [direction.x(), direction.y(), direction.z()],
                    reach: Math.round(reach * 10) / 10, gauge: Math.round(gauge * 100) / 100, scale: scale, clubs: clubs }, 24);
            sound(action, "minecraft:entity.player.attack.sweep");

            WorldGeometry.selectEnemies(world, WorldGeometry.lane(origin, direction, reach, gauge, { below: 1.2, above: 2.0 }), function (enemy, facts) {
                if (String(enemy.ref()) === String(actor.ref()) || hits >= cap) return;
                const landed = hurt(action, enemy, "boneclub", power, { damage: damageSpec("boneclub", "club") });
                if (!landed) return;
                hits++;
                const at = facts.position();
                if (first === null) first = at;
                WorldFeedback.emit(world, boneclubScene, 1, at,
                    { moment: "hit", target: String(enemy.ref()), scale: scale, clubs: clubs }, 22);
                if (world.valid(enemy) && world.random() < chance && boneclubFlinch(world, enemy, flinchTicks)) {
                    WorldFeedback.emit(world, boneclubScene, 1, at, { moment: "flinch", target: String(enemy.ref()) }, 22);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.3, 0)), boneclubFlinchText, [], 22);
                }
            });

            if (hits > 0) {
                sound(action, "cobblemon:impact.ground");
                WorldFeedback.emit(world, boneclubScene, 1, end,
                    { moment: "arc", direction: [direction.x(), direction.y(), direction.z()], scale: scale, clubs: clubs }, 20);
                WorldFeedback.text(world, (first !== null ? first : end).plus(WorldCombat.point(0, 1.2, 0)), boneclubHitText, [hits], 22);
            } else if (!settled) {
                settled = true;
                const trace = action.trace(origin, end, gauge);
                const at = trace.blocked() ? trace.position() : end;
                const placed = boneclubScuff(world, at, Math.max(0.6, gauge + 0.4), scuffTicks);
                WorldFeedback.emit(world, boneclubScene, 1, at,
                    { moment: "scuff", radius: Math.max(0.6, gauge + 0.4), cells: placed, scale: scale }, 24);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.9, 0)), boneclubScuffText, [], 20);
                sound(action, "minecraft:block.bone_block.break");
            }
            done(action);
        }
    });

}
