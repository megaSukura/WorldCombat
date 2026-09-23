/**
 * 以牙还牙 / payback 的出手方式。
 *
 * 核心念头：先把对手打来的那一下记在心里，再带着这份郁结迎上去一记回击——对手越是刚动过手，这一记越重。
 *
 * 两幕：
 *   起（windup，提交前）：低身收势，暗色能量从受过伤的位置聚到拳上；伤得越重，聚得越多（present gather）。
 *   回击（execute）：迎向目标逐刻推进，撞上的一刻结算 payback；若目标在窗口内先动过手则翻倍，
 *       画面换成更暗更密的一记并浮出「以牙还牙！」；随后把目标顶开。
 *
 * 与同族分开：泄愤吃的是「自己被削弱」，以牙还牙吃的是「自己被打过」；一个向内积攒，一个向外记账。
 */
namespace PokemonSkills {
    const paybackHitText = "world_combat.move.payback.text.hit";
    const paybackCounterText = "world_combat.move.payback.text.counter";

    define({
        freeMovement: true,
        id: paybackId,
        cooldownParameter: "recharge",
        name: "Payback",
        description: "带着身上的伤迎上去回击：目标在自己的反算窗口内先动过手时，这一记威力翻倍；自己失去的生命越多，回击越重。",
        uses: ["被击中后立刻还以重手", "带伤时打出最重的一记", "把冲上来的对手顶开"],
        kind: "enemy",
        range: 3.2,
        maxRange: 6,
        prepare: 4,
        active: 0,
        recover: 7,
        cooldown: 30,
        style: "dark",
        defaults: { patient: false, ai: { maxChase: 8, punish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(paybackId, "collisionRadius", pokemon) * 1.5, geometry: "line", style: "dark", color: 0x8A6AD0,
                label: config && config.patient === true ? "以牙还牙·蓄势" : "以牙还牙" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[paybackId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(paybackId, "grit", context)),
                recover: Math.round(p(paybackId, "settle", context)),
                cooldown: Math.round(p(paybackId, "recharge", context)),
                active: 0,
                range: p(paybackId, "dash", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const body = action.sense().observe(action.actor());
            const missing = body === null || body.maxHealth() <= 0 ? 0 : 1 - body.health() / body.maxHealth();
            action.present("payback:gather", paybackScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", wound: Math.round(missing * 100) / 100,
                    gather: Math.round(16 + Math.max(0, Math.min(1, missing)) * 60),
                    patient: config && config.patient === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const direction = aim(action);
            const length = p(paybackId, "dash", action);
            const step = p(paybackId, "speed", action);
            const radius = p(paybackId, "collisionRadius", action);
            const push = p(paybackId, "push", action);
            const scale = radius / 0.42;
            let travelled = 0;

            sound(action, "minecraft:entity.vex.charge");

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(p(paybackId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        // Evaluate the whole power parameter against this exact victim, so a multi-target trace doubles per hit.
                        const aimed = withTarget(factContext(current), victim);
                        const power = p(paybackId, "payback", aimed);
                        const doubled = paybackReckoning(aimed) > 0;
                        const count = Math.round(12 + power / 3);
                        const landed = impact(current, hit, paybackId, power);
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, paybackScene, 1, hit.position(),
                            { moment: doubled ? "counter" : "strike", target: String(victim.ref()), doubled: doubled ? 1 : 0,
                                power: Math.round(power * 10) / 10, count: count, scale: scale }, 30);
                        scope.sound(doubled ? "minecraft:entity.player.attack.strong" : "cobblemon:impact.dark", hit.position(), 16, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)),
                            doubled ? paybackCounterText : paybackHitText, [], 26);
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(paybackId, "minimumMove", current) || travelled >= length) { done(current); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
