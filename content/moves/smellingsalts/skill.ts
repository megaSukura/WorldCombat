/**
 * 清醒 / smellingsalts 的出手方式。
 *
 * 核心念头：把一粒呛人的盐拍在对手脸上——麻痹的神经被这一激，痛感翻倍，但人也因此清醒过来。
 *   它是一记「打醒别人的终结技」：趁对手麻痹的窗口一口气打重，代价是解除了自己的控制。
 *
 * 两幕：
 *   起（windup，提交前）：指间捏起盐晶、白屑向内聚，目标是否麻痹一目了然（present pouch）。
 *   拍（execute）：贴身一掌，trace 撞上活体即结算 `salts` 接触伤害；
 *       目标正麻痹时翻倍、命中后解除其麻痹（浮出「清醒！」），粗盐式再留下一段踉跄；否则只当一记普通拍击。
 *
 * 与同族分开：清醒读的是**目标当前的状态**（麻痹），不是时间里的伤；它翻倍的同时把目标治好，
 *   是唯二效果相反的一招。恶意追击、报复、雪崩读的都是过去被打的事。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: smellingsaltsId,
        cooldownParameter: "recharge",
        name: "Smelling Salts",
        description: "把盐拍在对手脸上：目标正麻痹时这一记威力翻倍，但命中后也会解除它的麻痹。粗盐式还会留下一段踉跄。",
        uses: ["趁对手麻痹时打出翻倍的一记", "把麻痹中的目标一次性打重", "用粗盐让刚清醒的目标再踉跄一阵"],
        kind: "enemy",
        range: 3.2,
        maxRange: 4.6,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "normal",
        defaults: { coarse: false, ai: { maxChase: 7, wake: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(smellingsaltsId, "radius", pokemon) * 1.5 : 0.5, geometry: "line", style: "normal", color: 0xF2E6B0,
                label: config && config.coarse === true ? "清醒·粗盐" : "清醒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[smellingsaltsId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(smellingsaltsId, "start", context)),
                recover: Math.round(p(smellingsaltsId, "settle", context)),
                cooldown: Math.round(p(smellingsaltsId, "recharge", context)),
                active: 0,
                range: p(smellingsaltsId, "reach", context) + 0.5
            };
        },
        windup: function (action, config, prepare) {
            const numb = smellingsaltsNumb(factContext(action)) > 0;
            const puff = Math.round(p(smellingsaltsId, "puff", action));
            action.present("smellingsalts:pouch", smellingsaltsScene, 1, action.origin(),
                JSON.stringify({ moment: "pouch", numb: numb ? 1 : 0, coarse: config && config.coarse === true, puff: puff, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(smellingsaltsScene);
            const direction = aim(action);
            const length = p(smellingsaltsId, "reach", action);
            const step = p(smellingsaltsId, "step", action);
            const radius = p(smellingsaltsId, "radius", action);
            const push = p(smellingsaltsId, "push", action);
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.30));
            const coarse = config && config.coarse === true;
            const stagger = Math.max(1, Math.round(p(smellingsaltsId, "stagger", action)));
            let travelled = 0;

            sound(action, "minecraft:block.snow.break");
            movementScenes.show(action, "slap", action.origin(), { moment: "slap", direction: [direction.x(), direction.y(), direction.z()],
                    puff: Math.round(p(smellingsaltsId, "puff", action)), scale: scale });

            function advance(current: CombatAction): void {
                const scope = current.world(), here = current.origin();
                const delta = direction.scale(Math.min(step, length - travelled));
                const swept = sweepStep(current, delta, radius);
                const hit = swept.hit;
                if (hit.hitEntity()) {
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        const numb = smellingsaltsNumb(factContext(current)) > 0;
                        const power = p(smellingsaltsId, "salts", current);
                        const puff = Math.round(p(smellingsaltsId, "puff", current));
                        const spark = Math.round(p(smellingsaltsId, "spark", current));
                        const landed = impact(current, hit, smellingsaltsId, power, { damage: damageSpec(smellingsaltsId, "salts"), contact: true });
                        let cured = false;
                        if (landed) {
                            const away = hit.position().minus(here);
                            if (away.length() > 0.05 && scope.valid(victim)) scope.displace(victim, away.unit().scale(push));
                            if (numb && CombatStatus.cure(scope, victim, "paralysis")) {
                                cured = true;
                                if (coarse) scope.marker(victim, "minecraft:slowness", stagger, 0);
                            }
                        }
                        WorldFeedback.emit(scope, smellingsaltsScene, 1, hit.position(),
                            { moment: numb ? "wake" : "plain", target: String(victim.ref()), numb: numb ? 1 : 0, cured: cured ? 1 : 0,
                                coarse: coarse ? 1 : 0, power: Math.round(power * 10) / 10,
                                puff: numb ? puff : Math.round(puff * 0.6), spark: cured ? spark : 0, scale: scale,
                                intensity: Math.max(0.6, Math.min(2.2, power / 70)) }, 28);
                        scope.sound(numb ? "cobblemon:move.powder.target" : "cobblemon:impact.normal", hit.position(), 16, "{}");
                        WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.1, 0)),
                            numb ? smellingsaltsWakeText : smellingsaltsHitText, [], 26);
                    }
                    movementScenes.finish(current, done);
                    return;
                }
                const moved = swept.moved;
                travelled += moved;
                if (hit.blocked() || moved < 0.05 || travelled >= length) {
                    WorldFeedback.emit(scope, smellingsaltsScene, 1, current.origin(), { moment: "miss", scale: scale }, 18);
                    WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.0, 0)), smellingsaltsMissText, [], 24);
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
