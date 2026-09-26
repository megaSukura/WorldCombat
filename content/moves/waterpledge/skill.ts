/**
 * 水之誓约 / waterpledge 的出手方式与场地规则。
 *
 * 核心念头：一纸水之誓约被按进地里，水柱从选定点涌地而起，浇透柱内的敌人、把他们沿水势推开顶起；
 *   柱脚只留下一圈短寿的誓约印——它是「这里立过水之誓约」的标记，本身不再拖慢。若落点附近已有火或草的
 *   誓约印，两纸誓约彼此应答：这一击更重，并把脚下**同一圈印**当场挂起彩虹（水＋火，持续为友方回复）
 *   或塌成湿地（水＋草，持续陷住／拖慢）——持续效果只在真正共鸣时才出现，组合产物取决于另一元素，与原生一致。
 *   湿地的控制走可被原生拒绝的尝试，拒绝过的对象不再每次扫描重挂 rooted。
 *
 * 三幕：
 *   起（windup，提交前）：落点浮出一圈水纹符文，只播预告（可免费打断）。
 *   击（erupt → hit）：提交后水柱涌起，柱内每个敌人挨一次 `pillar`、被推开顶起；柱脚浸出一圈短印。
 *   留（scar → rainbow / wetland）：短印只是共鸣标记；与另一誓约共鸣时，同一印记换成组合场。
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

    /** 附近已有任何组合场就不再叠一层；组合是这一击的收束，不是堆叠物。 */
    function waterpledgeComboExists(world: CombatWorld, point: CombatPoint, radius: number): boolean {
        const areas = WorldEffects.areas(world);
        for (let i = 0; i < areas.length; i++) {
            if (!areas[i].data || !areas[i].data.combo) continue;
            if (waterpledgeAreaPoint(areas[i]).minus(point).length() <= radius + areas[i].radius) return true;
        }
        return false;
    }

    /** 一次可被原生拒绝的控制尝试：rooted 没落地就记进 refused，之后不再重复挂；拖慢照常。 */
    function waterpledgeRoot(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, rootTicks: number, slowTicks: number): boolean {
        const refused = field.data.refused || (field.data.refused = {});
        const ref = String(actor.ref());
        let rooted = false;
        if (!refused[ref]) {
            const id = WorldEffects.apply(world, actor, "rooted", {}, rootTicks);
            rooted = id > 0 && world.effects(actor, "world_combat:rooted").length > 0;
            if (!rooted) refused[ref] = 1;
        }
        MobEffects.apply(world, actor, "minecraft:slowness", slowTicks, 1);
        return rooted;
    }

    // 誓约印：立誓的标记，本身不拖慢；只有水＋火共鸣的彩虹持续为友方回复、水＋草共鸣的湿地持续陷住／拖慢。
    WorldEffects.fieldRule(waterpledgeScar, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (field.data.combo !== "wetland" || world.friendly(actor)) return;
            waterpledgeRoot(world, actor, field, Math.max(16, Math.round(Number(field.data.root) || 30)), Math.max(40, Math.round(Number(field.data.slow) || 60)));
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const combo = field.data.combo;
            if (combo === "rainbow") {
                if (!world.friendly(actor)) return;
                MobEffects.apply(world, actor, "minecraft:regeneration", 100, 0);
            } else if (combo === "wetland") {
                if (world.friendly(actor)) return;
                MobEffects.apply(world, actor, "minecraft:slowness", Math.max(40, Math.round(Number(field.data.slow) || 60)), 1);
            }
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const combo = field.data.combo;
            const moment = combo === "rainbow" ? "rainbow" : combo === "wetland" ? "wetland" : "scar";
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_waterpledge/pledge", waterpledgeScene, 1, waterpledgePoint(field),
                { moment: moment, radius: field.radius, scale: field.radius / 1.6,
                    count: Math.round(Number(field.data.marks) || 10) + (combo ? Math.round(field.radius * 6) : 0) });
        }
    });

    define({
        id: waterpledgeId,
        cooldownParameter: "recharge",
        name: "水之誓约",
        description: "在选定地面立起一纸水之誓约：水柱涌地而起，把柱内敌人推开顶起，柱脚留下一圈短寿的誓约印（只作共鸣标记，本身不拖慢）。落点附近已有火或草的誓约印时共鸣——这一击更重，同一圈印当场挂起彩虹（水＋火，持续为站入的友方回复）或塌成湿地（水＋草，踩进去会被陷住并重度拖慢；对控制免疫的目标只留拖慢）。",
        uses: ["在远处地面立起水柱并推开敌人", "用一圈短印标出可共鸣的地面", "与火／草誓约连成彩虹或湿地"],
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
            const push = p(waterpledgeId, "push", action);
            const lift = p(waterpledgeId, "lift", action);
            const markRadius = Math.max(1.0, p(waterpledgeId, "markRadius", action));
            const markTicks = Math.max(60, Math.round(p(waterpledgeId, "markTicks", action)));
            const detect = p(waterpledgeId, "comboDetect", action);
            const comboScale = p(waterpledgeId, "comboScale", action);
            const comboPower = p(waterpledgeId, "comboPower", action);
            const slow = Math.max(40, Math.round(p(waterpledgeId, "slowTicks", action)));
            const burst = Math.round(p(waterpledgeId, "burst", action));
            const marks = Math.round(p(waterpledgeId, "scarCells", action));
            const cap = Math.max(1, Math.round(p(waterpledgeId, "maxTargets", action)));
            const combo = waterpledgeComboAt(world, point, detect);
            const scale = markRadius / 1.6;
            let hits = 0;

            sound(action, "cobblemon:impact.water");
            WorldFeedback.emit(world, waterpledgeScene, 1, point,
                { moment: "erupt", radius: radius, height: height, count: burst }, 40);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, radius, { below: 0.5, above: height }), function (enemy, facts) {
                if (hits >= cap) return;
                // 伤害被拒绝就不算命中：不推开、不播命中表现。
                if (!hurt(action, enemy, waterpledgeId, power * (combo === "" ? 1 : comboPower), { damage: damageSpec(waterpledgeId, "pillar") })) return;
                hits++;
                const away = facts.position().minus(action.origin());
                const direction = away.length() > 0.3 ? away : action.direction();
                if (world.valid(enemy)) {
                    world.hitDisplace(enemy, WorldCombat.point(direction.x(), 0, direction.z()).unit().scale(push));
                    if (lift > 0) world.hitImpulse(enemy, WorldCombat.point(0, lift, 0));
                }
                WorldFeedback.emit(world, waterpledgeScene, 1, facts.position(), { moment: "hit", target: String(enemy.ref()), count: 10, scale: scale }, 20);
            });

            // 柱脚先留一圈短寿誓约印：共鸣标记，本身不拖慢；贴地水痕只由粒子表达。
            const brand = WorldEffects.field(world, waterpledgeScar, point, markRadius,
                { element: "water", radius: markRadius, scale: scale, marks: marks, root: 30, slow: slow }, markTicks);

            // 与另一誓约共鸣：把同一圈印就地换成组合场并延长；一次施放只触发一次，已有组合场不再叠。
            let arena = false;
            if (combo !== "" && !waterpledgeComboExists(world, point, markRadius * comboScale)) {
                arena = true;
                const arenaRadius = markRadius * comboScale;
                WorldEffects.update(world, brand, {
                    data: { combo: combo, radius: arenaRadius, scale: arenaRadius / 1.6, marks: marks, root: 30, slow: Math.max(slow, 60) },
                    radius: arenaRadius, ticks: Math.round(markTicks * 1.6)
                });
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
