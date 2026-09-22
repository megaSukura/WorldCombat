/**
 * 水之誓约 / waterpledge 的出手方式与场地规则。
 *
 * 核心念头：一纸水之誓约被按进地里，水柱从选定点涌地而起，浇透柱内的敌人、把他们推开顶起并拖慢；
 *   柱脚留下一汪浸水的誓约印，站上去的人一直被泡着。若落点附近已有火或草的誓约印，两纸誓约彼此应答：
 *   这一击更重，周围挂起彩虹（水＋火）或塌成湿地（水＋草）——组合产物取决于另一元素，与原生一致。
 *
 * 三幕：
 *   起（windup，提交前）：落点浮出一圈水纹符文，只播预告（可免费打断）。
 *   击（erupt → hit）：提交后水柱涌起，柱内每个敌人挨一次 `pillar`、被浇湿拖慢、被推开顶起；柱脚浸出水渍。
 *   留（scar / rainbow / wetland）：誓约印持续拖慢；若与另一誓约共鸣，则换成更广的组合场。
 */
namespace PokemonSkills {
    function waterpledgePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function waterpledgeAreaPoint(area: WorldEffects.Area): CombatPoint {
        return WorldCombat.point(area.position[0], area.position[1], area.position[2]);
    }

    /** 落点附近的另一元素誓约印：火 → 彩虹，草 → 湿地；取最近的一个，没有则返回空串。 */
    function waterpledgeComboAt(world: CombatWorld, point: CombatPoint, detect: number): string {
        const kinds: string[][] = [["world_combat:field/pledge_fire", "rainbow"], ["world_combat:field/pledge_grass", "wetland"]];
        let best = "", bestDistance = detect;
        for (let i = 0; i < kinds.length; i++) {
            const areas = WorldEffects.areas(world, kinds[i][0]);
            for (let j = 0; j < areas.length; j++) {
                const distance = waterpledgeAreaPoint(areas[j]).minus(point).length();
                if (distance <= bestDistance) { bestDistance = distance; best = kinds[i][1]; }
            }
        }
        return best;
    }

    function waterpledgeComboExists(world: CombatWorld, point: CombatPoint, radius: number): boolean {
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

    /** 柱脚把自然地表浸成湿石；只动表层可换方块，租借 `linger`，到期原方块回来。 */
    function waterpledgeGround(world: CombatWorld, point: CombatPoint, radius: number, ticks: number, cap: number): number {
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
                if (!seen[key] && id !== "minecraft:prismarine") { seen[key] = true; cells.push({ x: x, y: y, z: z, block: "minecraft:prismarine" }); }
                break;
            }
        }
        if (!cells.length) return 0;
        try { world.terrain(JSON.stringify({ cells: cells, replace: true, linger: true }), ticks); }
        catch (error) { return 0; }
        return cells.length;
    }

    // 誓约印：站在上面的非友方持续被泡着拖慢。
    WorldEffects.fieldRule(waterpledgeScar, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (world.friendly(actor)) return;
            MobEffects.apply(world, actor, "minecraft:slowness", 40, 0);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_waterpledge/scar/" + effect.id(), waterpledgeScene, 1, waterpledgePoint(field),
                { moment: "scar", radius: field.radius, scale: field.radius / 1.6, count: Math.round(8 + field.radius * 6) }, 20);
        }
    });

    // 彩虹：水＋火共鸣后的祝福地；友方持续回复。
    WorldEffects.fieldRule(waterpledgeRainbow, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (!world.friendly(actor)) return;
            MobEffects.apply(world, actor, "minecraft:regeneration", 100, 0);
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            WorldFeedback.keep(world, "world_combat:move_waterpledge/rainbow/" + effect.id(), waterpledgeScene, 1, waterpledgePoint(field),
                { moment: "rainbow", radius: field.radius, scale: field.radius / 1.6, count: Math.round(16 + field.radius * 8) }, 20);
        }
    });

    // 湿地：水＋草共鸣后的广域泥沼；非友方踩进来被陷住，站在里面持续被拖慢。
    WorldEffects.fieldRule(waterpledgeWetland, {
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
            WorldFeedback.keep(world, "world_combat:move_waterpledge/wetland/" + effect.id(), waterpledgeScene, 1, waterpledgePoint(field),
                { moment: "wetland", radius: field.radius, scale: field.radius / 1.6, count: Math.round(18 + field.radius * 9) }, 20);
        }
    });

    define({
        id: waterpledgeId,
        name: "水之誓约",
        description: "在选定的地面立起一纸水之誓约：水柱涌地而起，浇透柱内敌人、把他们推开顶起并拖慢，柱脚留下一汪浸水的誓约印。落点附近已有火或草的誓约印时会共鸣——这一击更重，周围挂起彩虹（水＋火，持续为友方回复）或塌成湿地（水＋草，踩进去会被陷住、拖慢）。",
        uses: ["在远处的地面立起水柱并推开敌人", "用一汪浸水的誓约印泡住一块地", "和队友的火／草誓约连成彩虹或湿地"],
        kind: "point",
        range: 9,
        maxRange: 16,
        prepare: 10,
        active: 30,
        recover: 8,
        cooldown: 80,
        style: "surge",
        defaults: { deluge: false, ai: { maxChase: 12 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(waterpledgeId, "pillarRadius", pokemon), geometry: "area", style: "surge",
                color: 0x3FA8D8, label: config && config.deluge === true ? "涌誓水柱" : "水之誓约" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[waterpledgeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.max(5, Math.round(p(waterpledgeId, "tempo", context))),
                recover: 8,
                cooldown: Math.max(40, Math.round(p(waterpledgeId, "recharge", context))),
                active: skills[waterpledgeId].active,
                range: p(waterpledgeId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const mark = p(waterpledgeId, "markRadius", action);
            action.present("world_combat:move_waterpledge:mark", waterpledgeScene, 1, action.targetPosition(),
                JSON.stringify({ moment: "mark", radius: mark, scale: mark / 1.6, height: p(waterpledgeId, "pillarHeight", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), point = action.targetPosition();
            const radius = Math.max(1.1, p(waterpledgeId, "pillarRadius", action));
            const height = Math.max(2.4, p(waterpledgeId, "pillarHeight", action));
            const power = p(waterpledgeId, "pillar", action);
            const slow = Math.max(40, Math.round(p(waterpledgeId, "slowTicks", action)));
            const push = p(waterpledgeId, "push", action);
            const lift = p(waterpledgeId, "lift", action);
            const markRadius = Math.max(1.0, p(waterpledgeId, "markRadius", action));
            const markTicks = Math.max(60, Math.round(p(waterpledgeId, "markTicks", action)));
            const detect = p(waterpledgeId, "comboDetect", action);
            const comboScale = p(waterpledgeId, "comboScale", action);
            const comboPower = p(waterpledgeId, "comboPower", action);
            const burst = Math.round(p(waterpledgeId, "burst", action));
            const cells = Math.round(p(waterpledgeId, "scarCells", action));
            const cap = Math.max(1, Math.round(p(waterpledgeId, "maxTargets", action)));
            const combo = waterpledgeComboAt(world, point, detect);
            const scale = markRadius / 1.6;
            let hits = 0;

            sound(action, "cobblemon:impact.water");
            WorldFeedback.emit(world, waterpledgeScene, 1, point,
                { moment: "erupt", radius: radius, height: height, count: burst, combo: combo === "" ? 0 : 1 }, 40);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, radius, { below: 0.5, above: height }), function (enemy, facts) {
                if (hits >= cap) return;
                if (world.valid(enemy)) MobEffects.apply(world, enemy, "minecraft:slowness", slow, 0);
                if (!hurt(action, enemy, waterpledgeId, power * (combo === "" ? 1 : comboPower), { damage: damageSpec(waterpledgeId, "pillar") })) return;
                hits++;
                const away = facts.position().minus(action.origin());
                const direction = away.length() > 0.3 ? away : action.direction();
                if (world.valid(enemy)) {
                    world.displace(enemy, WorldCombat.point(direction.x(), 0, direction.z()).unit().scale(push));
                    if (lift > 0) world.motion(enemy, WorldCombat.point(0, lift, 0), true);
                }
                WorldFeedback.emit(world, waterpledgeScene, 1, facts.position(), { moment: "hit", target: String(enemy.ref()), count: 10, scale: scale }, 20);
            });

            WorldEffects.field(world, waterpledgeScar, point, markRadius,
                { element: "water", radius: markRadius, scale: scale }, markTicks);
            waterpledgeGround(world, point, markRadius, markTicks, cells);

            let arena = false;
            if (combo !== "" && !waterpledgeComboExists(world, point, markRadius * comboScale)) {
                arena = true;
                const arenaRadius = markRadius * comboScale;
                WorldEffects.field(world, combo === "rainbow" ? waterpledgeRainbow : waterpledgeWetland, point, arenaRadius,
                    { element: "water", combo: combo, radius: arenaRadius, scale: arenaRadius / 1.6 }, Math.round(markTicks * 1.6));
                WorldFeedback.emit(world, waterpledgeScene, 1, point,
                    { moment: combo === "rainbow" ? "rainbow" : "wetland", radius: arenaRadius, scale: arenaRadius / 1.6, count: 60 }, 46);
                sound(action, combo === "rainbow" ? "minecraft:block.amethyst_block.chime" : "minecraft:block.wet_grass.break");
            }
            WorldFeedback.text(world, point.plus(WorldCombat.point(0, height * 0.55, 0)),
                hits > 0 ? (arena ? waterpledgeComboText : waterpledgeHitText) : waterpledgeMissText,
                hits > 0 ? [arena ? (combo === "rainbow" ? "彩虹" : "湿地") : hits] : [], 30);
            sound(action, "minecraft:item.bucket.empty");
            done(action);
        }
    });
}
