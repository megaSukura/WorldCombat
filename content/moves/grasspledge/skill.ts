/**
 * 草之誓约 / grasspledge 的出手方式与场地规则。
 *
 * 核心念头：一纸草之誓约被按进地里，草柱连藤带叶从选定点炸土而出，缠住柱内的敌人；柱脚只留下一圈短寿的
 *   誓约印——它是「这里立过草之誓约」的标记，本身不再拖慢。若落点附近已有火或水的誓约印，两纸誓约彼此应答：
 *   这一击更重，并把脚下**同一圈印**当场扩成火海（草＋火，持续点燃）或湿地（草＋水，持续陷住／拖慢）——
 *   持续控制只在真正共鸣时才出现，组合产物取决于另一元素，与原生一致。
 *
 * 三幕：
 *   起（windup，提交前）：落点画出一圈藤纹符文，只播预告（可免费打断）。
 *   击（erupt → hit）：提交后草柱炸土而出，柱内每个敌人挨一次 `pillar` 并做一次短控尝试；柱脚盘出一圈短印。
 *   留（scar → seaoffire / wetland）：短印只是共鸣标记；与另一誓约共鸣时，同一印记扩成更广的组合场。
 *
 * 湿地控制走可被原生拒绝的尝试：尝试过一次没落地的对象记进 `field.data.refused`，不再每次扫描重挂 rooted。
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

    /** 附近已有任何组合场就不再叠一层；组合是这一击的收束，不是堆叠物。 */
    function grasspledgeComboExists(world: CombatWorld, point: CombatPoint, radius: number): boolean {
        const areas = WorldEffects.areas(world);
        for (let i = 0; i < areas.length; i++) {
            if (!areas[i].data || !areas[i].data.combo) continue;
            if (grasspledgeAreaPoint(areas[i]).minus(point).length() <= radius + areas[i].radius) return true;
        }
        return false;
    }

    /** 一次可被原生拒绝的控制尝试：rooted 没落地就记进 refused，之后不再重复挂；拖慢照常。 */
    function grasspledgeRoot(world: CombatWorld, actor: CombatActor, field: WorldEffects.Field, rootTicks: number, slowTicks: number): boolean {
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

    // 誓约印：立誓的标记，本身不拖慢；只有草＋火共鸣的火海持续点燃、草＋水共鸣的湿地持续陷住／拖慢。
    // 表现绑在印记效果自己身上，随其自然到期或提前驱散一起收。
    WorldEffects.fieldRule(grasspledgeScar, {
        enter: function (world: CombatWorld, actor: CombatActor, field: WorldEffects.Field): void {
            if (field.data.combo !== "wetland" || world.friendly(actor)) return;
            grasspledgeRoot(world, actor, field, Math.max(16, Math.round(Number(field.data.root) || 30)), Math.max(40, Math.round(Number(field.data.slow) || 60)));
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
            WorldFeedback.onEffect(world, effect.id(), "world_combat:move_grasspledge/pledge", grasspledgeScene, 1, grasspledgePoint(field),
                { moment: moment, radius: field.radius, scale: field.radius / 1.8,
                    count: Math.round(Number(field.data.marks) || 12) + (combo ? Math.round(field.radius * 6) : 0) });
        }
    });

    define({
        id: grasspledgeId,
        cooldownParameter: "recharge",
        name: "草之誓约",
        description: "在选定地面立起一纸草之誓约：草柱炸土而出，柱内敌人挨一次伤害并被根须缠住、拖慢，柱脚留下一圈短寿的誓约印（只作共鸣标记，本身不拖慢）。落点附近已有火或水的誓约印时共鸣——这一击更重，同一圈印当场扩成火海（草＋火，持续点燃其中的敌人）或湿地（草＋水，踩进去会被陷住并重度拖慢；对控制免疫的目标只留基础伤害与拖慢）。",
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
            const marks = Math.round(p(grasspledgeId, "scarCells", action));
            const cap = Math.max(1, Math.round(p(grasspledgeId, "maxTargets", action)));
            const combo = grasspledgeComboAt(world, point, detect);
            const scale = markRadius / 1.8;
            let hits = 0;

            sound(action, "cobblemon:impact.grass");
            WorldFeedback.emit(world, grasspledgeScene, 1, point,
                { moment: "erupt", radius: radius, height: height, count: burst }, 40);

            WorldGeometry.selectEnemies(world, WorldGeometry.ring(point, 0, radius, { below: 0.5, above: height }), function (enemy, facts) {
                if (hits >= cap) return;
                // 伤害被拒绝就不算命中：不做控制尝试、不播命中表现。
                if (!hurt(action, enemy, grasspledgeId, power * (combo === "" ? 1 : comboPower), { damage: damageSpec(grasspledgeId, "pillar") })) return;
                hits++;
                let rooted = false;
                if (world.valid(enemy)) {
                    MobEffects.apply(world, enemy, "minecraft:slowness", slow, 1);
                    rooted = WorldEffects.apply(world, enemy, "rooted", {}, root) > 0 && world.effects(enemy, "world_combat:rooted").length > 0;
                }
                WorldFeedback.emit(world, grasspledgeScene, 1, facts.position(),
                    { moment: "hit", target: String(enemy.ref()), count: 10, scale: scale, binding: rooted ? 9 : 0 }, 20);
            });

            // 柱脚先留一圈短寿誓约印：共鸣标记，本身不拖慢；贴地盘根只由粒子表达。
            const brand = WorldEffects.field(world, grasspledgeScar, point, markRadius,
                { element: "grass", burn: 60, radius: markRadius, scale: scale, marks: marks, root: root, slow: slow }, markTicks);

            // 与另一誓约共鸣：把同一圈印就地扩成组合场并延长；一次施放只触发一次，已有组合场不再叠。
            let arena = false;
            if (combo !== "" && !grasspledgeComboExists(world, point, markRadius * comboScale)) {
                arena = true;
                const arenaRadius = markRadius * comboScale;
                WorldEffects.update(world, brand, {
                    data: { combo: combo, burn: 100, radius: arenaRadius, scale: arenaRadius / 1.8, marks: marks, root: root, slow: Math.max(slow, 60) },
                    radius: arenaRadius, ticks: Math.round(markTicks * 1.6)
                });
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
