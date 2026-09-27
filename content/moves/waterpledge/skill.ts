/**
 * 水之誓约 / waterpledge 的出手方式与场地规则。
 *
 * 核心念头：一纸水之誓约被按进地里，水柱从选定点下方的真实地面涌地而起，浇透柱内的敌人、把他们沿柱心径向
 *   推开顶起；柱脚只留下一圈短寿的誓约印——它是「这里立过水之誓约」的标记，本身不再拖慢。若落点附近已有
 *   同阵营、尚未参与过组合的火或草誓约印，两纸誓约彼此应答：这一击更重，把参与的那圈印消费掉，脚下的水印
 *   当场挂起彩虹（水＋火，持续为友方回复）或塌成湿地（水＋草，持续陷住／拖慢）。湿地控制走可被原生拒绝的
 *   尝试，只对真正触地者尝试根须、拒绝过的对象不再重挂 rooted，拖慢则照常。
 *
 * 三幕：
 *   起（windup，提交前）：落点浮出一圈水纹符文，只播预告（可免费打断）。
 *   击（erupt → hit）：提交后水柱从真实地面涌起，柱内每个敌人挨一次 `pillar`、被推开顶起；柱脚浸出一圈短印。
 *   留（scar → rainbow / wetland）：短印只是共鸣标记；与另一誓约共鸣时，同一印记换成组合场。
 */
namespace PokemonSkills {
    function waterpledgePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function waterpledgeAreaPoint(area: WorldEffects.Area): CombatPoint {
        return WorldCombat.point(area.position[0], area.position[1], area.position[2]);
    }

    /** 另一元素誓约印对应的组合产物：火 → 彩虹，草 → 湿地；都不是则空串。 */
    export function waterpledgeComboKind(rule: string): string {
        return rule === "world_combat:field/pledge_fire" ? "rainbow"
            : rule === "world_combat:field/pledge_grass" ? "wetland" : "";
    }

    /**
     * 落点真正能共鸣的另一元素誓约印：存活、同阵营、未被组合消费、留有余时，且从落点到印之间有真实通路
     * （隔墙不误触）。取最近的一个，没有则返回 null。
     */
    export function waterpledgeResonance(world: CombatWorld, caster: CombatActor, point: CombatPoint, detect: number): WorldEffects.Area | null {
        const rules: string[] = ["world_combat:field/pledge_fire", "world_combat:field/pledge_grass"];
        let best: WorldEffects.Area | null = null, bestDistance = detect;
        for (let i = 0; i < rules.length; i++) {
            const areas = WorldEffects.areas(world, rules[i]);
            for (let j = 0; j < areas.length; j++) {
                const area = areas[j];
                if (area.pending || (area.data && area.data.combo) || !(area.remaining > 0)) continue;
                const owner = world.actor(area.source);
                if (!owner) continue;
                if (String(owner.ref()) !== String(caster.ref()) && !world.allied(caster, owner)) continue;
                const centre = waterpledgeAreaPoint(area);
                const distance = centre.minus(point).length();
                if (distance > bestDistance) continue;
                if (!world.clear(point.plus(WorldCombat.point(0, 0.25, 0)), centre.plus(WorldCombat.point(0, 0.25, 0)))) continue;
                bestDistance = distance; best = area;
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

    /** 柱体贴真实支撑：落点先投到下方可达地面，柱顶撞到真实方块就停在接触面，不穿墙。 */
    function waterpledgeColumn(world: CombatWorld, point: CombatPoint, radius: number, height: number): {
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

    /** 一次可被原生拒绝的控制尝试：只有真正触地者才尝试根须，拒绝后记账不再重挂；拖慢照常。 */
    function waterpledgeRoot(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, rootTicks: number, slowTicks: number, grounded: boolean): boolean {
        const refused = field.data.refused || (field.data.refused = {});
        const ref = String(actor.ref());
        let rooted = false;
        if (grounded && !refused[ref]) {
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
            const body = world.observe(actor);
            waterpledgeRoot(world, actor, field, Math.max(16, Math.round(Number(field.data.root) || 30)),
                Math.max(40, Math.round(Number(field.data.slow) || 60)), !!(body && body.grounded()));
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
            const radius = field.radius, scale = radius / 1.6;
            const remaining = Math.max(0, Number(field.remaining) || 0);
            const life = Math.max(1, Math.round(Number(field.data.life) || remaining || 1));
            const count = Math.round(Number(field.data.marks) || 10) + (combo ? Math.round(radius * 6) : 0);
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_waterpledge/pledge", waterpledgeScene, 1, waterpledgePoint(field),
                { moment: moment, radius: radius, scale: scale, count: count, remaining: remaining, life: life });
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_waterpledge/field", waterpledgeFieldScene, 1, waterpledgePoint(field),
                { moment: moment, radius: radius, scale: scale, remaining: remaining, life: life });
            if (combo === "rainbow")
                WorldFeedback.onEffect(world, effect.id(), "world_combat:move_waterpledge/crown", waterpledgeCrownScene, 1, waterpledgePoint(field),
                    { radius: radius, remaining: remaining, life: life });
        }
    });

    define({
        id: waterpledgeId,
        cooldownParameter: "recharge",
        name: "水之誓约",
        description: "在选定地面立起一纸水之誓约：水柱从真实地面涌地而起，把柱内敌人沿离柱心方向推开顶起，柱脚留下一圈短寿的誓约印（只作共鸣标记，本身不拖慢）。落点附近已有同阵营、尚未参与过组合的火或草誓约印时共鸣——这一击更重，把参与的那枚印消费掉，同一圈印当场挂起彩虹（水＋火，持续为站入的友方回复）或塌成湿地（水＋草，踩进去会被陷住并重度拖慢；对控制免疫的目标只留拖慢）。",
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
            const ground = WorldGeometry.ground(action.sense(), action.targetPosition(), 6);
            action.present("world_combat:move_waterpledge:mark", waterpledgeScene, 1, ground,
                JSON.stringify({ moment: "mark", radius: mark, scale: mark / 1.6, height: p(waterpledgeId, "pillarHeight", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), point = action.targetPosition();
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
            // 柱击贴有效支撑：落点先投到真实地面，柱顶被上方方块截断。
            const column = waterpledgeColumn(world, point, radius, height);
            const base = column.anchor;
            const reachHeight = Math.max(0.5, column.top.y() - base.y());
            const resonance = waterpledgeResonance(world, actor, base, detect);
            const combo = resonance ? waterpledgeComboKind(resonance.rule) : "";
            const resonant = combo !== "" && !waterpledgeComboExists(world, base, markRadius * comboScale);
            const scale = markRadius / 1.6;
            let hits = 0;

            sound(action, "cobblemon:impact.water");
            WorldFeedback.emit(world, waterpledgeScene, 1, base,
                { moment: "erupt", radius: radius, height: reachHeight, count: burst }, 40);

            WorldGeometry.selectBodies(world, WorldGeometry.bodyPolygon(column.vertices, base.y(), column.top.y()), function (enemy, facts) {
                if (hits >= cap || facts.friendly()) return;
                // 伤害被拒绝就不算命中：不推开、不播命中表现。
                if (!hurt(action, enemy, waterpledgeId, power * (resonant ? comboPower : 1), { damage: damageSpec(waterpledgeId, "pillar") })) return;
                hits++;
                // 按柱心径向推离；目标站在柱心正上方时水平零向量回退到瞄准方向。
                const at = facts.position();
                const away = WorldCombat.point(at.x() - base.x(), 0, at.z() - base.z());
                const direction = WorldGeometry.flatUnit(away, action.direction());
                if (world.valid(enemy)) {
                    world.hitDisplace(enemy, direction.scale(push));
                    if (lift > 0) world.hitImpulse(enemy, WorldCombat.point(0, lift, 0));
                }
                WorldFeedback.emit(world, waterpledgeScene, 1, at,
                    { moment: "hit", target: String(enemy.ref()), count: 10, scale: scale, push: push,
                        direction: [direction.x(), direction.y(), direction.z()] }, 20);
            });

            // 柱脚先留一圈短寿誓约印：共鸣标记，本身不拖慢；贴地水痕只由粒子表达。
            const brand = WorldEffects.field(world, waterpledgeScar, base, markRadius,
                { element: "water", radius: markRadius, scale: scale, marks: marks, root: 30, slow: slow, life: markTicks }, markTicks);

            // 与另一誓约共鸣：把同一圈印就地换成组合场并延长，同时消费参与的那枚印。
            let arena = false;
            if (resonant && resonance) {
                arena = true;
                const arenaRadius = markRadius * comboScale;
                const arenaTicks = Math.round(markTicks * 1.6);
                WorldEffects.update(world, brand, {
                    data: { combo: combo, radius: arenaRadius, scale: arenaRadius / 1.6, marks: marks, root: 30, slow: Math.max(slow, 60), life: arenaTicks },
                    radius: arenaRadius, ticks: arenaTicks
                });
                world.operation(resonance.id, "world_combat:dispel", "{}");
                WorldFeedback.emit(world, waterpledgeScene, 1, base,
                    { moment: combo === "rainbow" ? "rainbow" : "wetland", radius: arenaRadius, scale: arenaRadius / 1.6, count: 60 }, 46);
                sound(action, combo === "rainbow" ? "minecraft:block.amethyst_block.chime" : "minecraft:block.wet_grass.break");
            }
            WorldFeedback.text(world, base.plus(WorldCombat.point(0, reachHeight * 0.55, 0)),
                hits > 0 ? (arena ? waterpledgeComboText : waterpledgeHitText) : waterpledgeMissText,
                hits > 0 ? [arena ? (combo === "rainbow" ? "彩虹" : "湿地") : hits] : [], 30);
            sound(action, "minecraft:item.bucket.empty");
            done(action);
        }
    });
}
