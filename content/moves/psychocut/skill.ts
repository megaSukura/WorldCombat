/**
 * 精神利刃 / psychocut 的出手方式。
 *
 * 核心念头：在身前凝出一把实体化的心之利刃——一轮偏紫的心刃——掷出去；刃脱手后自己修正方向追向选中的移动目标，
 * 命中处沿实际入射方向切出一道短痕，随即散尽。它是本族里唯一「刃离开施法者、还会拐弯追人」的一击。
 *
 * 三幕：
 *   起（windup，提交前）：心意在身前收拢，只播预告，可被打断。
 *   掷（blade，提交后）：心刃脱手沿目标方向飞出，以有限的转向率追着目标拐弯；飞行中拖着薄尾迹。
 *       方向或空点直射可用，不挂空 homing。
 *   裂（slash / wall / scatter）：首次真实接触只结算一次 `blade`；顺实际入射方向留下一道短切痕就结束。
 *       撞墙就在墙面结束，飞尽则读完成保留的真实末点在那里散刃；命中失败只散刃，不再展开任何附加攻击。
 *   要害（crit）：共享结算判定为暴击时，由本单元的监听器在命中点补一记更亮的刃光。
 *
 * 与同族分开：水波刀是一道笔直、极快、细窄的水线，能贯穿成排目标；空气利刃是一张即时的横扇；
 * 空气斩是沿直线穿透的月牙。精神利刃是唯一「一把刃飞出去有限转向追单个移动目标、只切中它触到的那一个」的一击。
 */
namespace PokemonSkills {
    define({
        id: psychocutId,
        cooldownParameter: "recharge",
        name: "Psycho Cut",
        description: "在身前凝出一把实体化的心之刃，掷出去后它自己拐弯追向目标；首次命中只结算被这一刃触到的那一个对手，并沿实际入射方向切出一道短痕。可以朝方向或地点空掷，墙会把弹体挡下。它是一记会追人的单点远程斩击，暴击率比同族高一档。",
        uses: ["把实体化的心之刃掷出去", "刃会拐弯追向移动中的目标", "命中只切中被这一刃触到的单个对手"],
        kind: "aim",
        range: 9,
        maxRange: 15,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 28,
        style: "psychic",
        defaults: { keen: false, ai: { maxChase: 13, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(psychocutId, "arc", pokemon), geometry: "area", style: "psychic", color: 0xB57BE8,
                label: config && config.keen === true ? "凝刃" : "精神利刃" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[psychocutId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(psychocutId, "tempo", context)),
                recover: Math.round(p(psychocutId, "aftercast", context)),
                cooldown: Math.round(p(psychocutId, "recharge", context)),
                active: 0,
                range: p(psychocutId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_psychocut:windup", psychocutScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", keen: config && config.keen === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const direction = aim(action);
            const power = p(psychocutId, "blade", action);
            const speed = p(psychocutId, "flight", action);
            const reach = p(psychocutId, "reach", action);
            const arc = p(psychocutId, "arc", action);
            const guide = Math.round(p(psychocutId, "guide", action));
            const radius = p(psychocutId, "radius", action);
            const shards = Math.max(8, Math.round(p(psychocutId, "shards", action)));
            const scale = Math.max(0.6, Math.min(2.0, arc / psychocutReference));
            const intensity = Math.max(0.6, Math.min(2.4, power / 70));
            const self = world.observe(actor);
            const from = self === null ? action.origin() : self.position();
            let settled = false;
            let flight = "";

            /** 实际飞行结束后停掉跟随弹体的刃光，不再留一段固定时长的旧特效。 */
            function endFlight(current: CombatAction, at: CombatPoint, reason: string): void {
                const scope = current.world();
                WorldFeedback.keep(scope, "psychocut:flight:" + action.id(), psychocutScene, 1, at,
                    { moment: "blade", projectile: flight, scale: scale, intensity: intensity,
                        lifecycle: { reason: reason, tick: scope.tick() } }, 12);
            }

            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:generic/cut", tint: 0xB57BE8, glow: true,
                scale: Math.max(0.7, Math.min(1.6, radius / 0.35))
            };
            // 只有瞄准了一个有效的非友方实体才挂有限追踪；空点直射不挂空 homing。
            if (target !== null && world.valid(target) && !world.friendly(target))
                appearance.homing = { target: String(target.ref()), turn: guide, delay: 2, range: reach };

            sound(action, "minecraft:item.trident.throw");

            flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 220,
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), victim = hit.target(), point = hit.position();
                    // 撞墙：心刃在墙面结束，给出明确的断口，不当作落空。
                    if (victim === null) {
                        if (!hit.blocked() || settled) return;
                        settled = true;
                        WorldFeedback.emit(scope, psychocutScene, 1, point,
                            { moment: "wall", scale: scale, intensity: intensity }, 20);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), psychocutWallText, [], 20);
                        sound(current, "minecraft:item.shield.break");
                        endFlight(current, point, "wall");
                        done(current);
                        return;
                    }
                    if (!scope.valid(victim) || scope.friendly(victim) || settled) return;
                    settled = true;
                    // 实际入射方向：优先读弹体原生速度，读不到再用来源到接触方向；短切痕沿它张开。
                    let incoming: CombatPoint | null = null;
                    const projectileRef = hit.projectile();
                    if (projectileRef) {
                        const projectileActor = scope.actor(projectileRef);
                        const native = projectileActor === null ? null : scope.nativeEntity(projectileActor);
                        if (native && typeof native.getDeltaMovement === "function") {
                            const motion = native.getDeltaMovement();
                            if (motion) {
                                const velocity = WorldCombat.point(motion.x, motion.y, motion.z);
                                if (velocity.length() > 0.001) incoming = velocity.unit();
                            }
                        }
                    }
                    if (incoming === null) {
                        const source = hit.source();
                        const sourceBody = source === null ? null : scope.observe(source);
                        const sourcePoint = sourceBody === null ? from : sourceBody.position();
                        const delta = point.minus(sourcePoint);
                        incoming = delta.length() < 0.01 ? direction : delta.unit();
                    }
                    const landed = impact(current, hit, psychocutId, power,
                        { damage: damageSpec(psychocutId, "blade"), slice: true });
                    sound(current, "cobblemon:impact.psychic");
                    if (landed) {
                        // 命中只留顺着实际入射方向的一道短切痕，随即散尽；判定与表现共用同一组端点。
                        const cutStart = point.minus(incoming.scale(arc)), cutEnd = point.plus(incoming.scale(arc));
                        WorldFeedback.emit(scope, psychocutScene, 1, point,
                            { moment: "slash", target: String(victim.ref()),
                                path: [[cutStart.x(), cutStart.y(), cutStart.z()], [cutEnd.x(), cutEnd.y(), cutEnd.z()]],
                                shards: shards, scale: scale, intensity: intensity }, 22);
                    } else {
                        // 主击被原生拒绝：只散刃，不发出命中表现。
                        WorldFeedback.emit(scope, psychocutScene, 1, point,
                            { moment: "scatter", target: String(victim.ref()), scale: scale, intensity: intensity }, 20);
                    }
                    endFlight(current, point, landed ? "hit" : "rejected");
                    done(current);
                }
            }, function (current: CombatAction) {
                if (settled) return;
                settled = true;
                const scope = current.world(), body = scope.observe(actor);
                // 真正飞尽处：读完成保留的弹体末点，散刃落在那里；施法者上方的提示文字独立保留。
                const spent = scope.projectilePosition(flight);
                const hint = body === null ? current.origin() : body.position();
                const at = spent === null ? hint : spent;
                WorldFeedback.emit(scope, psychocutScene, 1, at,
                    { moment: "scatter", scale: scale, intensity: intensity }, 20);
                WorldFeedback.text(scope, hint.plus(WorldCombat.point(0, 1.0, 0)), psychocutMissText, [], 20);
                endFlight(current, at, "missed");
                done(current);
            });
            WorldFeedback.keep(world, "psychocut:flight:" + action.id(), psychocutScene, 1, action.origin(),
                { moment: "blade", projectile: flight, scale: scale, intensity: intensity }, 200);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的刃光与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_psychocut/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== psychocutId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, psychocutScene, 1, at,
            { moment: "crit", target: String(target.ref()), shards: Math.max(10, Math.min(46, Math.round(ratio * 3))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.25, 0)), psychocutVitalText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
