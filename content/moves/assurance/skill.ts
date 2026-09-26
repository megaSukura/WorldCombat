/**
 * 恶意追击 / assurance 的出手方式。
 *
 * 核心念头：看准对手身上刚被撕开的伤口，压低身形从侧面追上去补一记；伤口还热着的时候，这一记翻倍。
 *
 * 两幕：
 *   起（windup，提交前）：伏低、锁定目标身上最近受创的位置，暗色羽毛在身侧拢起；带伤时羽尖泛红（present stalk）。
 *   追（execute）：沿瞄准方向逐刻推进，trace 撞上活体即结算 `ambush` 接触伤害并顶开；
 *       目标在窗口内受过伤时翻倍，画面换成更密更亮的一记并浮出「弱点追击！」；没追上就在前方散去。
 *
 * 与同族分开：恶意追击读的是**目标**的伤，是一记找缺口的追击；报复读「这个对手刚打过我」，
 *   雪崩读「我自己挨了多少」，清醒读目标的麻痹。四者翻倍的条件完全不同。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: assuranceId,
        cooldownParameter: "recharge",
        name: "Assurance",
        description: "追上去补一记：目标在最近一段时间内已经受过伤时，这一记威力翻倍；物攻与速度越高，追得越狠。",
        uses: ["补掉已经被同伴削过的目标", "在对手刚挨打的窗口里追上一记", "把残血目标从场上追出去"],
        kind: "enemy",
        range: 4.2,
        maxRange: 7,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "dark",
        defaults: { relentless: false, ai: { maxChase: 10, pounce: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(assuranceId, "radius", pokemon) * 1.5 : 0.7, geometry: "line", style: "dark", color: 0x5A3C86,
                label: config && config.relentless === true ? "恶意追击·穷追" : "恶意追击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[assuranceId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(assuranceId, "grit", context)),
                recover: Math.round(p(assuranceId, "settle", context)),
                cooldown: Math.round(p(assuranceId, "recharge", context)),
                active: 0,
                range: p(assuranceId, "dash", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const target = action.target();
            const quills = Math.round(p(assuranceId, "quills", action));
            let wounded = 0;
            if (target !== null && world.valid(target)) {
                const body = world.observe(target);
                if (body !== null) wounded = body.hurtAgo() <= p(assuranceId, "window", action) ? 1 : 0;
            }
            action.present("assurance:stalk", assuranceScene, 1, action.origin(),
                JSON.stringify({ moment: "stalk", wounded: wounded, relentless: config && config.relentless === true, quills: quills, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(assuranceScene);
            const direction = aim(action);
            const length = p(assuranceId, "dash", action);
            const step = p(assuranceId, "speed", action);
            const radius = p(assuranceId, "radius", action);
            const push = p(assuranceId, "push", action);
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.40));
            let travelled = 0;

            sound(action, "minecraft:entity.vex.charge");
            movementScenes.show(action, "lunge", action.origin(), { moment: "lunge", direction: [direction.x(), direction.y(), direction.z()],
                    quills: Math.round(p(assuranceId, "quills", action)), scale: scale });

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius), hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const hitContext = withTarget(factContext(current), victim);
                        const power = p(assuranceId, "ambush", hitContext);
                        const wounded = assuranceWounded(hitContext) > 0;
                        const quills = Math.round(p(assuranceId, "quills", current));
                        const landed = impact(current, hit, assuranceId, power, { damage: damageSpec(assuranceId, "ambush"), contact: true });
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (away.length() > 0.05 && scope.valid(victim)) scope.hitDisplace(victim, away.unit().scale(push));
                        }
                        WorldFeedback.emit(scope, assuranceScene, 1, hit.position(),
                            { moment: wounded ? "ambush" : "strike", target: String(victim.ref()), wounded: wounded ? 1 : 0,
                                power: Math.round(power * 10) / 10, quills: wounded ? quills : Math.round(quills * 0.55), scale: scale,
                                intensity: Math.max(0.6, Math.min(2.2, power / 70)) }, 28);
                        scope.sound(wounded ? "minecraft:entity.player.attack.crit" : "cobblemon:impact.dark", hit.position(), 16, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)),
                            wounded ? assuranceAmbushText : assuranceHitText, [], 26);
                    }
                    movementScenes.finish(current, done);
                    return;
                }
                const moved = swept.moved + (hit.hitEntity() && swept.remaining.length() > 0.001 ? scope.displace(current.actor(), swept.remaining) : 0);
                travelled += moved;
                if (hit.blocked() || moved < p(assuranceId, "minimumMove", current) || travelled >= length) {
                    WorldFeedback.emit(scope, assuranceScene, 1, current.origin(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.0, 0)), assuranceMissText, [], 24);
                    sound(current, "minecraft:entity.player.attack.nodamage");
                    movementScenes.finish(current, done);
                    return;
                }
                current.after(1, advance);
            }
            advance(action);
        }
    });
}
