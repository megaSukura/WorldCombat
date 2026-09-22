/**
 * 草之誓约 / grasspledge 的出手方式与场地规则。
 *
 * 核心念头：一纸草之誓约被按进地里，草柱连藤带叶从选定点炸土而出，缠住柱内的敌人、把他们拖慢；
 *   柱脚留下一圈盘绕的誓约印，站上去的人一直被缠。若落点附近已有火或水的誓约印，两纸誓约彼此应答：
 *   这一击更重，脚下整片地变成火海（草＋火）或湿地（草＋水）——组合产物取决于另一元素，与原生一致。
 *
 * 三幕：
 *   起（windup，提交前）：落点画出一圈藤纹符文，只播预告（可免费打断）。
 *   击（erupt → hit）：提交后草柱炸土而出，柱内每个敌人挨一次 `pillar`、被缠住并拖慢；柱脚盘出草皮。
 *   留（scar / seaoffire / wetland）：誓约印持续拖慢；若与另一誓约共鸣，则换成更广的组合场。
 */
namespace PokemonSkills {
    function grasspledgePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function grasspledgeAreaPoint(area: WorldEffects.Area): CombatPoint {
        return WorldCombat.point(area.position[0], area.position[1], area.position[2]);
    }

    /** 落点附近的另一元素誓约印：火 → 火海，水 → 湿地；取最近的一个，没有则返回空串。 */
    function grasspledgeComboAt(world: CombatWorld, point: CombatPoint, detect: number): string {
        const kinds: string[][] = [["world_combat:field/pledge_fire", "seaoffire"], ["world_combat:field/pledge_water", "wetland"]];
        let best = "", bestDistance = detect;
        for (let i = 0; i < kinds.length; i++) {
            const areas = WorldEffects.areas(world, kinds[i][0]);
            for (let j = 0; j < areas.length; j++) {
                const distance = grasspledgeAreaPoint(areas[j]).minus(point).length();
                if (distance <= bestDistance) { bestDistance = distance; best = kinds[i][1]; }
            }
        }
        return best;
    }

    function grasspledgeComboExists(world: CombatWorld, point: CombatPoint, radius: number): boolean {
        const actors = world.query(point, radius, false);
        const list: CombatActor[] = [world.source()];
        for (let i = 0; i < actors.length; i++) list.push(actors[i]);
        for (let a = 0; a < list.length; a++) {
            const fields = world.effects(list[a], "world_combat:field");
            for (let f = 0; f < fields.length; f++) {
                const state = JSON.parse(String(fields[f].data()));
                if (!state.combo) continue;
                const centre = WorldCombat.point(state.position[0], state.position[1], state.position[2]);
                if (centre.minus(point).length() <= radius + (Number(state.radius) || 0)) return true;
            }
        }
        return false;
    }

    /** 柱脚把自然地表盘成草皮；只动表层可换方块，租借 `linger`，到期原方块回来。 */
    function grasspledgeGround(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
        const cells: any[] = [], seen: { [key: string]: boolean } = {};
        const baseX = Math.floor(point.x()), baseY = Math.floor(point.y()), baseZ = Math.floor(point.z());
        const limit = Math.max(4, Math.round(cap)), r = Math.ceil(radius);
        for (let dx = -r; dx <= r && cells.length < limit; dx++) for (let dz = -r; dz <= r && cells.length < limit; dz++) {
            if (dx * dx + dz * dz > radius * radius) continue;
            const x = baseX + dx, z = baseZ + dz;
            for (let dy = 1; dy >= -2; dy--) {
                const y = baseY + dy, block = world.block(WorldCombat.point(x, y, z));
                if (block === null) break;
                const id = String(block.id());
                if (id === "minecraft:air" || id === "minecraft:cave_air" || id === "minecraft:void_air") continue;
                if (id === "minecraft:bedrock" || id === "minecraft:barrier" || id === "minecraft:water" || id === "minecraft:lava") break;
                const key = x + "," + y + "," + z;
                if (!seen[key] && id !== "minecraft:moss_block") { seen[key] = true; cells.push({ x: x, y: y, z: z, block: "minecraft:moss_block" }); }
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    // 誓约印：站在上面的非友方持续被盘根拖慢；画面是一圈贴地的草叶与盘根。
    WorldEffects.fieldRule(grasspledgeScar, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            MobEffects.apply(world, actor, "minecraft:slowness", 40, 1);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_grasspledge/scar/" + effect.id(), grasspledgeScene, 1, grasspledgePoint(field),
                { moment: "scar", radius: field.radius, scale: field.radius / 1.8, count: Math.round(10 + field.radius * 8) }, 20);
        }
    });

    // 火海：草＋火共鸣后的广域燃烧地；非友方持续燃烧。
    WorldEffects.fieldRule(grasspledgeSea, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            CombatStatus.inflict(world, actor, "burn", Math.max(60, Math.round(Number(field.data.burn) || 100)));
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_grasspledge/sea/" + effect.id(), grasspledgeScene, 1, grasspledgePoint(field),
                { moment: "seaoffire", radius: field.radius, scale: field.radius / 1.8, count: Math.round(20 + field.radius * 10) }, 20);
        }
    });

    // 湿地：草＋水共鸣后的广域泥沼；非友方踩进来被陷住，站在里面持续被拖慢。
    WorldEffects.fieldRule(grasspledgeWetland, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            WorldEffects.apply(world, actor, "rooted", {}, 30);
            MobEffects.apply(world, actor, "minecraft:slowness", 80, 2);
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            MobEffects.apply(world, actor, "minecraft:slowness", 60, 2);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_grasspledge/wetland/" + effect.id(), grasspledgeScene, 1, grasspledgePoint(field),
                { moment: "wetland", radius: field.radius, scale: field.radius / 1.8, count: Math.round(18 + field.radius * 9) }, 20);
        }
    });

    define({
        id: grasspledgeId,
        name: "草之誓约",
        description: "在选定的地面立起一纸草之誓约：草柱炸土而出，缠住柱内的敌人并拖慢他们，柱脚留下一圈持续盘绕的誓约印。落点附近已有火或水的誓约印时会共鸣——这一击更重，脚下整片地变成火海（草＋火）或湿地（草＋水）；湿地会把踩进来的敌人陷住、拖慢。",
        uses: ["在远处的地面立起草柱并缠住敌人", "用一圈盘绕的誓约印拖慢一块地", "和队友的火／水誓约连成火海或湿地"],
        kind: "point",
        range: 9,
        maxRange: 17,
        prepare: 10,
        active: 30,
        recover: 8,
        cooldown: 78,
        style: "tangle",
        defaults: { entangle: false, ai: { maxChase: 12 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(grasspledgeId, "pillarRadius", pokemon), geometry: "area", style: "tangle",
                color: 0x5FA83A, label: config && config.entangle === true ? "缠誓草柱" : "草之誓约" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[grasspledgeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(5, Math.round(p(grasspledgeId, "tempo", context))),
                recover: 8,
                cooldown: Math.max(40, Math.round(p(grasspledgeId, "recharge", context))),
                active: skills[grasspledgeId].active,
                range: p(grasspledgeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const mark = p(grasspledgeId, "markRadius", action);
            action.present("world_combat:move_grasspledge:mark", grasspledgeScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "mark", radius: mark, scale: mark / 1.8, height: p(grasspledgeId, "pillarHeight", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = Math.max(1.0, p(grasspledgeId, "pillarRadius", action));
            const height = Math.max(2.4, p(grasspledgeId, "pillarHeight", action));
            const power = p(grasspledgeId, "pillar", action);
            const root = Math.max(16, Math.round(p(grasspledgeId, "rootTicks", action)));
            const slow = Math.max(40, Math.round(p(grasspledgeId, "slowTicks", action)));
            const markRadius = Math.max(1.0, p(grasspledgeId, "markRadius", action));
            const markTicks = Math.max(60, Math.round(p(grasspledgeId, "markTicks", action)));
            const detect = p(grasspledgeId, "comboDetect", action);
            const comboScale = p(grasspledgeId, "comboScale", action);
            const comboPower = p(grasspledgeId, "comboPower", action);
            const burst = Math.round(p(grasspledgeId, "burst", action));
            const cells = Math.round(p(grasspledgeId, "scarCells", action));
            const cap = Math.max(1, Math.round(p(grasspledgeId, "maxTargets", action)));
            const combo = grasspledgeComboAt(world, point, detect);
            const scale = markRadius / 1.8;
            let hits = 0;

            sound(action, "cobblemon:impact.grass");
            WorldFeedback.emit(world, grasspledgeScene, 1, point,
                { moment: "erupt", radius: radius, height: height, count: burst, combo: combo === "" ? 0 : 1 }, 40);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, radius, { below: 0.5, above: height }), function (enemy, facts) {
                if (hits >= cap) return;
                if (world.valid(enemy)) {
                    MobEffects.apply(world, enemy, "minecraft:slowness", slow, 1);
                    WorldEffects.apply(world, enemy, "rooted", {}, root);
                }
                if (!hurt(action, enemy, grasspledgeId, power * (combo === "" ? 1 : comboPower), { damage: damageSpec(grasspledgeId, "pillar") })) return;
                hits++;
                WorldFeedback.emit(world, grasspledgeScene, 1, facts.position(), { moment: "hit", target: String(enemy.ref()), count: 10, scale: scale }, 20);
            });

            WorldEffects.field(world, grasspledgeScar, point, markRadius,
                { element: "grass", burn: 60, radius: markRadius, scale: scale }, markTicks);
            grasspledgeGround(world, point, markRadius, markTicks, cells);

            let arena = false;
            if (combo !== "" && !grasspledgeComboExists(world, point, markRadius * comboScale)) {
                arena = true;
                const arenaRadius = markRadius * comboScale;
                WorldEffects.field(world, combo === "seaoffire" ? grasspledgeSea : grasspledgeWetland, point, arenaRadius,
                    { element: "grass", combo: combo, burn: 100, radius: arenaRadius, scale: arenaRadius / 1.8 }, Math.round(markTicks * 1.6));
                WorldFeedback.emit(world, grasspledgeScene, 1, point,
                    { moment: combo === "seaoffire" ? "seaoffire" : "wetland", radius: arenaRadius, scale: arenaRadius / 1.8, count: 60 }, 46);
                sound(action, combo === "seaoffire" ? "minecraft:block.fire.ambient" : "minecraft:block.wet_grass.break");
            }
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, height * 0.55, 0)),
                hits > 0 ? (arena ? grasspledgeComboText : grasspledgeHitText) : grasspledgeMissText,
                hits > 0 ? [arena ? (combo === "seaoffire" ? "火海" : "湿地") : hits] : [], 30);
            sound(action, "minecraft:block.moss.break");
            done(action);
        }
    });
}
