/**
 * 龙锤 / dragonhammer 的出手方式。
 *
 * 核心念头：把整个身体抡起来当锤子——先弓身扬起、再沿面前一道垂直弧从身体前上端砸到前下；
 *   真实首个实体或地形的接触点决定落点。砸实的一下把目标沿接触方向撞飞、并砸得它一个趔趄、走慢一阵。
 *   没有反震、不裂地、不追加第二下，代价是起手慢、只砸一个点。
 *
 * 两幕（落空多一幕）：
 *   起（windup，提交前）：弓身扬起、龙气沿身体收紧，只播预告。
 *   砸（swing → impact / whiff，提交后）：锁定出手方向，必要时补一小靠步（总量不超过 `lunge`、受原生身体扫掠限制），
 *       随后整个身体沿垂直弧逐刻 trace 压下，路径宽度取**自己真实体宽**。先碰到实体就结算 `hammer` 接触伤害，
 *       伤害真的落地后才把目标沿真实接触方向撞飞 `shove` 格、挂上 `world_combat:knocked_down`（共享身份
 *       world_combat:status/knocked_down，移动速度大幅下降，仍可出手）；先碰到方块就停在墙面扬一小片尘，不伤墙后的人；
 *       整条弧都没碰上就在弧末端落空。盟友或伤害被拒时锤停在那一点，不算命中。
 *
 * 与同为「身体当武器」的招分开：泰山压顶跃到落点、范围压中一圈、概率麻痹；木槌抬身砸下、裂开地表、反震自己；
 *   龙锤只沿垂直弧砸单个目标、不裂地不反震，把目标砸得趔趄。
 *
 * 选取：`kind: "aim"`——方向或世界点都能放，瞄空中也成立；方块只做拦截，命中权限仍由命中层判断。
 * 不要求提交时存在敌人；空弧、撞墙都在实际接触点收住，不做任何补判。
 */
namespace PokemonSkills {
    const dragonhammerScene = "world_combat:move_dragonhammer";
    const dragonhammerDowned = "world_combat:knocked_down";
    const dragonhammerHitText = "world_combat.move.dragonhammer.text.hit";
    const dragonhammerMissText = "world_combat.move.dragonhammer.text.miss";

    define({
        freeMovement: true,
        id: "dragonhammer",
        cooldownParameter: "recharge",
        name: "Dragon Hammer",
        description: "把整个身体抡起来当锤子，沿面前一道垂直弧自上而下重砸一个目标：真实首个实体或地形的接触点决定落点，砸中后把它沿接触方向撞飞、并砸得趔趄一阵、移动大幅变慢（仍可出手）。重锤式更重、趔趄更久、击飞更短；疾锤式起手更快、抡得更快、撞得更远。",
        uses: ["把冲进来的目标砸得趔趄、断它一段走位", "对单个目标打一记重的龙属性接触伤害", "打断贴身后的追击节奏", "把目标撞开、为队友腾出身位"],
        kind: "aim",
        range: 2.9,
        maxRange: 4.4,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 40,
        style: "hammer",
        maximumTicks: 160,
        defaults: { heavy: true, ai: { maxChase: 6, opening: "anytime" } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dragonhammer", "reach", pokemon), geometry: "line", style: "hammer",
                color: 0x7078C8, label: config && config.heavy === true ? "重锤式龙锤" : "疾锤式龙锤" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dragonhammer"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dragonhammer", "tempo", context)),
                recover: Math.round(p("dragonhammer", "aftercast", context)),
                cooldown: Math.round(p("dragonhammer", "recharge", context)),
                active: 0,
                range: p("dragonhammer", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            action.present("world_combat:move_dragonhammer:rear", dragonhammerScene, 1, action.origin(),
                JSON.stringify({ moment: "rear", scale: body ? (body.width() + body.height()) / 2.3 : 1, heavy: !!(config && config.heavy) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(dragonhammerScene);
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            if (body === null) { done(action); return; }
            const centre0 = body.position(), height = body.height();
            const aimVec = aim(action);
            const heading = WorldGeometry.flatUnit(aimVec, action.direction());
            const reach = Math.max(2.0, p("dragonhammer", "reach", action));
            const lunge = Math.max(0, p("dragonhammer", "lunge", action));
            const power = p("dragonhammer", "hammer", action);
            const shove = Math.max(0, p("dragonhammer", "shove", action));
            const downTicks = Math.max(10, Math.round(p("dragonhammer", "downTicks", action)));
            const dust = Math.max(8, Math.round(p("dragonhammer", "dust", action)));
            const sweepTicks = Math.max(4, Math.min(6, Math.round(p("dragonhammer", "sweep", action))));
            const gauge = Math.max(0.3, body.width() * 0.5);
            const scale = Math.max(0.6, Math.min(2.0, body.width() / 0.9));
            const intensity = Math.max(0.6, Math.min(2.2, power / 92));
            const lift = Math.max(-0.6, Math.min(0.9, aimVec.y()));
            const topHeight = Math.max(0.6, height * 0.95 + reach * 0.35 - lift * 0.5);
            const forward = WorldCombat.point(heading.x(), 0, heading.z());

            sound(action, "cobblemon:move.dragonclaw.actor");

            // 必要的小靠步：总量不超过原 lunge，且受原生身体扫掠限制；靠近不等于必中。
            const targetPoint = action.targetPosition();
            const flatGap = WorldCombat.point(targetPoint.x() - centre0.x(), 0, targetPoint.z() - centre0.z()).length();
            const step = Math.min(lunge, Math.max(0, flatGap - reach * 0.7));
            if (step > 0.05) sweepStep(action, heading.scale(step), gauge);
            const settled = world.observe(actor);
            const centre = settled === null ? centre0 : settled.position();

            /** 弧上一点：从身体前上方沿垂直弧落到前下。 */
            function tipAt(t: number): CombatPoint {
                const distance = reach * (0.35 + 0.65 * t);
                return WorldCombat.point(centre.x() + heading.x() * distance,
                    centre.y() + topHeight * Math.pow(1 - t, 1.4) + 0.15,
                    centre.z() + heading.z() * distance);
            }

            /** 落空：短尘 + 一声轻响；不推动任何人、不声称命中。 */
            function whiff(current: CombatAction, at: CombatPoint, face: string): void {
                const scope = current.world();
                WorldFeedback.emit(scope, dragonhammerScene, 1, at,
                    { moment: "whiff", scale: scale, dust: dust, face: face }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), dragonhammerMissText, [], 22);
                sound(current, "minecraft:item.mace.smash_air");
                scenes.stop(current, "swing");
                scenes.finish(current, done);
            }

            /** 接触落地：先碰实体且伤害成功才撞飞+趔趄；先碰方块扬尘；都没碰上落空。 */
            function land(current: CombatAction, contact: CombatImpact | null, arcEnd: CombatPoint): void {
                const scope = current.world();
                if (contact !== null && contact.hitEntity()) {
                    let victim = contact.target();
                    if (victim !== null && (String(victim.ref()) === String(actor.ref()) || scope.friendly(victim))) victim = null;
                    if (victim !== null && hurt(current, victim, "dragonhammer", power,
                        { damage: damageSpec("dragonhammer", "hammer"), contact: true })) {
                        const now = scope.observe(victim);
                        const at = now === null ? contact.position() : now.position();
                        scope.sound("minecraft:item.mace.smash_ground_heavy", at, 18, "{}");
                        // 伤害真的落地后才撞飞、才申请趔趄；状态被拒（控免）照吃主伤，只是不亮趔趄反馈。
                        if (scope.valid(victim)) {
                            const away = WorldCombat.point(at.x() - centre.x(), 0, at.z() - centre.z());
                            if (away.length() > 0.05) scope.displace(victim, away.unit().scale(shove));
                        }
                        const staggered = scope.valid(victim) && MobEffects.apply(scope, victim, dragonhammerDowned, downTicks, 0) !== null;
                        WorldFeedback.emit(scope, dragonhammerScene, 1, at,
                            { moment: "impact", target: String(victim.ref()), dust: dust, scale: scale, intensity: intensity,
                              stagger: staggered ? 8 : 0 }, 26);
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), dragonhammerHitText, [], 24);
                        scenes.stop(current, "swing");
                        scenes.finish(current, done);
                        return;
                    }
                    whiff(current, contact.position(), "");
                    return;
                }
                if (contact !== null && contact.blocked()) {
                    const cell = contact.blockPosition();
                    whiff(current, cell === null ? contact.position() : cell, contact.blockFace());
                    return;
                }
                whiff(current, arcEnd, "");
            }

            /** 沿真实垂直弧逐刻 trace 压下；首个实体或方块接触就落地，否则挥到弧末端落地。 */
            function swing(current: CombatAction, tick: number, from: CombatPoint): void {
                const progress = sweepTicks <= 1 ? 1 : (tick + 1) / sweepTicks;
                const tip = tipAt(progress);
                scenes.show(current, "swing", tip,
                    { moment: "swing", path: [[from.x(), from.y(), from.z()], [tip.x(), tip.y(), tip.z()]],
                        direction: [forward.x(), forward.y(), forward.z()], scale: scale, intensity: intensity, dust: dust });
                const contact = current.trace(from, tip, gauge, true);
                if (contact.hitEntity() || contact.blocked()) { land(current, contact, tip); return; }
                if (tick + 1 >= sweepTicks) { land(current, null, tip); return; }
                current.after(1, function (next: CombatAction) { swing(next, tick + 1, tip); });
            }

            swing(action, 0, tipAt(0));
        }
    });
}
