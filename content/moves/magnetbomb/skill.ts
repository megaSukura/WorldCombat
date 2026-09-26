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
 *       world_combat:status/magnetbomb，并挂一枚机读引信标记（world_combat:magnet_bomb_mark），旁边生成钢弹外观的中间体跟随它。
 *       撞到方块则以贴面外侧的落点作为静止炸弹，走同一套引信与溅射；落空耗尽的钢弹自然消散。
 *   炸（blast）：引信到点，钢弹在锚点起爆，按 `blast/bombs` 结算一份物理伤害，爆炸半径内的其他敌人吃一份溅射；
 *       中间体与标记一起收掉。已吸附的钢弹保持原对象与独立引信。
 *       静止炸弹的引信由挂在施法者身上的 actor 级标记持有，中间体在标记自己的 effect.world() 里生成，
 *       因此发射动作结束（helper 随动作释放）后炸弹与引信仍在；撞点容不下有体积的中间体时，仍以点表现走完同一引信。
 * 反制：引信期间对手读得到炸弹，可以抢先治疗、加防或把战斗拖开；拆掉炸弹标记会提前引爆。
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
     * 在撞点放一枚静止炸弹：只从动作创建一个挂在施法者身上的 actor 级标记，引信与中间体都由该效果持有，
     * 所以发射动作结束后炸弹仍在。中间体由 mark.start 在自己的 effect.world() 里生成并保存 ref；
     * 落点容不下有体积的中间体时，仍以 state.point 的点表现承载同一引信，不吞掉本次设计。
     */
    function magnetbombAnchor(scope: CombatWorld, caster: CombatActor, at: CombatPoint, power: number, radius: number,
                              fuse: number, bombs: number, scale: number, intensity: number): void {
        scope.effect(magnetbombMark, caster,
            JSON.stringify({ caster: String(caster.ref()), target: "", power: power, radius: radius, fuse: fuse,
                end: scope.tick() + fuse, helper: "", fixed: true, point: [at.x(), at.y(), at.z()],
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
        if (typeof value.helper !== "string") value.helper = "";
        if (typeof value.target !== "string") value.target = "";
        if (typeof value.scale !== "number" || !isFinite(value.scale)) value.scale = 1;
        if (typeof value.intensity !== "number" || !isFinite(value.intensity)) value.intensity = 1;
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
        const life = Math.max(20, Math.round(state.end - world.tick()) + 60);
        if (state.fixed === true) {
            // 撞在方块上的静止炸弹：中间体由本效果（actor 级）生成并持有，发射动作结束后引信与钢弹仍在。
            const point = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
            let helper: CombatActor | null = null;
            try {
                helper = world.helper(point, 6, JSON.stringify({ item: "minecraft:iron_nugget", scale: 1.2 }), life);
            } catch (error) { helper = null; }
            state.helper = helper === null ? "" : String(helper.ref());
        } else {
            const body = world.observe(anchor);
            if (body === null) { effect.end(); return; }
            let helper: CombatActor | null = null;
            try {
                helper = world.helper(body.position().plus(WorldCombat.point(0, 0.5, 0)), 6,
                    JSON.stringify({ item: "minecraft:iron_nugget", scale: 1.2 }), life);
            } catch (error) { helper = null; }
            state.helper = helper === null ? "" : String(helper.ref());
        }
        effect.state(JSON.stringify(state));
        effect.schedule("track", "track", 1, "{}");
        effect.schedule("blast", "blast", Math.max(1, Math.round(state.end - world.tick())), "{}");
    });
    WorldCombat.effectHandler(magnetbombMark, "track", function (effect: CombatEffect) {
        const world = effect.world(), state = JSON.parse(effect.state());
        const anchor = effect.target();
        if (!world.valid(anchor)) { effect.end(); return; }
        const fixed = state.fixed === true;
        let at: CombatPoint;
        if (fixed) {
            at = WorldCombat.point(state.point[0], state.point[1], state.point[2]);
            if (state.helper !== "") {
                // 中间体被破坏即解除：它代表的静止炸弹随之失效。
                const held = world.actor(String(state.helper));
                if (held === null || !world.valid(held)) { effect.end(); return; }
                world.teleport(held, at);
            }
        } else {
            const body = world.observe(anchor);
            if (body === null) { effect.end(); return; }
            at = body.position();
            const helper = state.helper === "" ? null : world.actor(String(state.helper));
            if (helper !== null && world.valid(helper)) world.teleport(helper, at.plus(WorldCombat.point(0, 0.5, 0)));
        }
        // 每 tick 用实际锚点刷新钢弹与收缩光环：剩余 fuse 越少，光环越小。
        const remaining = Math.max(0, Math.round(state.end - world.tick()));
        const hold = fixed ? at : at.plus(WorldCombat.point(0, 0.5, 0));
        const target = fixed ? state.helper : String(anchor.ref());
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
        const world = effect.world(), state = JSON.parse(effect.state());
        const helper = state.helper === "" ? null : world.actor(String(state.helper));
        if (helper !== null && world.valid(helper)) world.removeHelper(helper);
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
            const intensity = Math.max(0.5, Math.min(2, perBomb / 18));
            const trail = Math.max(16, Math.round(perBomb * 1.6));
            const selected = action.target();

            // 只在选中一个敌对实体时锁定；集火全给它，分投再分给附近敌人。空放不自动锁最近敌人。
            const roster: CombatActor[] = [];
            if (selected !== null && world.valid(selected) && !world.friendly(selected)) roster.push(selected);
            if (roster.length > 0 && !cluster && self !== null) {
                const nearby = world.query(self.position(), range, false);
                for (let i = 0; i < nearby.length; i++) {
                    const other = nearby[i];
                    if (String(other.ref()) === String(actor.ref()) || world.friendly(other) || !world.valid(other)) continue;
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
                    appearance.homing = { target: ref, turn: pull, delay: 1, range: range + 6 };
                } else if (base !== null) {
                    const spread = bombs === 1 ? 0 : (shot / (bombs - 1) - 0.5) * 0.28;
                    const cos = Math.cos(spread), sin = Math.sin(spread);
                    direction = WorldCombat.point(base.x() * cos - base.z() * sin, base.y(), base.x() * sin + base.z() * cos).unit();
                }
                const flight = LivingActions.projectile(action, {
                    speed: speed, range: range + 8, radius: 0.25, direction: direction,
                    appearance: appearance,
                    impact: function (current: CombatAction, hit: CombatImpact) {
                        const scope = current.world();
                        const victim = hit.target();
                        if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                            CombatStatus.apply(scope, victim, "magnetbomb", magnetbombStatus, fuse + 40, 0, { unique: true });
                            scope.effect(magnetbombMark, victim,
                                JSON.stringify({ caster: String(current.actor().ref()), target: String(victim.ref()), power: perBomb,
                                    radius: radius, fuse: fuse, end: scope.tick() + fuse, helper: "", fixed: false,
                                    bombs: bombs, scale: scale, intensity: intensity }), fuse + 60);
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
