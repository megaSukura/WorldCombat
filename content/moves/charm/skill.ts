/**
 * 撒娇 / Charm — 执行组织。
 *
 * 核心念头：凑近一个对手，用撒娇把它的战意拖进心软里——它下不去手，攻击大幅下降；目光落在谁身上，
 *   谁才会中招。贴近撒娇卸得深，飞吻够得远，两者不能兼得。
 *
 * 两幕：
 *   起（windup 播「抬眼」，提交前只观察与预告，可被打断，打断不花代价）。
 *   中（提交后）：
 *     · 贴近撒娇：目光落在一个看得见的对手身上，直接挂共享的 world_combat:charm_heart
 *       （身份 world_combat:status/charmed）并 NativeEffects.boost 下降两级攻击；一串心沿视线飞进对手心里。
 *     · 飞吻：一个缓慢直飞的真实心形弹体从身前送出（LivingActions.projectile，无追踪）。它只在**首个合法敌人**
 *       命中时降一级攻击；撞到方块或友方就被截住、碎掉，不降任何东西。能空放、能点地、能点人。
 * 视线：贴近模式要求 world.clear 通视；被掩体挡住时只播 blocked，不掉任何东西。飞吻的飞行本身会被掩体挡下。
 * 反制：贴近要绕出掩体；飞吻够慢，横移能躲、友方能挡；只有单体，也拦不住另一边的敌人。
 */
namespace PokemonSkills {
    function charmAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

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

    /** 把这次撒娇落到一个目标身上：挂身份、扣攻击、挂托管余韵并播命中表现。 */
    function charmApply(world: CombatWorld, target: CombatActor, drop: number, linger: number, hearts: number, kiss: boolean): void {
        const body = world.observe(target);
        if (body === null) return;
        MobEffects.apply(world, target, charmEffect, linger, 0);
        NativeEffects.boost(world, target, "atk", -drop);
        if (world.effects(target, charmLingerMark).length === 0)
            world.effect(charmLingerMark, target, "{}", Math.max(1, Math.min(2400, linger)));
        WorldFeedback.emit(world, charmScene, 1, body.position(),
            { moment: kiss ? "kiss" : "cast", target: String(target.ref()),
                drop: drop, hearts: hearts, kiss: kiss ? 1 : 0 }, 30);
        WorldFeedback.text(world, charmAbove(body.position()), "world_combat.move.charm.text.charm", [drop], 36);
    }

    define({
        id: charmId,
        cooldownParameter: "recharge",
        name: "撒娇",
        description: "凑近一个看得见的对手撒娇，把它的战意拖软，大幅降低它的攻击；被掩体挡住就落空。也可以改送飞吻：一个缓慢直飞的心形弹体，够得更远，只在首个被它命中的敌人身上降一级攻击，被友方或方块截住就碎了。",
        uses: ["让追上来的物攻威胁出手变软", "在它冲上来前先把它的攻击压下去", "用飞吻在稍远处补一记削弱"],
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
        ready: function (action, config) {
            // 飞吻是自由瞄准，空放合法；贴近撒娇必须有一个看得见的合法对手。
            if (config && config.kiss) return "";
            const world = action.sense(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) return "invalid-target";
            const body = world.observe(target);
            if (body === null) return "target-left";
            return world.clear(action.origin(), body.position()) ? "" : "target-not-visible";
        },
        windup: function (action, config, prepare) {
            action.present("charm-windup", charmScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", kiss: config && config.kiss ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const kiss = !!(config && config.kiss);
            return { radius: kiss ? 8 : 3, geometry: "line", style: "charm", color: 0xF28FB0,
                label: kiss ? "撒娇·飞吻" : "撒娇" };
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

            // 贴近撒娇：目光落在谁身上谁中招，被掩体挡住就落空。
            if (!kiss) {
                const target = action.target();
                if (target === null || !world.valid(target) || world.friendly(target)) {
                    WorldFeedback.emit(world, charmScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                    done(action);
                    return;
                }
                const at = world.observe(target);
                const point = at === null ? action.targetPosition() : at.position();
                if (!world.clear(origin, point)) {
                    WorldFeedback.emit(world, charmScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                    WorldFeedback.text(world, charmAbove(point), "world_combat.move.charm.text.blocked", [], 30);
                    done(action);
                    return;
                }
                charmApply(world, target, drop, linger, hearts, false);
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
                    const at = wall && hit.blockPosition() !== null ? hit.blockPosition()! : hit.position();
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
