/**
 * 火之誓约 / firepledge 的出手方式与场地规则。
 *
 * 核心念头：一纸火之誓约被按进地里，火柱从选定点拔地而起，把柱内的敌人烧着；柱脚留下一圈燃烧的誓约印，
 *   站上去的人会一直烧。若落点附近已有草或水的誓约印，两纸誓约彼此应答：这一击更重，
 *   脚下整片地变成火海（火＋草）或挂起彩虹（火＋水）——组合产物取决于另一元素，与原生一致。
 *
 * 三幕：
 *   起（windup，提交前）：落点画出一圈誓约符文，只播预告（可免费打断）。
 *   击（erupt → hit）：提交后火柱拔地而起，柱内每个敌人挨一次 `pillar` 并被点燃；柱脚烙出焦土。
 *   留（scar / seaoffire / rainbow）：誓约印持续燃；若与另一誓约共鸣，则换成更广的组合场。
 *
 * 誓约印是真实的 `WorldEffects` 场地效果（规则由本单元注册）。别的誓约单元按同一命名约定读取
 * `world_combat:field/pledge_<元素>`，所以三招可以跨单元共鸣，而不必互相依赖。
 */
namespace PokemonSkills {
    function firepledgePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function firepledgeAreaPoint(area: WorldEffects.Area): CombatPoint {
        return WorldCombat.point(area.position[0], area.position[1], area.position[2]);
    }

    /** 落点附近的另一元素誓约印：草 → 火海，水 → 彩虹；取最近的一个，没有则返回空串。 */
    function firepledgeComboAt(world: CombatWorld, point: CombatPoint, detect: number): string {
        const kinds: string[][] = [["world_combat:field/pledge_grass", "seaoffire"], ["world_combat:field/pledge_water", "rainbow"]];
        let best = "", bestDistance = detect;
        for (let i = 0; i < kinds.length; i++) {
            const areas = WorldEffects.areas(world, kinds[i][0]);
            for (let j = 0; j < areas.length; j++) {
                const distance = firepledgeAreaPoint(areas[j]).minus(point).length();
                if (distance <= bestDistance) { bestDistance = distance; best = kinds[i][1]; }
            }
        }
        return best;
    }

    /** 附近已有任何组合场就不再叠一层；组合是这一击的收束，不是堆叠物。 */
    function firepledgeComboExists(world: CombatWorld, point: CombatPoint, radius: number): boolean {
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

    /** 柱脚把自然地表烙成焦土；只动表层可换方块，租借 `linger`，到期原方块回来。 */
    function firepledgeGround(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
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
                if (!seen[key] && id !== "minecraft:netherrack") { seen[key] = true; cells.push({ x: x, y: y, z: z, block: "minecraft:netherrack" }); }
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    // 誓约印：站在上面的非友方持续燃烧；画面是一圈贴地的炭红余烬。
    WorldEffects.fieldRule(firepledgeScar, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            CombatStatus.inflict(world, actor, "burn", Math.max(20, Math.round(Number(field.data.burn) || 60)));
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_firepledge/scar/" + effect.id(), firepledgeScene, 1, firepledgePoint(field),
                { moment: "scar", radius: field.radius, scale: field.radius / 1.7, count: Math.round(8 + field.radius * 6) }, 20);
        }
    });

    // 火海：火＋草共鸣后的广域燃烧地；非友方持续燃烧。
    WorldEffects.fieldRule(firepledgeSea, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            CombatStatus.inflict(world, actor, "burn", Math.max(60, Math.round(Number(field.data.burn) || 100)));
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_firepledge/sea/" + effect.id(), firepledgeScene, 1, firepledgePoint(field),
                { moment: "seaoffire", radius: field.radius, scale: field.radius / 1.7, count: Math.round(20 + field.radius * 10) }, 20);
        }
    });

    // 彩虹：火＋水共鸣后的祝福地；友方持续回复。
    WorldEffects.fieldRule(firepledgeRainbow, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!world.friendly(actor)) return;
            MobEffects.apply(world, actor, "minecraft:regeneration", 100, 0);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_firepledge/rainbow/" + effect.id(), firepledgeScene, 1, firepledgePoint(field),
                { moment: "rainbow", radius: field.radius, scale: field.radius / 1.7, count: Math.round(16 + field.radius * 8) }, 20);
        }
    });

    define({
        id: firepledgeId,
        cooldownParameter: "recharge",
        name: "火之誓约",
        description: "在选定的地面立起一纸火之誓约：火柱拔地而起，烧穿柱内的敌人并点燃他们，柱脚留下一圈持续燃烧的誓约印。落点附近已有草或水的誓约印时会共鸣——这一击更重，脚下整片地变成火海（火＋草）或挂起彩虹（火＋水），彩虹持续为友方回复。",
        uses: ["在远处的地面立起火柱并烧着站在那儿的敌人", "用一圈燃烧的誓约印封住一块地", "和队友的草／水誓约连成火海或彩虹"],
        kind: "point",
        range: 10,
        maxRange: 18,
        prepare: 10,
        active: 30,
        recover: 8,
        cooldown: 80,
        style: "ember",
        defaults: { fierce: false, ai: { maxChase: 12 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(firepledgeId, "pillarRadius", pokemon), geometry: "area", style: "ember",
                color: 0xFF7A2A, label: config && config.fierce === true ? "烈誓火柱" : "火之誓约" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[firepledgeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(5, Math.round(p(firepledgeId, "tempo", context))),
                recover: 8,
                cooldown: Math.max(40, Math.round(p(firepledgeId, "recharge", context))),
                active: skills[firepledgeId].active,
                range: p(firepledgeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const mark = p(firepledgeId, "markRadius", action);
            action.present("world_combat:move_firepledge:mark", firepledgeScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "mark", radius: mark, scale: mark / 1.7, height: p(firepledgeId, "pillarHeight", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = Math.max(1.0, p(firepledgeId, "pillarRadius", action));
            const height = Math.max(2.4, p(firepledgeId, "pillarHeight", action));
            const power = p(firepledgeId, "pillar", action);
            const burn = Math.max(20, Math.round(p(firepledgeId, "burnTicks", action)));
            const markRadius = Math.max(1.0, p(firepledgeId, "markRadius", action));
            const markTicks = Math.max(60, Math.round(p(firepledgeId, "markTicks", action)));
            const detect = p(firepledgeId, "comboDetect", action);
            const comboScale = p(firepledgeId, "comboScale", action);
            const comboPower = p(firepledgeId, "comboPower", action);
            const burst = Math.round(p(firepledgeId, "burst", action));
            const cells = Math.round(p(firepledgeId, "scarCells", action));
            const cap = Math.max(1, Math.round(p(firepledgeId, "maxTargets", action)));
            const combo = firepledgeComboAt(world, point, detect);
            const scale = markRadius / 1.7;
            let hits = 0;

            sound(action, "cobblemon:impact.fire");
            WorldFeedback.emit(world, firepledgeScene, 1, point,
                { moment: "erupt", radius: radius, height: height, count: burst, combo: combo === "" ? 0 : 1 }, 40);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, radius, { below: 0.5, above: height }), function (enemy, facts) {
                if (hits >= cap) return;
                if (world.valid(enemy)) CombatStatus.inflict(world, enemy, "burn", burn);
                if (!hurt(action, enemy, firepledgeId, power * (combo === "" ? 1 : comboPower), { damage: damageSpec(firepledgeId, "pillar") })) return;
                hits++;
                WorldFeedback.emit(world, firepledgeScene, 1, facts.position(), { moment: "hit", target: String(enemy.ref()), count: 10, scale: scale }, 20);
            });

            WorldEffects.field(world, firepledgeScar, point, markRadius,
                { element: "fire", burn: burn, radius: markRadius, scale: scale }, markTicks);
            firepledgeGround(world, point, markRadius, markTicks, cells);

            let arena = false;
            if (combo !== "" && !firepledgeComboExists(world, point, markRadius * comboScale)) {
                arena = true;
                const arenaRadius = markRadius * comboScale;
                WorldEffects.field(world, combo === "seaoffire" ? firepledgeSea : firepledgeRainbow, point, arenaRadius,
                    { element: "fire", combo: combo, burn: Math.max(burn, 100), radius: arenaRadius, scale: arenaRadius / 1.7 }, Math.round(markTicks * 1.6));
                WorldFeedback.emit(world, firepledgeScene, 1, point,
                    { moment: combo === "seaoffire" ? "seaoffire" : "rainbow", radius: arenaRadius, scale: arenaRadius / 1.7, count: 60 }, 46);
                sound(action, combo === "seaoffire" ? "minecraft:block.fire.ambient" : "minecraft:block.amethyst_block.chime");
            }
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, height * 0.55, 0)),
                hits > 0 ? (arena ? firepledgeComboText : firepledgeHitText) : firepledgeMissText,
                hits > 0 ? [arena ? (combo === "seaoffire" ? "火海" : "彩虹") : hits] : [], 30);
            sound(action, "minecraft:block.fire.extinguish");
            done(action);
        }
    });
}
