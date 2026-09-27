/**
 * 草之誓约 / grasspledge 的出手方式与场地规则。
 *
 * 核心念头：一纸草之誓约被按进地里，草柱连藤带叶从选定点下方的真实地面炸土而出，缠住柱内的敌人；柱脚只留下
 *   一圈短寿的誓约印——它是「这里立过草之誓约」的标记，本身不再拖慢。若落点附近已有同阵营、尚未参与过组合的
 *   火或水誓约印，两纸誓约彼此应答：这一击更重，把参与的那圈印消费掉，脚下的草印当场扩成火海（草＋火）或
 *   湿地（草＋水）。湿地以触地者入场生效并尊重控制拒绝，拒绝过的对象只留拖慢、不再重挂 root。
 *
 * 三幕：
 *   起（windup，提交前）：落点画出一圈藤纹符文，只播预告（可免费打断）。
 *   击（erupt → hit）：提交后草柱从真实地面炸土而出，柱内每个敌人挨一次 `pillar` 并做一次短控尝试；
 *       根须只围绕真正被缠住的命中者脚部，拒绝时只落叶。
 *   留（scar → seaoffire / wetland）：短印只是共鸣标记；与另一誓约共鸣时，同一印记扩成更广的组合场。
 */
namespace PokemonSkills {
    function grasspledgePoint(field: WorldEffects.Field): CombatPoint {
        return WorldCombat.point(field.position[0], field.position[1], field.position[2]);
    }
    function grasspledgeAreaPoint(area: WorldEffects.Area): CombatPoint {
        return WorldCombat.point(area.position[0], area.position[1], area.position[2]);
    }

    /** 另一元素誓约印对应的组合产物：火 → 火海，水 → 湿地；都不是则空串。 */
    export function grasspledgeComboKind(rule: string): string {
        return rule === "world_combat:field/pledge_fire" ? "seaoffire"
            : rule === "world_combat:field/pledge_water" ? "wetland" : "";
    }

    /**
     * 落点真正能共鸣的另一元素誓约印：存活、同阵营、未被组合消费、留有余时，且从落点到印之间有真实通路
     * （隔墙不误触）。取最近的一个，没有则返回 null。
     */
    export function grasspledgeResonance(world: CombatWorld, caster: CombatActor, point: CombatPoint, detect: number): WorldEffects.Area | null {
        const rules: string[] = ["world_combat:field/pledge_fire", "world_combat:field/pledge_water"];
        let best: WorldEffects.Area | null = null, bestDistance = detect;
        for (let i = 0; i < rules.length; i++) {
            const areas = WorldEffects.areas(world, rules[i]);
            for (let j = 0; j < areas.length; j++) {
                const area = areas[j];
                if (area.pending || (area.data && area.data.combo) || !(area.remaining > 0)) continue;
                const owner = world.actor(area.source);
                if (!owner) continue;
                if (String(owner.ref()) !== String(caster.ref()) && !world.allied(caster, owner)) continue;
                const centre = grasspledgeAreaPoint(area);
                const distance = centre.minus(point).length();
                if (distance > bestDistance) continue;
                if (!world.clear(point.plus(WorldCombat.point(0, 0.25, 0)), centre.plus(WorldCombat.point(0, 0.25, 0)))) continue;
                bestDistance = distance; best = area;
            }
        }
        return best;
    }

    /** 附近已有任何组合场就不再叠一层；组合是这一击的收束，不是堆叠物。 */
    function grasspledgeComboExists(world: CombatWorld, point: CombatPoint, radius: number): boolean {
        const areas = WorldEffects.areas(world);
        for (let i = 0; i < areas.length; i++) {
            if (!areas[i].data || !areas[i].data.combo) continue;
            if (grasspledgeAreaPoint(areas[i]).minus(point).length() <= radius + areas[i].radius) return true;
        }
        return false;
    }

    /** 柱体贴真实支撑：落点先投到下方可达地面，柱顶撞到真实方块就停在接触面，不悬空、不穿墙。 */
    function grasspledgeColumn(world: CombatWorld, point: CombatPoint, radius: number, height: number): {
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
    function grasspledgeRoot(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, rootTicks: number, slowTicks: number, grounded: boolean): boolean {
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

    // 誓约印：立誓的标记，本身不拖慢；只有草＋火共鸣的火海持续点燃、草＋水共鸣的湿地持续陷住／拖慢。
    WorldEffects.fieldRule(grasspledgeScar, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (field.data.combo !== "wetland" || world.friendly(actor)) return;
            const body = world.observe(actor);
            grasspledgeRoot(world, actor, field, Math.max(16, Math.round(Number(field.data.root) || 30)),
                Math.max(40, Math.round(Number(field.data.slow) || 60)), !!(body && body.grounded()));
        },
        stay: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            const combo = field.data.combo;
            if (combo === "seaoffire") {
                if (world.friendly(actor)) return;
                CombatStatus.inflict(world, actor, "burn", Math.max(60, Math.round(Number(field.data.burn) || 100)));
            } else if (combo === "wetland") {
                if (world.friendly(actor)) return;
                MobEffects.apply(world, actor, "minecraft:slowness", Math.max(40, Math.round(Number(field.data.slow) || 60)), 1);
            }
        },
        scan: function (effect: CombatEffect, world: CombatWorld, field: WorldEffects.Field): void {
            const combo = field.data.combo;
            const moment = combo === "seaoffire" ? "seaoffire" : combo === "wetland" ? "wetland" : "scar";
            const radius = field.radius, scale = radius / 1.8;
            const remaining = Math.max(0, Number(field.remaining) || 0);
            const life = Math.max(1, Math.round(Number(field.data.life) || remaining || 1));
            const count = Math.round(Number(field.data.marks) || 12) + (combo ? Math.round(radius * 6) : 0);
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_grasspledge/pledge", grasspledgeScene, 1, grasspledgePoint(field),
                { moment: moment, radius: radius, scale: scale, count: count, remaining: remaining, life: life });
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_grasspledge/field", grasspledgeFieldScene, 1, grasspledgePoint(field),
                { moment: moment, radius: radius, scale: scale, remaining: remaining, life: life });
        }
    });

    define({
        id: grasspledgeId,
        cooldownParameter: "recharge",
        name: "草之誓约",
        description: "在选定地面升起草柱，伤害并缠住敌人，留下草之誓约印。附近友方的火之誓约可与它化为灼烧敌人的火海，水之誓约则形成困住并拖慢敌人的湿地。参与组合的誓约印会被消耗。",
        uses: ["在远处地面立起草柱并做一次短控尝试", "用一圈短印标出可共鸣的地面", "与火／水誓约连成火海或湿地"],
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
            const ground = WorldGeometry.ground(action.sense(), action.targetPosition(), 6);
            action.present("world_combat:move_grasspledge:mark", grasspledgeScene, 1, ground,
                JSON.stringify({ moment: "mark", radius: mark, scale: mark / 1.8, height: p(grasspledgeId, "pillarHeight", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor(), point = action.targetPosition();
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
            const marks = Math.round(p(grasspledgeId, "scarCells", action));
            const cap = Math.max(1, Math.round(p(grasspledgeId, "maxTargets", action)));
            // 柱击贴有效支撑：落点先投到真实地面，柱顶被上方方块截断。
            const column = grasspledgeColumn(world, point, radius, height);
            const base = column.anchor;
            const reachHeight = Math.max(0.5, column.top.y() - base.y());
            const resonance = grasspledgeResonance(world, actor, base, detect);
            const combo = resonance ? grasspledgeComboKind(resonance.rule) : "";
            const resonant = combo !== "" && !grasspledgeComboExists(world, base, markRadius * comboScale);
            const scale = markRadius / 1.8;
            const start = world.tick();
            let hits = 0;

            sound(action, "cobblemon:impact.grass");
            WorldFeedback.emit(world, grasspledgeScene, 1, base,
                { moment: "erupt", radius: radius, height: reachHeight, count: burst }, 40);
            // 草柱主体：真正盘绕上升的藤体，读真实柱半径与高度。
            WorldFeedback.emit(world, grasspledgeVineScene, 1, base,
                { moment: "vine", radius: radius, height: reachHeight, count: burst, start: start, duration: 26 }, 28);

            WorldGeometry.selectBodies(world, WorldGeometry.bodyPolygon(column.vertices, base.y(), column.top.y()), function (enemy, facts) {
                if (hits >= cap || facts.friendly()) return;
                // 伤害被拒绝就不算命中：不做控制尝试、不播命中表现。
                if (!hurt(action, enemy, grasspledgeId, power * (resonant ? comboPower : 1), { damage: damageSpec(grasspledgeId, "pillar") })) return;
                hits++;
                let rooted = false;
                if (world.valid(enemy)) {
                    MobEffects.apply(world, enemy, "minecraft:slowness", slow, 1);
                    rooted = WorldEffects.apply(world, enemy, "rooted", {}, root) > 0 && world.effects(enemy, "world_combat:rooted").length > 0;
                }
                WorldFeedback.emit(world, grasspledgeScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), count: 10, scale: scale, binding: rooted ? 9 : 0 }, 20);
                // 根须只围绕真正被缠住的命中者脚部；拒绝时这个场景只落几片叶子。
                WorldFeedback.emit(world, grasspledgeRootScene, 1, facts.position(),
                    { moment: "bind", target: String(enemy.ref()), binding: rooted ? 1 : 0, count: rooted ? 6 : 3, start: start, duration: 20 }, 22);
            });

            // 柱脚先留一圈短寿誓约印：共鸣标记，本身不拖慢；贴地盘根只由粒子表达。
            const brand = WorldEffects.field(world, grasspledgeScar, base, markRadius,
                { element: "grass", burn: 60, radius: markRadius, scale: scale, marks: marks, root: root, slow: slow, life: markTicks }, markTicks);

            // 与另一誓约共鸣：把同一圈印就地扩成组合场并延长，同时消费参与的那枚印。
            let arena = false;
            if (resonant && resonance) {
                arena = true;
                const arenaRadius = markRadius * comboScale;
                const arenaTicks = Math.round(markTicks * 1.6);
                WorldEffects.update(world, brand, {
                    data: { combo: combo, burn: 100, radius: arenaRadius, scale: arenaRadius / 1.8, marks: marks, root: root, slow: Math.max(slow, 60), life: arenaTicks },
                    radius: arenaRadius, ticks: arenaTicks
                });
                world.operation(resonance.id, "world_combat:dispel", "{}");
                WorldFeedback.emit(world, grasspledgeScene, 1, base,
                    { moment: combo === "seaoffire" ? "seaoffire" : "wetland", radius: arenaRadius, scale: arenaRadius / 1.8, count: 60 }, 46);
                sound(action, combo === "seaoffire" ? "minecraft:block.fire.ambient" : "minecraft:block.wet_grass.break");
            }
            WorldFeedback.text(world, base.plus(WorldCombat.point(0, reachHeight * 0.55, 0)),
                hits > 0 ? (arena ? grasspledgeComboText : grasspledgeHitText) : grasspledgeMissText,
                hits > 0 ? [arena ? (combo === "seaoffire" ? "火海" : "湿地") : hits] : [], 30);
            sound(action, "minecraft:block.moss.break");
            done(action);
        }
    });
}
