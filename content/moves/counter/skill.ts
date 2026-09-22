/**
 * 双倍奉还 / counter 的出手方式。
 *
 * 核心念头：把对手打来的物理重击记在心里，在账还算新鲜时迎上去，把那份力道原样加倍打回去。
 *
 * 两幕：
 *   起（windup，提交前）：低身收势，格斗气从受过击的位置聚到拳上；账越大聚得越多（present brace）。
 *   回击（execute）：迎向目标逐刻推进，撞上的一刻按账本直接结算返还伤害，并把目标顶开；
 *       没有账可讨则收势落空（whiff）。
 *
 * 与同族分开：双倍奉还只认物理、贴身迎击、并把目标顶开；镜面反射只认特殊、隔空把能量射回去。
 */
namespace PokemonSkills {
    define({
        id: counterId,
        name: "Counter",
        description: "把最近受到的物理伤害以两倍返还给对手；没有账可讨时这一记落空。",
        uses: ["挨了一记物理重击后立刻还回去", "惩罚贴身高攻的对手", "把自己承受的伤害转成输出"],
        kind: "enemy",
        range: 3.2,
        maxRange: 6,
        prepare: 4,
        active: 0,
        recover: 7,
        cooldown: 30,
        style: "counter",
        defaults: { deepbreath: false, ai: { maxChase: 8 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(counterId, "collisionRadius", pokemon) * 1.5, geometry: "line", style: "counter", color: 0xE08A3C,
                label: config && config.deepbreath === true ? "双倍奉还·沉势" : "双倍奉还" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[counterId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(counterId, "grit", context)),
                recover: Math.round(p(counterId, "settle", context)),
                cooldown: Math.round(p(counterId, "recharge", context)),
                active: 0,
                range: p(counterId, "dash", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const record = counterRecord(action.sense(), action.actor());
            const amount = record === null ? 0 : record.amount;
            action.present("counter:brace", counterScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", gather: Math.round(12 + Math.min(72, amount * 0.6)),
                    deep: config && config.deepbreath === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const refund = Math.round(p(counterId, "refund", action));
            counterConsume(self);
            if (!(refund > 0)) {
                sound(action, "minecraft:entity.player.attack.sweep");
                WorldFeedback.emit(world, counterScene, 1, action.targetPosition(), { moment: "whiff" }, 22);
                WorldFeedback.text(world, action.targetPosition().plus(WorldCombat.point(0, 1, 0)), counterWhiffText, [], 24);
                done(action);
                return;
            }

            const direction = aim(action);
            const length = p(counterId, "dash", action);
            const step = p(counterId, "speed", action);
            const radius = p(counterId, "collisionRadius", action);
            const push = p(counterId, "push", action);
            const scale = radius / 0.42;
            let travelled = 0;

            sound(action, "minecraft:entity.vex.charge");

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const hit = current.trace(here, here.plus(delta.scale(p(counterId, "traceAhead", current))), radius);
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const count = Math.round(14 + refund / 2);
                        const landed = counterRawHit(current, victim, refund, true);
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (away.length() > 0.05) scope.displace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, counterScene, 1, hit.position(),
                            { moment: "strike", target: String(victim.ref()), count: count, scale: scale,
                                power: Math.round(refund * 10) / 10 }, 30);
                        scope.sound("cobblemon:impact.fighting", hit.position(), 16, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)), counterHitText,
                            [Math.round(refund)], 26);
                    }
                    done(current);
                    return;
                }
                const moved = scope.displace(current.actor(), delta);
                travelled += moved;
                if (hit.blocked() || moved < p(counterId, "minimumMove", current) || travelled >= length) { done(current); return; }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
