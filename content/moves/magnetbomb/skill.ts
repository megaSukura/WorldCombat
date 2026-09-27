/**
 * 磁铁炸弹 / magnetbomb 的出手方式。
 *
 * 核心念头：发射几枚会被磁力吸向对手的钢弹，一碰到就吸在它身上，引信走完再一起炸——
 *   因为粘住了，躲不掉，所以必中。
 *
 * 两幕 + 收：
 *   起（load，提交前）：弹仓张开、磁光在身前聚起（可读的预告）。
 *   发（launch → stick/charge）：提交后按 `bombs` 发射钢弹。选中敌人时各自用原生追踪吸向目标；没有选中实体时
 *       按瞄准方向散射，不自动锁定最近的敌人。命中活体即吸住：给对手盖上物品栏可见的共享身份
 *       world_combat:status/magnetbomb，并挂一枚机读引信标记（world_combat:magnet_bomb_mark），
 *       由该标记按命中的真实方向把多枚钢弹在身体外圈错开显示。
 *       撞到方块则以贴面外侧的落点作为静止炸弹，走同一套引信与溅射；落空耗尽的钢弹自然消散。
 *   炸（blast）：引信到点，钢弹在锚点起爆，按 `blast/bombs` 结算一份物理伤害，爆炸半径内、且中间没有实心墙的
 *       其他敌人吃一份溅射；标记与表现一起收掉。已吸附的钢弹保持独立引信。
 *       墙弹的引信由挂在施法者身上的 actor 级标记持有，表现由标记的 present 承载，
 *       因此发射动作结束、发射动作释放后炸弹与引信仍在。
 * 反制：引信期间对手读得到炸弹，可以抢先治疗、加防或把战斗拖开。钢弹本体是引信光环与钢色弹体表现，
 *       墙弹与附体弹共用同一条规则：它不是可攻击的独立实体，不能被“打掉”；唯一反制是这段引信窗口。
 *
 * 与同族分开：高速星星/魔法叶是命中即结算的追踪弹；磁铁炸弹是**吸附后延迟起爆**，
 *   中间那截引信和粘在身上的样子是它的身份，也是对手唯一能反应的窗口。
 */
namespace PokemonSkills {
    const magnetbombId = "magnetbomb";
    const magnetbombScene = "world_combat:move_magnetbomb";
    const magnetbombFuseScene = "world_combat:magnetbomb_fuse";
    const magnetbombStatus = "world_combat:magnet_bomb";
    const magnetbombMark = "world_combat:magnet_bomb_mark";
    const magnetbombDetonation = "world_combat:magnet_bomb_detonation";
    const magnetbombStickText = "world_combat.move.magnetbomb.text.stick";
    const magnetbombBlastText = "world_combat.move.magnetbomb.text.blast";
    /** 溅射给附近其他人吃到的份额。 */
    const magnetbombSplash = 0.45;

    /** Keep the fuse and blast on the native contact surface, with a small outward separation. */
    function magnetbombFacePoint(_world: CombatWorld, hit: CombatImpact): CombatPoint {
        const face = hit.blockFace();
        const normal = WorldCombat.point(face === "east" ? 1 : face === "west" ? -1 : 0,
            face === "up" ? 1 : face === "down" ? -1 : 0,
            face === "south" ? 1 : face === "north" ? -1 : 0);
        return hit.position().plus(normal.scale(.025));
    }

    /**
     * 附体钢弹的真实落点：以命中方向为基准角，按弹序沿身体外圈均分，环半径随真实碰撞箱。
     * 这样同一目标上的多枚弹落在不同点上，弹数（每枚一枚实物＋一条引信）看得清。
     */
    function magnetbombAttachPoint(body: CombatObservation, state: any): CombatPoint {
        const slots = Math.max(1, Math.round(Number(state.slots) || 1));
        const slot = Math.max(0, Math.min(slots - 1, Math.round(Number(state.slot) || 0)));
        const base = typeof state.angle === "number" && isFinite(state.angle) ? state.angle : 0;
        const angle = base + slot / slots * Math.PI * 2;
        const radius = Math.max(0.2, Math.min(0.55, body.width() * 0.3));
        const rise = 0.4 + (slot % 2) * 0.22;
        return body.position().plus(WorldCombat.point(Math.cos(angle) * radius, rise, Math.sin(angle) * radius));
    }

    /** 从命中点相对身体中心算出的水平朝向角，作为附体弹环的基准方向。 */
    function magnetbombContactAngle(center: CombatPoint, contact: CombatPoint): number {
        const dx = contact.x() - center.x(), dz = contact.z() - center.z();
        return dx * dx + dz * dz > 1e-6 ? Math.atan2(dz, dx) : 0;
    }

    /**
     * 在撞点放一枚静止炸弹：只从动作创建一个挂在施法者身上的 actor 级标记，引信与钢弹表现都由该效果持有，
     * 所以发射动作结束后炸弹仍在；落点就是 state.point 本身，不需要另生成实体来代表这枚弹。
     */
    function magnetbombAnchor(scope: CombatWorld, caster: CombatActor, at: CombatPoint, power: number, radius: number,
                              fuse: number, bombs: number, scale: number, intensity: number): void {
        scope.effect(magnetbombMark, caster,
            JSON.stringify({ caster: String(caster.ref()), target: "", power: power, radius: radius, fuse: fuse,
                end: scope.tick() + fuse, fixed: true, point: [at.x(), at.y(), at.z()],
                bombs: bombs, scale: scale, intensity: intensity }), fuse + 60);
        WorldFeedback.emit(scope, magnetbombScene, 1, at,
            { moment: "stick", point: [at.x(), at.y(), at.z()], fuse: fuse, scale: scale, intensity: intensity }, 24);
        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), magnetbombStickText,
            [Math.round(fuse / 20)], 26);
        scope.sound("minecraft:block.iron_trapdoor.close", at, 12, "{}");
    }

    // The blast owns a captured world point; its primary victim can die before the nearby victims settle.
    WorldCombat.effect(magnetbombDetonation, 1, 2, "actor", function (json) {
        const data = JSON.parse(json);
        if (typeof data.target !== "string" || !Array.isArray(data.point) || data.point.length !== 3 ||
            !data.point.every(function (value: number) { return typeof value === "number" && isFinite(value); }) ||
            typeof data.mark !== "number" || !(data.mark > 0) || !isFinite(data.radius) || !(data.radius > 0) ||
            !isFinite(data.power) || !(data.power > 0)) throw new Error("Invalid magnet bomb detonation");
        return JSON.stringify(data);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(magnetbombDetonation, "start", function (effect: CombatEffect) {
        const world = effect.world(), data = JSON.parse(effect.state());
        const at = WorldCombat.point(data.point[0], data.point[1], data.point[2]), radius = data.radius, power = data.power;
        world.operation(data.mark, "world_combat:dispel", "{}");
        const victim = data.target === "" ? null : world.actor(data.target);
        if (victim !== null) hurt(world, victim, magnetbombId, power, { damage: damageSpec(magnetbombId, "blast") });
        WorldGeometry.selectEnemies(world, WorldGeometry.ring(at, 0, radius, { below: 1.2, above: 2.4 }),
            function (other: CombatActor, facts: CombatObservation) {
                if (String(other.ref()) === data.target) return;
                // 实心墙挡住爆心与受害者之间的连线时，这一份溅射不结算，也不播。
                if (WorldGeometry.blockHit(world, at, facts.position()) !== null) return;
                hurt(world, other, magnetbombId, power * magnetbombSplash, { damage: damageSpec(magnetbombId, "blast") });
                WorldFeedback.emit(world, magnetbombScene, 1, facts.position(),
                    { moment: "splash", target: String(other.ref()), scale: radius / 1.2 }, 18);
            });
        WorldFeedback.emit(world, magnetbombScene, 1, at,
            { moment: "blast", target: data.target, radius: radius, scale: radius / 1.2,
                power: Math.round(power * 10) / 10, notes: Math.max(10, Math.round(power * 0.6)) }, 28);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), magnetbombBlastText, [Math.round(power)], 24);
        world.sound("cobblemon:impact.steel", at, 16, "{}");
        world.sound("minecraft:entity.generic.explode", at, 12, "{}");
        effect.end();
    });

    WorldCombat.effect(magnetbombMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.caster !== "string" || !value.caster) throw new Error("Invalid magnet bomb source");
        ["power", "radius", "fuse", "end", "bombs"].forEach(function (key: string) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid magnet bomb value: " + key);
        });
        if (typeof value.target !== "string") value.target = "";
        if (typeof value.scale !== "number" || !isFinite(value.scale)) value.scale = 1;
        if (typeof value.intensity !== "number" || !isFinite(value.intensity)) value.intensity = 1;
        if (typeof value.slot !== "number" || !isFinite(value.slot)) value.slot = 0;
        if (typeof value.slots !== "number" || !isFinite(value.slots) || value.slots < 1) value.slots = 1;
        if (typeof value.angle !== "number" || !isFinite(value.angle)) value.angle = 0;
        value.fixed = value.fixed === true;
        if (value.fixed && (!Array.isArray(value.point) || value.point.length !== 3 ||
            !value.point.every(function (n: number) { return typeof n === "number" && isFinite(n); })))
            throw new Error("Invalid magnet bomb anchor point");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(magnetbombMark, "start", function (effect: CombatEffect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        const anchor = effect.target();
        if (!world.valid(anchor)) { effect.end(); return; }
        if (state.fixed !== true && world.observe(anchor) === null) { effect.end(); return; }
        // 钢弹本体是这枚托管效果自己持有的引信光环与钢色弹体表现（present），不是可攻击的独立实体；
        // 墙弹与附体弹共用同一条规则：不能被“打掉”，只能靠引信窗口治疗、加防或走位应对。
        effect.schedule("track", "track", 1, "{}");
        effect.schedule("blast", "blast", Math.max(1, Math.round(state.end - world.tick())), "{}");
    });
    WorldCombat.effectHandler(magnetbombMark, "track", function (effect: CombatEffect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        const anchor = effect.target();
        if (!world.valid(anchor)) { effect.end(); return; }
        const fixed = state.fixed === true;
        let at: CombatPoint, hold: CombatPoint;
        if (fixed) {
            at = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
            hold = at;
        } else {
            const body = world.observe(anchor);
            if (body === null) { effect.end(); return; }
            at = body.position();
            hold = magnetbombAttachPoint(body, state);
        }
        // 每 tick 用实际锚点刷新钢弹与收缩光环：剩余 fuse 越少，光环越小。
        const remaining = Math.max(0, Math.round(state.end - world.tick()));
        const target = fixed ? "" : String(anchor.ref());
        world.present("magnetbomb:hold:" + effect.id(), magnetbombScene, 1, hold,
            JSON.stringify({ moment: "charge", target: target, point: [hold.x(), hold.y(), hold.z()], fuse: state.fuse,
                remaining: remaining, scale: state.scale, intensity: state.intensity }));
        world.present("magnetbomb:fuse:" + effect.id(), magnetbombFuseScene, 1, hold,
            JSON.stringify({ radius: state.radius, fuse: state.fuse, remaining: remaining }));
        if (world.tick() < state.end) effect.schedule("track", "track", 1, "{}");
    });
    WorldCombat.effectHandler(magnetbombMark, "blast", function (effect: CombatEffect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        const anchor = effect.target();
        if (!world.valid(anchor)) { effect.end(); return; }
        const fixed = state.fixed === true;
        let at: CombatPoint;
        if (fixed) {
            at = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
        } else {
            const body = world.observe(anchor);
            if (body === null) { effect.end(); return; }
            at = body.position();
        }
        const radius = Math.max(0.5, state.radius), power = Math.max(1, state.power);
        world.effect(magnetbombDetonation, world.source(), JSON.stringify({ mark: effect.id(),
            target: fixed ? "" : String(anchor.ref()), point: [at.x(), at.y(), at.z()], radius: radius, power: power }), 1);
    });
    WorldCombat.effectHandler(magnetbombMark, "end", function (effect: CombatEffect) {
        const world = effect.world();
        // 附着身份随最后一枚有效弹退休：被清、目标离场都不留假标记。
        const anchor = effect.target();
        if (!world.valid(anchor)) return;
        const others = world.effects(anchor, magnetbombMark).filter(function (view) { return view.id() !== effect.id(); });
        if (!others.length) CombatStatus.cure(world, anchor, "magnetbomb");
    });
    WorldCombat.effectHandler(magnetbombMark, "operation:world_combat:dispel", function (effect: CombatEffect) { effect.end(); });

    define({
        id: magnetbombId,
        cooldownParameter: "recharge",
        name: "Magnet Bomb",
        description: "发射几枚会被磁力吸向对手的钢弹，碰到就吸在它身上，引信走完起爆；吸住后躲不掉，没吸住的会落空。选中目标时集火或分投；没有选中实体时按瞄准方向发射，撞到方块就粘在墙上走同一套引信。",
        uses: ["把钢弹吸在对手身上再起爆", "分散吸住一圈敌人一起炸", "用引信逼对手在起爆前做出反应"],
        kind: "aim",
        range: 8,
        maxRange: 13,
        prepare: 9,
        active: 0,
        recover: 8,
        cooldown: 90,
        style: "steel",
        defaults: { cluster: false, ai: { maxChase: 13, focused: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(magnetbombId, "reach", pokemon), geometry: "point", style: "steel", color: 0x9AA4AE,
                label: config && config.cluster === true ? "磁铁炸弹·集火" : "磁铁炸弹" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[magnetbombId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const cluster = !!(config && config.cluster);
            return {
                prepare: Math.round(p(magnetbombId, "tempo", context)) + (cluster ? 2 : 0),
                recover: Math.round(p(magnetbombId, "settle", context)),
                cooldown: Math.round(p(magnetbombId, "recharge", context)),
                active: 0,
                range: p(magnetbombId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("magnetbomb:load", magnetbombScene, 1, action.origin(),
                JSON.stringify({ moment: "load", windup: prepare, target: action.target() === null ? "" : String(action.target()!.ref()),
                    cluster: !!(config && config.cluster), bombs: p(magnetbombId, "bombs", action) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const cluster = !!(config && config.cluster);
            const bombs = Math.max(1, Math.round(p(magnetbombId, "bombs", action)));
            const blast = p(magnetbombId, "blast", action);
            const perBomb = blast / bombs;
            const speed = p(magnetbombId, "bombSpeed", action);
            const pull = p(magnetbombId, "pull", action);
            const fuse = Math.max(10, Math.round(p(magnetbombId, "fuse", action)));
            const radius = p(magnetbombId, "radius", action);
            const range = p(magnetbombId, "reach", action);
            const scale = radius / 1.2;
            // 锁定距离 reach 是选人与追踪的上界；实际弹道再多留一小段发射余量，让齐射的弹能真的贴上身体。
            const flightLead = 2;
            const flightRange = range + flightLead;
            const intensity = Math.max(0.5, Math.min(2, perBomb / 18));
            const trail = Math.max(16, Math.round(perBomb * 1.6));
            const selected = action.target();

            // 只在选中一个敌对实体时锁定；集火全给它，分投再分给附近**看得见**的合法敌人。
            // 空放不自动锁最近敌人；分投不采不可见目标（不读取隐藏敌坐标）。
            const roster: CombatActor[] = [];
            if (selected !== null && world.valid(selected) && !world.friendly(selected)) roster.push(selected);
            if (roster.length > 0 && !cluster && self !== null) {
                const nearby = world.query(self.position(), range, false);
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (String(other.ref()) === String(actor.ref()) || world.friendly(other) || !world.valid(other)) continue;
                    const facts = world.observe(other);
                    if (facts === null || !facts.visible()) continue;
                    let known = false;
                    for (let slot = 0; slot < roster.length; slot++) if (String(roster[slot].ref()) === String(other.ref())) { known = true; break; }
                    if (!known) roster.push(other);
                }
            }

            sound(action, "minecraft:entity.firework_rocket.launch");
            WorldFeedback.emit(world, magnetbombScene, 1, action.origin(),
                { moment: "launch", count: bombs, targets: roster.length, intensity: intensity, scale: scale, cluster: cluster }, 22);

            const directed = roster.length === 0;
            const base = directed ? aim(action) : null;
            let remaining = bombs;
            let settled = false;
            function completeOne(current: CombatAction): void {
                remaining--;
                if (remaining > 0 || settled) return;
                settled = true;
                done(current);
            }
            for (let shot = 0; shot < bombs; shot++) {
                const target = roster.length > 0 ? roster[shot % roster.length] : null;
                const ref = target === null ? "" : String(target.ref());
                const appearance: LivingActions.ProjectileAppearance = {
                    sprite: "cobblemon:particle/generic/orb/orb", glow: true, tint: 0xB8C2CC };
                let direction: CombatPoint | undefined = undefined;
                if (target !== null) {
                    // 每枚弹朝自己分到的目标发射，再由原生追踪微调；撞墙的弹因此在墙外就咬上。
                    const body = world.observe(target);
                    const aimAt = body === null ? action.targetPosition() : body.position();
                    const delta = aimAt.minus(action.origin());
                    if (delta.length() > 0.01) direction = delta.unit();
                    appearance.homing = { target: ref, turn: pull, delay: 1, range: flightRange };
                } else if (base !== null) {
                    const spread = bombs === 1 ? 0 : (shot / (bombs - 1) - 0.5) * 0.28;
                    const cos = Math.cos(spread), sin = Math.sin(spread);
                    direction = WorldCombat.point(base.x() * cos - base.z() * sin, base.y(), base.x() * sin + base.z() * cos).unit();
                }
                // 这一枚只结算一次：同一股重复回执不再多贴一枚。
                let landed = false;
                const flight = LivingActions.projectile(action, {
                    speed: speed, range: flightRange, radius: 0.25, direction: direction,
                    appearance: appearance,
                    impact: function (current: CombatAction, hit: CombatImpact) {
                        if (landed) return;
                        landed = true;
                        const scope = current.world();
                        const victim = hit.target();
                        if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                            // 原生/模组拒绝这层附着身份时不留假标记：不挂引信、不播「吸住」。
                            if (!CombatStatus.apply(scope, victim, "magnetbomb", magnetbombStatus, fuse + 40, 0, { unique: true })) {
                                WorldFeedback.emit(scope, magnetbombScene, 1, hit.position(), { moment: "fade", intensity: intensity }, 16);
                                return;
                            }
                            const body = scope.observe(victim);
                            const angle = body === null ? 0 : magnetbombContactAngle(body.position(), hit.position());
                            scope.effect(magnetbombMark, victim,
                                JSON.stringify({ caster: String(current.actor().ref()), target: String(victim.ref()), power: perBomb,
                                    radius: radius, fuse: fuse, end: scope.tick() + fuse, fixed: false,
                                    bombs: bombs, scale: scale, intensity: intensity, slot: shot, slots: bombs, angle: angle }), fuse + 60);
                            WorldFeedback.emit(scope, magnetbombScene, 1, hit.position(),
                                { moment: "stick", point: [hit.position().x(), hit.position().y(), hit.position().z()],
                                    target: String(victim.ref()), fuse: fuse, scale: scale, intensity: intensity }, 24);
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.05, 0)), magnetbombStickText,
                                [Math.round(fuse / 20)], 26);
                            scope.sound("minecraft:block.iron_trapdoor.close", hit.position(), 12, "{}");
                            return;
                        }
                        if (hit.blocked()) {
                            const surface = magnetbombFacePoint(scope, hit);
                            magnetbombAnchor(scope, current.actor(), surface, perBomb, radius, fuse, bombs, scale, intensity);
                            return;
                        }
                        WorldFeedback.emit(scope, magnetbombScene, 1, hit.position(), { moment: "fade", intensity: intensity }, 16);
                    }
                }, function (current: CombatAction) { completeOne(current); });
                WorldFeedback.emit(world, magnetbombScene, 1, action.origin(),
                    { moment: "seek", projectile: flight, target: ref, intensity: intensity, trail: trail, scale: scale, directed: directed ? 1 : 0 }, 40);
            }
        }
    });
}
