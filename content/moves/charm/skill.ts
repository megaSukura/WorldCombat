/**
 * 撒娇 / Charm — 执行组织。
 *
 * 核心念头：把战意软下来分两种送法。贴近时向前方一小片扇面洒出撒娇，把正面围攻的对手一起拖软；
 *   送飞吻时放出一个缓慢直飞的真弹体，够得更远，只软到第一个被它碰上的敌人。
 *
 * 两幕：
 *   起（windup 播「抬眼」，提交前只观察与预告，可被打断，打断不花代价）。
 *   中（提交后）：
 *     · 贴近撒娇：以提交朝向为轴、身前总张角 90°、本次解析出的 charmRange（1.6–3.0 格）为半径的真实
 *       身体扇面（WorldGeometry.bodySector）；扇内最多 3 个看得见、非友方、与施法者之间没有墙的身体各降
 *       2 级攻击。每个真正被接纳的身体先挂共享身份 world_combat:status/charmed，再用 NativeEffects.boostWindow
 *       把这次攻击下降绑在它自己的心软载体上——载体被拒就不扣级、不出成功符号，载体到期/被清只收回本源。
 *     · 飞吻：一个缓慢直飞的心形弹体从前侧送出（LivingActions.projectile，无追踪）。只在**首个合法敌人**
 *       命中时降 1 级；撞到方块或友方就被截住、碎掉，不降任何东西。能空放、能点地、能点人。
 * 视线：贴近每个目标都要求身体之间没有真实墙面（WorldGeometry.blockHit）；被掩体挡住的不受影响，只在
 *   该点播 blocked。飞吻的飞行本身会被掩体挡下。
 * 反制：贴近要绕出掩体、站定暴露侧背；飞吻够慢，横移能躲、友方能挡；只覆盖正面，拦不住背后。
 */
namespace PokemonSkills {
    function charmAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 贴近扇面的总张角与最多接纳的身体数：几何与画面、AI 共用这一组值。 */
    const charmFanAngle = 90;
    const charmFanTargets = 3;

    /**
     * 心软存续的托管载体：把「头顶持续浮起的心」绑在真实状态效果的生命周期上，
     * 自然到期、牛奶／`/effect clear` 提前拿掉都随它一起停，不靠自己的计时。
     */
    const charmLingerMark = "world_combat:move_charm/linger_mark";

    function charmLingerWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = world.mobEffect(target, charmEffect);
        if (carrier === null) { effect.end(); return; }
        // 本载体就是本 source 创建的托管效果，presentOn 随它一起清理。
        WorldFeedback.onEffect(world, effect.id(), "linger", charmScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()) });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(charmLingerMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid charm linger mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(charmLingerMark, "start", charmLingerWatch);
    WorldCombat.effectHandler(charmLingerMark, "watch", charmLingerWatch);
    WorldCombat.effectHandler(charmLingerMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 状态被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现，不等它自己的下一次巡检。
    WorldCombat.on("world_combat:move_charm/linger-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== charmEffect) return;
        const world = event.world(), actor = event.actor();
        world.effects(actor, charmLingerMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    /**
     * 把这次撒娇落到一个目标身上：先申请真实载体，被拒就什么都不做；成功才把这级下降交给绑在**这份载体**上的
     * boostWindow，并按实际掉了几级播命中表现与余韵。返回这名目标是否真的被接纳。
     */
    function charmApply(world: CombatWorld, target: CombatActor, drop: number, linger: number, hearts: number, kiss: boolean): boolean {
        const body = world.observe(target);
        if (body === null) return false;
        const previous = MobEffects.read(world, target, charmEffect);
        const carrier = MobEffects.apply(world, target, charmEffect, linger, 0);
        if (carrier === null) return false;
        const before = NativeEffects.effectiveStage(world, target, "atk");
        NativeEffects.boostWindow(world, target, { atk: -drop }, linger, "world_combat:move/charm", carrier, previous);
        const dropped = Math.max(0, before - NativeEffects.effectiveStage(world, target, "atk"));
        if (world.effects(target, charmLingerMark).length === 0)
            world.effect(charmLingerMark, target, "{}", Math.max(1, Math.min(2400, linger)));
        WorldFeedback.emit(world, charmScene, 1, body.position(),
            { moment: kiss ? "kiss" : "cast", target: String(target.ref()),
                drop: dropped, hearts: hearts, kiss: kiss ? 1 : 0 }, 30);
        if (dropped !== 0)
            WorldFeedback.text(world, charmAbove(body.position()), "world_combat.move.charm.text.charm", [dropped], 36);
        return true;
    }

    define({
        id: charmId,
        cooldownParameter: "recharge",
        name: "撒娇",
        description: "朝身前一小片扇面（总角约 90°、贴身距离）撒娇，最多把其中 3 个看得见的对手各降 2 级攻击；身体之间隔着墙的不受影响。也可以改送飞吻：一个缓慢直飞的心形弹体，够得更远，只在首个被它命中的敌人身上降一级攻击，被友方或方块截住就碎了。",
        uses: ["正面有多个物攻威胁围上来时一起拖软", "在它们冲上来前把正面一撮人的攻击压下去", "用飞吻在稍远处补一记单体削弱"],
        kind: "aim",
        range: 3,
        maxRange: 9,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 130,
        style: "charm",
        defaults: { kiss: false },
        fields: [
            flag("kiss", "飞吻")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[charmId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(charmId, "tempo", context)),
                recover: p(charmId, "recover", context),
                cooldown: Math.round(p(charmId, "recharge", context)),
                active: 1,
                range: p(charmId, "charmRange", context)
            };
        },
        // 两种送法都是自由瞄准：贴近按提交朝向铺扇、飞吻按方向直飞，空放合法，不强制先有目标。
        windup: function (action, config, prepare) {
            const sense = action.sense(), self = action.actor(), selfBody = sense.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const target = action.target();
            const at = target !== null && sense.valid(target) ? sense.observe(target) : null;
            const to = at === null ? action.direction() : at.position().minus(origin);
            const direction = WorldGeometry.flatUnit(to, action.direction());
            action.present("charm-windup", charmScene, 1, origin,
                JSON.stringify({ moment: "windup", kiss: config && config.kiss ? 1 : 0,
                    direction: [direction.x(), direction.y(), direction.z()],
                    range: p(charmId, "charmRange", action), angle: charmFanAngle,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const kiss = !!(config && config.kiss);
            let range = kiss ? 6 : 2;
            if (pokemon) {
                const context: NumberContext = { pokemon: pokemon, skill: skills[charmId], detail: { values: config } };
                range = p(charmId, "charmRange", context);
            }
            return kiss
                ? { radius: range, geometry: "line", style: "charm", color: 0xF28FB0, label: "撒娇·飞吻" }
                : { radius: range, geometry: "cone", spread: charmFanAngle, style: "charm", color: 0xF28FB0, label: "撒娇" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(2, Math.round(p(charmId, "drop", action))));
            const linger = Math.max(80, Math.round(p(charmId, "heartTicks", action)));
            const hearts = Math.max(12, Math.round(p(charmId, "hearts", action)));
            const kiss = !!(config && config.kiss);
            sound(action, kiss ? "minecraft:entity.allay.ambient_without_item" : "minecraft:entity.cat.purr");

            // 贴近撒娇：以提交朝向为轴铺一小片真实身体扇面，最多接纳 3 个看得见、非友方、没有墙隔开的身体。
            if (!kiss) {
                const range = Math.max(1.0, p(charmId, "charmRange", action));
                const direction = WorldGeometry.flatUnit(aim(action), action.direction());
                const region = WorldGeometry.bodySector(origin, direction, range, charmFanAngle, { below: 2, above: 3 });
                let hits = 0;
                WorldGeometry.selectBodies(world, region, function (other, facts) {
                    if (hits >= charmFanTargets) return;
                    if (String(other.key()) === String(self.key())) return;
                    if (facts.friendly() || !facts.visible()) return;
                    if (WorldGeometry.blockHit(world, origin, world.closestPoint(other, origin)) !== null) {
                        WorldFeedback.emit(world, charmScene, 1, facts.position(),
                            { moment: "blocked", target: String(other.ref()) }, 20);
                        return;
                    }
                    if (charmApply(world, other, drop, linger, hearts, false)) hits++;
                });
                // 单次扇面：无论有没有淋到人，这一记朝前的扇缘都照画，空放也有回执。
                WorldFeedback.emit(world, charmScene, 1, origin,
                    { moment: "arc", point: [origin.x(), origin.y(), origin.z()],
                        direction: [direction.x(), direction.y(), direction.z()],
                        range: range, inner: Math.max(0, range - 0.18), angle: charmFanAngle, hits: hits, hearts: hearts }, 26);
                done(action);
                return;
            }

            // 飞吻：一个缓慢直飞的心形弹体，只在首个合法敌人命中时降一级；友方／方块截住即碎。
            const direction = aim(action);
            const speed = Math.max(0.25, p(charmId, "kissSpeed", action));
            const radius = Math.max(0.18, p(charmId, "heartRadius", action));
            const scenes = WorldFeedback.actionScenes(charmScene);
            let settled = false;
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, lifetime: 120, direction: direction,
                appearance: {
                    sprite: "cobblemon:particle/generic/status/infatuation_heart",
                    scale: Math.max(0.5, Math.min(1.4, 0.8 + hearts * 0.008)), glow: true, hitAllies: true
                },
                impact: function (current, hit) {
                    if (settled) return;
                    settled = true;
                    const scope = current.world();
                    scenes.stop(current, "travel");
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        charmApply(scope, victim, drop, linger, hearts, true);
                        return;
                    }
                    // 撞到方块或友方：碎掉，不降任何东西。
                    const wall = hit.blocked();
                    const at = hit.position();
                    WorldFeedback.emit(scope, charmScene, 1, at, { moment: "blocked" }, 20);
                    sound(current, "minecraft:block.glass.break");
                }
            }, function (current) { scenes.finish(current, done); });
            scenes.show(action, "travel", origin, {
                moment: "travel", projectile: flight, hearts: hearts,
                target: action.target() === null ? "" : String(action.target()!.ref())
            });
        }
    });
}
