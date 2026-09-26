/**
 * 火之誓约 / firepledge 的出手方式与场地规则。
 *
 * 核心念头：一纸火之誓约被按进地里，火柱从选定点拔地而起，把柱内的敌人烧着；柱脚只留下一圈短寿的
 *   誓约印——它是「这里立过火之誓约」的标记，本身不再持续灼烧。若落点附近已有草或水的誓约印，
 *   两纸誓约彼此应答：这一击更重，并把脚下**同一圈印**当场扩成火海（火＋草）或彩虹（火＋水），
 *   持续灼烧／持续治疗只在真正共鸣时才出现。组合产物取决于另一元素，与原生一致。
 *
 * 三幕：
 *   起（windup，提交前）：落点画出一圈誓约符文，只播预告（可免费打断）。
 *   击（erupt → hit）：提交后火柱拔地而起，柱内每个敌人挨一次 `pillar` 并被点燃；柱脚烙出一圈短印。
 *   留（scar → seaoffire / rainbow）：短印只是共鸣标记；与另一誓约共鸣时，同一印记扩成更广的组合场。
 *
 * 誓约印是真实的 `WorldEffects` 场地效果（规则由本单元注册）。别的誓约单元按同一命名约定读取
 * `world_combat:field/pledge_<元素>`，所以三招可以跨单元共鸣，而不必互相依赖。共鸣不新起一层场：
 * 同一印记被 `WorldEffects.update` 就地扩容并进入组合态，一次施放只触发一次。
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
        const areas = WorldEffects.areas(world);
        for (let i = 0; i < areas.length; i++) {
            if (!areas[i].data || !areas[i].data.combo) continue;
            if (firepledgeAreaPoint(areas[i]).minus(point).length() <= radius + areas[i].radius) return true;
        }
        return false;
    }

    // 誓约印：立誓的标记，本身不持续灼烧；只有火＋草共鸣的火海持续点燃其中的非友方，
    // 火＋水共鸣的彩虹持续为站入的友方回复。表现绑在印记效果自己身上，随其自然到期或提前驱散一起收。
    WorldEffects.fieldRule(firepledgeScar, {
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const combo = field.data.combo;
            if (combo === "seaoffire") {
                if (world.friendly(actor)) return;
                CombatStatus.inflict(world, actor, "burn", Math.max(60, Math.round(Number(field.data.burn) || 100)));
            } else if (combo === "rainbow") {
                if (!world.friendly(actor)) return;
                MobEffects.apply(world, actor, "minecraft:regeneration", 100, 0);
            }
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const combo = field.data.combo;
            const moment = combo === "seaoffire" ? "seaoffire" : combo === "rainbow" ? "rainbow" : "scar";
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_firepledge/pledge", firepledgeScene, 1, firepledgePoint(field),
                { moment: moment, radius: field.radius, scale: field.radius / 1.7,
                    count: Math.round(Number(field.data.marks) || 12) + (combo ? Math.round(field.radius * 6) : 0) });
        }
    });

    define({
        id: firepledgeId,
        cooldownParameter: "recharge",
        name: "火之誓约",
        description: "在选定地面立起一纸火之誓约：火柱拔地而起，烧穿柱内敌人并点燃他们，柱脚留下一圈短寿的誓约印（只作共鸣标记，本身不持续灼烧）。落点附近已有草或水的誓约印时共鸣——这一击更重，同一圈印当场扩成火海（火＋草，持续灼烧其中的敌人）或彩虹（火＋水，持续为站入的友方回复）。",
        uses: ["在远处地面立起火柱", "用一圈短印标出可共鸣的地面", "与草／水誓约连成火海或彩虹"],
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
            const marks = Math.round(p(firepledgeId, "scarCells", action));
            const cap = Math.max(1, Math.round(p(firepledgeId, "maxTargets", action)));
            const combo = firepledgeComboAt(world, point, detect);
            const scale = markRadius / 1.7;
            let hits = 0;

            sound(action, "cobblemon:impact.fire");
            WorldFeedback.emit(world, firepledgeScene, 1, point,
                { moment: "erupt", radius: radius, height: height, count: burst }, 40);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, radius, { below: 0.5, above: height }), function (enemy, facts) {
                if (hits >= cap) return;
                // 伤害被拒绝就不算命中：不点燃、不播命中表现。
                if (!hurt(action, enemy, firepledgeId, power * (combo === "" ? 1 : comboPower), { damage: damageSpec(firepledgeId, "pillar") })) return;
                hits++;
                if (world.valid(enemy)) CombatStatus.inflict(world, enemy, "burn", burn);
                WorldFeedback.emit(world, firepledgeScene, 1, facts.position(), { moment: "hit", target: String(enemy.ref()), count: 10, scale: scale }, 20);
            });

            // 柱脚先留一圈短寿誓约印：共鸣标记，本身不灼烧；贴地焦痕只由粒子表达。
            const brand = WorldEffects.field(world, firepledgeScar, point, markRadius,
                { element: "fire", burn: burn, radius: markRadius, scale: scale, marks: marks }, markTicks);

            // 与另一誓约共鸣：把同一圈印就地扩成组合场并延长；一次施放只触发一次，已有组合场不再叠。
            let arena = false;
            if (combo !== "" && !firepledgeComboExists(world, point, markRadius * comboScale)) {
                arena = true;
                const arenaRadius = markRadius * comboScale;
                WorldEffects.update(world, brand, {
                    data: { combo: combo, burn: Math.max(burn, 100), radius: arenaRadius, scale: arenaRadius / 1.7, marks: marks },
                    radius: arenaRadius, ticks: Math.round(markTicks * 1.6)
                });
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
