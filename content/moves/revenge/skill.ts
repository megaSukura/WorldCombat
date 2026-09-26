/**
 * 报复 / revenge 的出手方式。
 *
 * 核心念头：站住、侧步让开正面，把这一口刚被这个对手打出来的气，用一记横肘原样顶回去；
 *   是它本人下的手，这一肘就翻倍，并把它送开。
 *
 * 两幕：
 *   起（windup，提交前）：屈膝站定、肩头朝侧面稳住，一圈斗气从脚下收拢到肘上，被目标打过时肘面泛红（present brace）。
 *   还（execute）：`kind:"aim"`——先朝瞄准方向的侧面让出不超过半格的一步，再沿瞄准方向做一次
 *       `action.trace(..., true)` 横肘：第一个身体（含同伴）或实墙就是真实接触点。正中非友方时结算 `retort`
 *       接触伤害并把它沿肘势顶开；只有这名被害者本人就是最近打过施法者的人，这一记才翻倍、肘上伤口泛红。
 *       第三人挡路、撞墙、空放都不翻倍，也不把对原仇人的账算到别人头上。
 *
 * 与同族分开：报复读的是「这个人刚打过我」，是一记站定还肘、顶开最远；恶意追击读目标的伤（贴身追）、
 *   雪崩读自己累计的挨打（慢而广的冰崩）、清醒读目标的麻痹。
 */
namespace PokemonSkills {
    define({
        freeMovement: true,
        id: revengeId,
        cooldownParameter: "recharge",
        name: "Revenge",
        description: "被打之后站住还一记横肘：短而重，若最近一次挨打就来自这次被肘中的人本人，这一肘伤害翻倍，并把贴脸的人沿肘势顶开；第三人挡路、撞墙或够不到都不翻倍。",
        uses: ["被对手贴上打过之后立刻还一肘", "把冲上来的对手从身上顶开", "惩罚先手近身攻击自己的敌人"],
        kind: "aim",
        range: 2.6,
        maxRange: 3.4,
        prepare: 5,
        active: 0,
        recover: 8,
        cooldown: 30,
        style: "fighting",
        defaults: { endure: false, ai: { maxChase: 4, avenge: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(revengeId, "reach", pokemon) : 0.7, geometry: "line", style: "fighting", color: 0xE2662E,
                label: config && config.endure === true ? "报复·硬扛" : "报复" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[revengeId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(revengeId, "tempo", context)),
                recover: Math.round(p(revengeId, "settle", context)),
                cooldown: Math.round(p(revengeId, "recharge", context)),
                active: 0,
                range: p(revengeId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            const world = action.sense(), actor = action.actor();
            const grudge = revengeGrudge(factContext(action)) > 0;
            const smash = Math.round(p(revengeId, "smash", action));
            const self = world.observe(actor);
            let bruise = 0;
            if (self !== null) bruise = Math.max(0, Math.min(1, 1 - self.health() / Math.max(1, self.maxHealth())));
            action.present("revenge:brace", revengeScene, 1, action.origin(),
                JSON.stringify({ moment: "brace", grudge: grudge ? 1 : 0, endure: config && config.endure === true,
                    smash: smash, bruise: Math.round(bruise * 100) / 100, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scope = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const reach = p(revengeId, "reach", action);
            const shuffle = p(revengeId, "shuffle", action);
            const radius = p(revengeId, "radius", action);
            const push = p(revengeId, "push", action);
            const smash = Math.round(p(revengeId, "smash", action));
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.34));

            // 侧稳步：朝瞄准方向的侧面让开，墙或实体会限制实际距离（displace 返回真实位移）。
            const flat = Math.sqrt(direction.x() * direction.x() + direction.z() * direction.z());
            const side = flat < 0.001 ? WorldCombat.point(1, 0, 0)
                : WorldCombat.point(direction.z() / flat, 0, -direction.x() / flat);
            scope.displace(actor, side.scale(shuffle));

            const body = scope.observe(actor);
            const from = body === null ? action.origin() : body.position();
            const to = from.plus(direction.scale(reach));
            // 权威判定：第一个身体（含同伴）或实墙就是横肘真实停下的地方。
            const contact = action.trace(from, to, radius, true);
            const at = contact.position();
            const lander = contact.hitEntity() ? contact.target() : null;
            const victim = lander !== null && scope.valid(lander) && String(lander.ref()) !== String(actor.ref()) && !scope.friendly(lander) ? lander : null;
            const heading: number[] = [direction.x(), direction.y(), direction.z()];

            WorldFeedback.emit(scope, revengeScene, 1, at, { moment: "elbow", direction: heading, smash: smash, scale: scale }, 22);
            sound(action, "minecraft:entity.iron_golem.attack");

            if (victim !== null) {
                // 读真实受肘者：显式 target 优先，翻倍只看这个人。
                const hitContext = withTarget(factContext(action), victim);
                const grudge = revengeGrudge(hitContext) > 0;
                const power = p(revengeId, "retort", hitContext);
                const landed = impact(action, contact, revengeId, power, { damage: damageSpec(revengeId, "retort"), contact: true });
                if (landed) {
                    const away = at.minus(from);
                    if (away.length() > 0.05 && scope.valid(victim)) scope.hitDisplace(victim, away.unit().scale(push));
                } else {
                    // 伤害被拒（免疫等）：不声称命中，也不把对手当作被顶开。
                    WorldFeedback.emit(scope, revengeScene, 1, at, { moment: "miss", scale: scale }, 16);
                    sound(action, "minecraft:entity.player.attack.nodamage");
                    done(action);
                    return;
                }
                WorldFeedback.emit(scope, revengeScene, 1, at,
                    { moment: grudge ? "retort" : "impact", target: String(victim.ref()), grudge: grudge ? 1 : 0,
                        path: grudge ? [String(victim.ref()), "source"] : undefined,
                        power: Math.round(power * 10) / 10, smash: grudge ? smash : Math.round(smash * 0.6), scale: scale,
                        intensity: Math.max(0.6, Math.min(2.2, power / 70)) }, 28);
                scope.sound(grudge ? "cobblemon:impact.fighting" : "minecraft:entity.player.attack.strong", at, 16, "{}");
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)),
                    grudge ? revengeRetortText : revengeHitText, [], 26);
            } else if (lander !== null) {
                // 同伴或自己被肘住：肘停在身体上，不结算、不移动，也不声称打醒/翻倍。
                WorldFeedback.emit(scope, revengeScene, 1, at, { moment: "block", target: String(lander.ref()), scale: scale }, 18);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), revengeMissText, [], 24);
                sound(action, "minecraft:entity.player.attack.nodamage");
            } else {
                const blocked = contact.blocked();
                const point = blocked && contact.blockPosition() !== null ? contact.blockPosition()! : at;
                WorldFeedback.emit(scope, revengeScene, 1, point, { moment: "miss", scale: scale, blocked: blocked ? 1 : 0 }, 18);
                if (!blocked) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), revengeMissText, [], 24);
                sound(action, "minecraft:entity.player.attack.nodamage");
            }
            done(action);
        }
    });
}
