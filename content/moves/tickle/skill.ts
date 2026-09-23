/**
 * 挠痒 / Tickle — 执行组织。
 *
 * 核心念头：贴到身上挠，把「笑」当作打断——手指够不到人就没有这一招，所以它是本组射程最短的一招，
 *   换来的是物攻与物防同时垮掉，贴身对拼的人会瞬间软下来。
 *
 * 出手：短起手（windup 在指尖跳起碎点）后提交；必须已经贴近目标。
 * 命中：目标挂共享的 world_combat:ticklish_fit（身份 world_combat:status/ticklish），
 *       再 NativeEffects.boost 分别下降攻击与防御；宝可梦损失原生等级，其他生物落到攻击与护甲属性。
 * 轻／猛：猛挠把两项各再多降一级、笑得更久，但起手与冷却明显更长，动作也更难打断别人。
 * 反制：拉开到 reach 之外就挠不到；它不造成伤害，也不阻止对方脱身。
 */
namespace PokemonSkills {
    function tickleAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    define({
        id: tickleId,
        cooldownParameter: "recharge",
        name: "挠痒",
        description: "贴上去挠对手的痒，把它逗到发笑，同时降低它的攻击和防御。必须近身，射程很短；猛挠降得更多、笑得更久，但起手与冷却都更长。",
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
            action.present("tickle-windup", tickleScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", firm: config && config.firm ? 1 : 0,
                    target: action.target() === null ? "" : String(action.target()!.ref()) }));
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
            const reach = Math.max(1.6, p(tickleId, "reach", action));
            const selfBody = world.observe(self), at = world.observe(target);
            if (selfBody !== null && at !== null && selfBody.position().minus(at.position()).length() > reach + 1.5) {
                // 够不到：挠了个空，不结算任何效果。
                WorldFeedback.emit(world, tickleScene, 1, at.position(), { moment: "fizzle", target: String(target.ref()) }, 18);
                done(action);
                return;
            }
            MobEffects.apply(world, target, tickleEffect, giggle, 0);
            NativeEffects.boost(world, target, "atk", -atkDrop);
            NativeEffects.boost(world, target, "def", -defDrop);
            if (at !== null) {
                WorldFeedback.emit(world, tickleScene, 1, at.position(),
                    { moment: "fit", target: String(target.ref()), firm: firm ? 1 : 0,
                        atkDrop: atkDrop, defDrop: defDrop, sparks: sparks }, 30);
                WorldFeedback.text(world, tickleAbove(at.position()), "world_combat.move.tickle.text.fit", [atkDrop, defDrop], 40);
            }
            world.sound("minecraft:entity.allay.ambient_with_item", at === null ? action.targetPosition() : at.position(), 14, "{}");
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
