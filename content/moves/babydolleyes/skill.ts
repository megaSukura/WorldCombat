/**
 * 圆瞳 / babydolleyes 的出手方式。
 *
 * 核心念头：睁大一双圆眼睛盯住对手，它举起的手先软下来——这一眼**足够快，抢在对手之前落下**。
 *
 * 两幕（一击完成）：
 *   睁眼（windup，提交前只观察与预告，可被打断，不花代价；起手极短，落成原生的 +1 先制）。
 *   看软（提交后）：按本次真实解析出的 gazeRange 重新复查距离、视线与敌我，只对一个看得见的合法目标
 *     挂共享身份 world_combat:status/charmed 的 world_combat:babydoll_eyes，并 NativeEffects.boost 下降攻击。
 *     只有等级真的掉下去才垂下小攻势符号；心软标记与头顶余韵由载体效果轻量维持。
 * 视线与距离：要求 world.clear 通视且在射程内；起手后跑出范围或被掩体挡住都落空，不再远程结算。
 * 反制：躲到掩体后、或用距离换掉这一次；只有单体，也拦不住另一边的敌人。
 *
 * 与同族分开：叫声是一圈听得见的范围、撒娇是贴身的深卸或远距的飞吻；圆瞳是**单体的、最快的先手一眼**，
 * 卸得不多但几乎总能先落下。
 */
namespace PokemonSkills {
    function babydolleyesAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1.1, 0)); }

    /**
     * 心软存续的托管载体：把「头顶持续浮起的眼波」绑在真实状态效果的生命周期上，
     * 自然到期、牛奶／`/effect clear` 提前拿掉都随它一起停，不靠自己的计时。
     */
    const babydolleyesLingerMark = "world_combat:move_babydolleyes/linger_mark";

    WorldCombat.effect(babydolleyesMark, 1, 1200, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.glints !== "number" || !isFinite(value.glints) || value.glints <= 0) throw new Error("Invalid babydolleyes mark: glints");
        if (typeof value.drop !== "number" || !isFinite(value.drop) || value.drop < 0) throw new Error("Invalid babydolleyes mark: drop");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(babydolleyesMark, "start", function () { });
    WorldCombat.effectHandler(babydolleyesMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 只读本次施法者自己留下的那份标记；别人的心软不参与本招的显示与刷新。 */
    function babydolleyesMarkOf(world: CombatWorld, actor: CombatActor): any {
        const views = world.effects(actor, babydolleyesMark), owner = String(world.source().key());
        for (let i = 0; i < views.length; i++) if (String(views[i].source().key()) === owner) return JSON.parse(String(views[i].data()));
        return null;
    }
    function babydolleyesReleaseMark(world: CombatWorld, actor: CombatActor): void {
        const owner = String(world.source().key());
        world.effects(actor, babydolleyesMark).forEach(function (view) {
            if (String(view.source().key()) === owner) world.operation(view.id(), "world_combat:dispel", "{}");
        });
    }

    function babydolleyesLingerWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = world.mobEffect(target, babydolleyesEffect);
        if (carrier === null) { effect.end(); return; }
        const mark = babydolleyesMarkOf(world, target);
        // 本载体就是本 source 创建的托管效果，presentOn 随它一起清理。
        WorldFeedback.onEffect(world, effect.id(), "linger", babydolleyesScene, 1, body.position(),
            { moment: "linger", target: String(target.ref()), glints: mark ? mark.glints : 12, drop: mark ? mark.drop : 0 });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 20, "{}");
    }
    WorldCombat.effect(babydolleyesLingerMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (value === null || typeof value !== "object") throw new Error("Invalid babydoll eyes linger mark");
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(babydolleyesLingerMark, "start", babydolleyesLingerWatch);
    WorldCombat.effectHandler(babydolleyesLingerMark, "watch", babydolleyesLingerWatch);
    WorldCombat.effectHandler(babydolleyesLingerMark, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 状态被牛奶／/effect clear 提前拿掉时，立即撤掉托管表现，不等它自己的下一次巡检。
    WorldCombat.on("world_combat:move_babydolleyes/linger-release", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== babydolleyesEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, babydolleyesLingerMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    /** 判定与表现读同一组身体中心：起手后逃离的敌人不再被远程结算。 */
    function babydolleyesGap(a: CombatPoint, b: CombatPoint): number {
        const dx = b.x() - a.x(), dy = b.y() - a.y(), dz = b.z() - a.z();
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    define({
        id: babydolleyesId,
        cooldownParameter: "recharge",
        name: "圆瞳",
        description: "睁大圆眼睛凝视一个看得见的对手，压低它的攻击；需要视线，被掩体挡住就落空。起手极短，几乎总能先落下；改成凝视可以卸得更深更久，但会慢一些。",
        uses: ["被追上来的物攻威胁逼住时先压低它", "在它出手前抢一记先手削弱", "配合队友把一只近身威胁的出手压软"],
        kind: "enemy",
        range: 4,
        maxRange: 7,
        prepare: 5,
        active: 1,
        recover: 4,
        cooldown: 70,
        style: "gaze",
        defaults: { stare: false },
        fields: [flag("stare", "凝视")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[babydolleyesId], detail: { values: config }, world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.max(1, Math.round(p(babydolleyesId, "tempo", context))),
                recover: Math.round(p(babydolleyesId, "recover", context)),
                cooldown: Math.round(p(babydolleyesId, "recharge", context)),
                active: 1,
                range: p(babydolleyesId, "gazeRange", context)
            };
        },
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(babydolleyesId, "gazeRange", pokemon) : 4, geometry: "line", style: "gaze",
                color: 0xF7A8C4, label: config && config.stare ? "圆瞳·凝视" : "圆瞳" };
        },
        windup: function (action, config, prepare) {
            const target = action.target();
            action.present("world_combat:move_babydolleyes:windup", babydolleyesScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", stare: config && config.stare ? 1 : 0,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const drop = Math.max(1, Math.min(2, Math.round(p(babydolleyesId, "drop", action))));
            const soften = Math.max(60, Math.round(p(babydolleyesId, "softenTicks", action)));
            const glints = Math.max(8, Math.round(p(babydolleyesId, "glints", action)));
            // 用本次能力真正解析出的凝视距离复查：起手后逃离的敌人落空，不再远程降攻。
            const range = Math.max(1, p(babydolleyesId, "gazeRange", action));
            const stare = !!(config && config.stare);
            sound(action, "minecraft:entity.cat.purr");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, babydolleyesScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const at = world.observe(target);
            if (at === null) {
                WorldFeedback.emit(world, babydolleyesScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const point = at.position();
            if (babydolleyesGap(origin, point) > range || !world.clear(origin, point)) {
                WorldFeedback.emit(world, babydolleyesScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, babydolleyesAbove(point), babydolleyesBlockedText, [], 28);
                done(action);
                return;
            }
            const applied = MobEffects.apply(world, target, babydolleyesEffect, soften, 0);
            if (applied === null) {
                WorldFeedback.emit(world, babydolleyesScene, 1, point, { moment: "blocked", target: String(target.ref()) }, 20);
                WorldFeedback.text(world, babydolleyesAbove(point), babydolleyesWardedText, [], 28);
                done(action);
                return;
            }
            // 状态拒绝与等级实际下降分开：boost 返回本次真实落下的带符号级数，取绝对值才是降了几级。
            const dropped = Math.abs(NativeEffects.boost(world, target, "atk", -drop));
            babydolleyesReleaseMark(world, target);
            world.effect(babydolleyesMark, target, JSON.stringify({ glints: glints, drop: dropped }), soften);
            if (world.effects(target, babydolleyesLingerMark).length === 0)
                world.effect(babydolleyesLingerMark, target, "{}", Math.max(1, Math.min(2400, soften)));
            WorldFeedback.emit(world, babydolleyesScene, 1, point,
                { moment: "gaze", path: [String(self.ref()), String(target.ref())], target: String(target.ref()),
                    drop: dropped, glints: glints, stare: stare ? 1 : 0, scale: stare ? 1.25 : 1 }, 30);
            if (dropped !== 0)
                WorldFeedback.emit(world, babydolleyesScene, 1, point,
                    { moment: "drop", target: String(target.ref()), drop: dropped, glints: glints, scale: stare ? 1.25 : 1 }, 26);
            WorldFeedback.text(world, babydolleyesAbove(point),
                dropped !== 0 ? babydolleyesGazeText : babydolleyesCappedText,
                dropped !== 0 ? [dropped] : [], 34);
            done(action);
        }
    });
}
