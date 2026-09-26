/**
 * 以牙还牙 / payback 的出手方式。
 *
 * 核心念头：先把对手打来的那一下记在心里，再带着这份郁结迎上去一记回击——对手越是刚动过手，这一记越重。
 *
 * 三幕：
 *   起（windup，提交前）：低身收势，暗色能量从受过伤的位置聚到一侧；伤得越重，聚得越多（present gather）。
 *   迎（gait）：朝选定方向/对手短促沉重地迎上前，脚边沿真实落点留下脚痕与尘；撞上就结算。
 *   回击（execute）：撞上的一刻结算 payback；若目标在窗口内先动过手则翻倍，
 *       画面换成更暗更密的一记并浮出「以牙还牙！」，随后把目标顶开、脚下顿出一圈收势尘；扑空则原地收势。
 *
 * 选取：`kind: "aim"`——方向或世界点都能放，瞄空也成立；不要求提交时存在敌人。
 *       反算翻倍只按实际碰到的那个对象判断，普通敌人照常吃普通一击，不伪称反击。
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
        kind: "aim",
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
            const movementScenes = WorldFeedback.actionScenes(paybackScene);
            // 迎步贴地走：方向取水平分量，避免身体贴着地面时被地面挡下。
            const aimed = aim(action);
            const flat = WorldCombat.point(aimed.x(), 0, aimed.z());
            const direction = flat.length() > 0.001 ? flat.unit() : aimed;
            const length = p(paybackId, "dash", action);
            const step = p(paybackId, "speed", action);
            const radius = p(paybackId, "collisionRadius", action);
            const push = p(paybackId, "push", action);
            const scale = radius / 0.42;
            let travelled = 0, settled = false;

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                movementScenes.finish(current, done);
            }

            sound(action, "minecraft:entity.vex.charge");

            function settleDust(current: CombatAction, power: number, doubled: boolean): void {
                const scope = current.world(), body = scope.observe(current.actor());
                if (body === null) return;
                WorldFeedback.emit(scope, paybackScene, 1, body.position(),
                    { moment: "settle", doubled: doubled ? 1 : 0, power: Math.round(power * 10) / 10,
                        count: Math.round(8 + Math.min(30, travelled * 4)), scale: scale }, 20);
            }

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        // Evaluate the whole power parameter against this exact victim, so a multi-target trace doubles per hit.
                        const aimed = withTarget(factContext(current), victim);
                        const power = p(paybackId, "payback", aimed);
                        const doubled = paybackReckoning(aimed) > 0;
                        const count = Math.round(12 + power / 3);
                        const landed = impact(current, hit, paybackId, power);
                        // 伤害被拒绝时不当成已命中：不推、不播、不冒称反击。
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (scope.valid(victim) && away.length() > 0.05) scope.hitDisplace(victim, away.unit().scale(push));
                            WorldFeedback.emit(scope, paybackScene, 1, hit.position(),
                                { moment: doubled ? "counter" : "strike", target: String(victim.ref()), doubled: doubled ? 1 : 0,
                                    power: Math.round(power * 10) / 10, count: count, scale: scale }, 30);
                            scope.sound(doubled ? "minecraft:entity.player.attack.strong" : "cobblemon:impact.dark", hit.position(), 16, "{}");
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)),
                                doubled ? paybackCounterText : paybackHitText, [], 26);
                            settleDust(current, power, doubled);
                        }
                    }
                    finish(current);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (moved > 0.001) {
                    // 真实脚痕：沿实际走过的落点铺出迎步的脚印与尘。
                    movementScenes.show(current, "gait", current.origin(),
                        { moment: "gait", direction: [direction.x(), direction.y(), direction.z()],
                            travelled: Math.round(travelled * 100) / 100, gait: Math.round(6 + travelled * 3), scale: scale });
                }
                if (hit.blocked() || moved < p(paybackId, "minimumMove", current) || travelled >= length) {
                    settleDust(current, 0, false);
                    finish(current);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
