/**
 * 火之誓约 / firepledge 的出手方式与场地规则。
 *
 * 核心念头：一纸火之誓约被按进地里，火柱从选定点下方的真实地面拔地而起，把柱内敌人烧着；柱脚只留下一圈
 *   短寿的誓约印——它是「这里立过火之誓约」的标记，本身不再持续灼烧。若落点附近已有同阵营、尚未参与过组合的
 *   草或水誓约印，两纸誓约彼此应答：这一击更重，把参与的那圈印消费掉，脚下的火印当场扩成火海（火＋草）
 *   或彩虹（火＋水）。持续灼烧／治疗只在真正共鸣时出现，组合产物取决于另一元素。
 *
 * 三幕：
 *   起（windup，提交前）：落点画出一圈誓约符文，只播预告（可免费打断）。
 *   击（erupt → hit）：提交后火柱从真实地面升起，柱内每个敌人挨一次 `pillar` 并被点燃；柱脚烙出一圈短印。
 *   留（scar → seaoffire / rainbow）：短印只是共鸣标记；与另一誓约共鸣时，同一印记扩成更广的组合场。
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

    /** 另一元素誓约印对应的组合产物：草 → 火海，水 → 彩虹；都不是则空串。 */
    export function firepledgeComboKind(rule: string): string {
        return rule === "world_combat:field/pledge_grass" ? "seaoffire"
            : rule === "world_combat:field/pledge_water" ? "rainbow" : "";
    }

    /**
     * 落点真正能共鸣的另一元素誓约印：存活、同阵营、未被组合消费、留有余时，且从落点到印之间有真实通路
     * （隔墙不误触）。取最近的一个，没有则返回 null。
     */
    export function firepledgeResonance(world: CombatWorld, caster: CombatActor, point: CombatPoint, detect: number): WorldEffects.Area | null {
        const rules: string[] = ["world_combat:field/pledge_grass", "world_combat:field/pledge_water"];
        let best: WorldEffects.Area | null = null, bestDistance = detect;
        for (let i = 0; i < rules.length; i++) {
            const areas = WorldEffects.areas(world, rules[i]);
            for (let j = 0; j < areas.length; j++) {
                const area = areas[j];
                if (area.pending || (area.data && area.data.combo) || !(area.remaining > 0)) continue;
                const owner = world.actor(area.source);
                if (!owner) continue;
                if (String(owner.ref()) !== String(caster.ref()) && !world.allied(caster, owner)) continue;
                const centre = firepledgeAreaPoint(area);
                const distance = centre.minus(point).length();
                if (distance > bestDistance) continue;
                if (!world.clear(point.plus(WorldCombat.point(0, 0.25, 0)), centre.plus(WorldCombat.point(0, 0.25, 0)))) continue;
                bestDistance = distance; best = area;
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

    /**
     * 柱体贴真实支撑：先把落点投到下方可达的地面，火柱只在这段地面到柱顶之间升起；上方若撞到真实方块
     * （天花板、屋檐）就停在接触面，不会穿墙继续。返回判定用的多边形柱体与画面共用的地面／高度。
     */
    function firepledgeColumn(world: CombatWorld, point: CombatPoint, radius: number, height: number): {
        anchor: CombatPoint; top: CombatPoint; vertices: CombatPoint[]; } {
        const anchor = WorldGeometry.ground(world, point, Math.max(6, Math.ceil(height)));
        const wanted = anchor.plus(WorldCombat.point(0, height, 0));
        const ceiling = WorldGeometry.blockHit(world, anchor.plus(WorldCombat.point(0, 0.05, 0)), wanted);
        const contact = ceiling ? ceiling.position() : wanted;
        const top = WorldCombat.point(contact.x(), Math.max(anchor.y() + 0.4, contact.y()), contact.z());
        const vertices: CombatPoint[] = [];
        const sides = 12;
        for (let i = 0; i < sides; i++) {
            const angle = i * Math.PI * 2 / sides;
            vertices.push(WorldCombat.point(anchor.x() + Math.cos(angle) * radius, anchor.y(), anchor.z() + Math.sin(angle) * radius));
        }
        return { anchor: anchor, top: top, vertices: vertices };
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
            const radius = field.radius, scale = radius / 1.7;
            const remaining = Math.max(0, Number(field.remaining) || 0);
            const life = Math.max(1, Math.round(Number(field.data.life) || remaining || 1));
            const count = Math.round(Number(field.data.marks) || 12) + (combo ? Math.round(radius * 6) : 0);
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_firepledge/pledge", firepledgeScene, 1, firepledgePoint(field),
                { moment: moment, radius: radius, scale: scale, count: count, remaining: remaining, life: life });
            // 印记／组合的真实边界与剩余绑在同一场地效果上，场地结束或被消费时一起收。
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_firepledge/field", firepledgeFieldScene, 1, firepledgePoint(field),
                { moment: moment, radius: radius, scale: scale, remaining: remaining, life: life });
            if (combo === "rainbow")
                WorldFeedback.onEffect(world, effect.id(), "world_combat:move_firepledge/crown", firepledgeCrownScene, 1, firepledgePoint(field),
                    { radius: radius, remaining: remaining, life: life });
        }
    });

    define({
        id: firepledgeId,
        cooldownParameter: "recharge",
        name: "火之誓约",
        description: "在选定地面升起火柱并留下火之誓约印。附近友方的草之誓约可与它化为灼烧敌人的火海，水之誓约则形成治疗友方的彩虹。参与组合的誓约印会被消耗。",
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
            const ground = WorldGeometry.ground(action.sense(), action.targetPosition(), 6);
            action.present("world_combat:move_firepledge:mark", firepledgeScene, 1, ground,
                JSON.stringify({ moment: "mark", radius: mark, scale: mark / 1.7, height: p(firepledgeId, "pillarHeight", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), point = action.targetPosition();
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
            // 柱击贴有效支撑：落点先投到真实地面，柱顶被上方方块截断。
            const column = firepledgeColumn(world, point, radius, height);
            const base = column.anchor;
            const reachHeight = Math.max(0.5, column.top.y() - base.y());
            const resonance = firepledgeResonance(world, actor, base, detect);
            const combo = resonance ? firepledgeComboKind(resonance.rule) : "";
            // 组合已存在时不借旧印重复增幅，也不消费。
            const resonant = combo !== "" && !firepledgeComboExists(world, base, markRadius * comboScale);
            const scale = markRadius / 1.7;
            let hits = 0;

            sound(action, "cobblemon:impact.fire");
            WorldFeedback.emit(world, firepledgeScene, 1, base,
                { moment: "erupt", radius: radius, height: reachHeight, count: burst }, 40);

            WorldGeometry.selectBodies(world, WorldGeometry.bodyPolygon(column.vertices, base.y(), column.top.y()), function (enemy, facts) {
                if (hits >= cap || facts.friendly()) return;
                // 伤害被拒绝就不算命中：不点燃、不播命中表现。
                if (!hurt(action, enemy, firepledgeId, power * (resonant ? comboPower : 1), { damage: damageSpec(firepledgeId, "pillar") })) return;
                hits++;
                if (world.valid(enemy)) CombatStatus.inflict(world, enemy, "burn", burn);
                WorldFeedback.emit(world, firepledgeScene, 1, facts.position(), { moment: "hit", target: String(enemy.ref()), count: 10, scale: scale }, 20);
            });

            // 柱脚先留一圈短寿誓约印：共鸣标记，本身不灼烧；贴地焦痕只由粒子表达。
            const brand = WorldEffects.field(world, firepledgeScar, base, markRadius,
                { element: "fire", burn: burn, radius: markRadius, scale: scale, marks: marks, life: markTicks }, markTicks);

            // 与另一誓约共鸣：把同一圈印就地扩成组合场并延长，同时消费参与的那枚印。
            let arena = false;
            if (resonant && resonance) {
                arena = true;
                const arenaRadius = markRadius * comboScale;
                const arenaTicks = Math.round(markTicks * 1.6);
                WorldEffects.update(world, brand, {
                    data: { combo: combo, burn: Math.max(burn, 100), radius: arenaRadius, scale: arenaRadius / 1.7, marks: marks, life: arenaTicks },
                    radius: arenaRadius, ticks: arenaTicks
                });
                world.operation(resonance.id, "world_combat:dispel", "{}");
                WorldFeedback.emit(world, firepledgeScene, 1, base,
                    { moment: combo === "seaoffire" ? "seaoffire" : "rainbow", radius: arenaRadius, scale: arenaRadius / 1.7, count: 60 }, 46);
                sound(action, combo === "seaoffire" ? "minecraft:block.fire.ambient" : "minecraft:block.amethyst_block.chime");
            }
            WorldFeedback.text(world, base.plus(WorldCombat.point(0, reachHeight * 0.55, 0)),
                hits > 0 ? (arena ? firepledgeComboText : firepledgeHitText) : firepledgeMissText,
                hits > 0 ? [arena ? (combo === "seaoffire" ? "火海" : "彩虹") : hits] : [], 30);
            sound(action, "minecraft:block.fire.extinguish");
            done(action);
        }
    });
}
