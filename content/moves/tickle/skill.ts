/**
 * 挠痒 / Tickle — 执行组织。
 *
 * 核心念头：贴到身上挠，把「笑」当作打断——手指够不到人就没有这一招，所以它是本组射程最短的一招，
 *   换来的是物攻与物防同时垮掉，贴身对拼的人会瞬间软下来。
 *
 * 出手：短起手在指尖跳起碎点，准备末尾就朝双方真实的最近接触方向亮出两三道短弯痕，把「手已经伸过去」画出来。
 * 命中：提交后沿施法者到目标的直线做一次真实接触判定（action.trace），重查距离与视线；目标退开或被墙隔断就挠空，
 *       不隔空落减益。真正贴上才挂共享的 world_combat:ticklish_fit（身份 world_combat:status/ticklish）、抖出碎点，
 *       再 NativeEffects.boost 分别下降攻击与防御；宝可梦损失原生等级，其他生物落到攻击与护甲属性。
 * 轻／猛：猛挠把两项各再多降一级、痕数更多、笑得更久，但起手与冷却明显更长。
 * 反制：拉开到 reach 之外就挠不到；它不造成伤害，也不阻止对方脱身。
 */
namespace PokemonSkills {
    function tickleAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    /** 从施法者身体指向目标身体的水平单位方向；没有水平长度时用默认朝向。 */
    function tickleDirection(delta: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(delta.x(), 0, delta.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    /** 一道短弯痕：贴着接触点、朝爪锋方向弓起；几道并排就是一次挠。判定与表现共用这道顶点。 */
    function tickleClawPath(centre: CombatPoint, strike: CombatPoint, index: number, marks: number, span: number): number[][] {
        const side = WorldCombat.point(-strike.z(), 0, strike.x());
        const offset = (index - (marks - 1) / 2) * (marks > 1 ? span / (marks - 1) : 0);
        const half = 0.34, bend = 0.12;
        const a = centre.plus(side.scale(offset - half)).plus(strike.scale(-bend));
        const b = centre.plus(side.scale(offset)).plus(strike.scale(bend));
        const c = centre.plus(side.scale(offset + half)).plus(strike.scale(-bend));
        return [[a.x(), a.y(), a.z()], [b.x(), b.y(), b.z()], [c.x(), c.y(), c.z()]];
    }

    define({
        id: tickleId,
        cooldownParameter: "recharge",
        name: "挠痒",
        description: "贴上去挠对手的痒，近身削掉它的攻击与防御；本身不造成伤害。必须贴到身上才够得到；猛挠降得更多、痒意更久，但起手与冷却都更长。",
        uses: ["瓦解贴身的物理输出", "在缠斗里同时削掉对方的攻击与防御", "配合队友抢先手压制近战"],
        kind: "enemy",
        range: 2,
        maxRange: 3,
        prepare: 8,
        active: 1,
        recover: 5,
        cooldown: 120,
        style: "tickle",
        defaults: { firm: false },
        fields: [
            flag("firm", "猛挠")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[tickleId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(tickleId, "tempo", context)),
                recover: p(tickleId, "recover", context),
                cooldown: Math.round(p(tickleId, "recharge", context)),
                active: 1,
                range: p(tickleId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const sense = action.sense(), self = action.actor(), target = action.target();
            const firm = !!(config && config.firm);
            const marks = Math.max(2, Math.min(3, Math.round(p(tickleId, "atkDrop", action))));
            let point = action.origin(), direction: number[] = [];
            // 准备末尾读双方当下位置：短抓挠按真实的最近接触方向先亮出来。
            if (target !== null && sense.valid(target)) {
                const me = sense.observe(self), at = sense.observe(target);
                if (me !== null && at !== null) {
                    const strike = tickleDirection(at.position().minus(me.position()));
                    direction = [strike.x(), 0, strike.z()];
                    point = me.position().plus(strike.scale(Math.max(1.6, p(tickleId, "reach", action)) * 0.6));
                }
            }
            action.present("tickle-windup", tickleScene, 1, point,
                JSON.stringify({ moment: "reach", firm: firm ? 1 : 0, marks: marks, direction: direction,
                    target: target === null ? "" : String(target.ref()) }));
            return prepare;
        },
        indicator: function (config) {
            const firm = !!(config && config.firm);
            return { radius: firm ? 2.6 : 2.2, geometry: "line", style: "tickle", color: 0xF2C94C,
                label: firm ? "挠痒·猛挠" : "挠痒" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const atkDrop = Math.max(1, Math.min(3, Math.round(p(tickleId, "atkDrop", action))));
            const defDrop = Math.max(1, Math.min(3, Math.round(p(tickleId, "defDrop", action))));
            const giggle = Math.max(60, Math.round(p(tickleId, "giggleTicks", action)));
            const sparks = Math.max(8, Math.round(p(tickleId, "sparks", action)));
            const firm = !!(config && config.firm);
            sound(action, "minecraft:entity.cat.purr");
            const target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, tickleScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const selfBody = world.observe(self), at = world.observe(target);
            if (selfBody === null || at === null) {
                WorldFeedback.emit(world, tickleScene, 1, action.targetPosition(), { moment: "fizzle" }, 16);
                done(action);
                return;
            }
            const reach = Math.max(1.6, p(tickleId, "reach", action));
            const from = selfBody.position(), to = at.position();
            const strike = tickleDirection(to.minus(from));
            const marks = Math.max(2, Math.min(3, atkDrop));
            const span = Math.max(0.18, Math.min(0.7, (selfBody.width() + at.width()) * 0.25));
            const half = Math.max(0.18, Math.min(0.6, selfBody.width() * 0.4));
            // 结算时重查距离与视线：目标退开就够不到，隔着墙第一条接触也不是目标，都算挠空。
            if (to.minus(from).length() > reach + 0.6) {
                WorldFeedback.emit(world, tickleScene, 1, from.plus(strike.scale(reach * 0.6)),
                    { moment: "whiff", direction: [strike.x(), 0, strike.z()], marks: marks, firm: firm ? 1 : 0 }, 20);
                done(action);
                return;
            }
            const contact = action.trace(from, to, half);
            const lander = contact.hitEntity() ? contact.target() : null;
            const landed = lander !== null && String(lander.ref()) === String(target.ref());
            if (!landed) {
                // 撞在墙上：只在真实接触的方块面留几道碎石；纯落空则是一记划空。
                if (contact.blockPosition() !== null) {
                    WorldFeedback.emit(world, tickleScene, 1, contact.position(),
                        { moment: "scrape", direction: [strike.x(), 0, strike.z()], marks: marks, face: contact.blockFace() }, 18);
                } else {
                    WorldFeedback.emit(world, tickleScene, 1, contact.position(),
                        { moment: "whiff", direction: [strike.x(), 0, strike.z()], marks: marks, firm: firm ? 1 : 0 }, 20);
                }
                done(action);
                return;
            }
            // 真的贴上了：身份、双降都落在这次接触的位置上，目标才抖出碎点。
            const hitPoint = contact.position();
            MobEffects.apply(world, target, tickleEffect, giggle, 0);
            NativeEffects.boost(world, target, "atk", -atkDrop);
            NativeEffects.boost(world, target, "def", -defDrop);
            for (let index = 0; index < marks; index++)
                WorldFeedback.emit(world, tickleScene, 1, hitPoint,
                    { moment: "claw", path: tickleClawPath(hitPoint, strike, index, marks, span),
                        index: index, marks: marks, firm: firm ? 1 : 0 }, 16);
            WorldFeedback.emit(world, tickleScene, 1, at.position(),
                { moment: "fit", target: String(target.ref()), firm: firm ? 1 : 0,
                    atkDrop: atkDrop, defDrop: defDrop, sparks: sparks }, 30);
            WorldFeedback.text(world, tickleAbove(at.position()), "world_combat.move.tickle.text.fit", [atkDrop, defDrop], 40);
            world.sound("minecraft:entity.allay.ambient_with_item", at.position(), 14, "{}");
            done(action);
        }
    });

    // 痒意未消期间，目标身上持续冒起笑意碎点。
    WorldCombat.on("world_combat:move_tickle/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== tickleEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 6 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "tickle:" + String(actor.ref()), tickleScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 20);
    });
}
