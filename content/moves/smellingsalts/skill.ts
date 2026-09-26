/**
 * 清醒 / smellingsalts 的出手方式。
 *
 * 核心念头：贴近伸手，把一把呛人的盐拍在对方脸上——麻痹的神经被这一激，痛感翻倍，但人也因此清醒过来。
 *   它是一记「打醒别人的终结技」：趁对手麻痹的窗口一口气打重，代价是解除了自己的控制；
 *   也能反过来，用同一把盐把麻痹的同伴拍醒。
 *
 * 两幕：
 *   起（windup，提交前）：指间捏起盐晶、白屑向内聚，当前选中的目标是否麻痹一目了然（present pouch）。
 *   拍（execute）：`kind:"aim"`——沿瞄准方向做一次 `action.trace(..., true)`，第一个身体（含同伴）或实墙
 *       就是真实的接触点。拍中敌方时按真实被害者结算 `salts` 接触伤害：它正麻痹就翻倍、命中后解除其麻痹
 *       （粗盐式再留一段踉跄）；拍中麻痹的友方时不造成伤害，只把它拍醒。第三人挡线、拍空都按实际接触处理。
 *
 * 与同族分开：清醒读的是**这次真正被拍中者当前的状态**（麻痹），不是时间里的伤；它翻倍的同时把目标治好，
 *   救助与伤害共用同一记盐拍。
 */
namespace PokemonSkills {
    define({
        id: smellingsaltsId,
        cooldownParameter: "recharge",
        name: "Smelling Salts",
        description: "贴近伸手拍一把盐：拍中麻痹的敌人时威力翻倍，但也会把它拍醒（粗盐式还留一段踉跄）；拍中麻痹的友方不造成伤害，只把它从麻痹中拍醒。看错人时按实际被拍者的状态结算，不会借用原目标。",
        uses: ["趁对手麻痹时打出翻倍的一记", "把麻痹中的敌人一次性打重", "把麻痹的伙伴拍醒"],
        kind: "aim",
        range: 2.6,
        maxRange: 3.4,
        prepare: 4,
        active: 0,
        recover: 6,
        cooldown: 22,
        style: "normal",
        defaults: { coarse: false, ai: { maxChase: 6, wake: true, rescue: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(smellingsaltsId, "reach", pokemon) : 0.6, geometry: "line", style: "normal", color: 0xF2E6B0,
                label: config && config.coarse === true ? "清醒·粗盐" : "清醒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[smellingsaltsId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(smellingsaltsId, "start", context)),
                recover: Math.round(p(smellingsaltsId, "settle", context)),
                cooldown: Math.round(p(smellingsaltsId, "recharge", context)),
                active: 0,
                range: p(smellingsaltsId, "reach", context) + 0.4
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
            const scope = action.world();
            const actor = action.actor();
            const selfRef = String(actor.ref());
            const direction = aim(action);
            const reach = p(smellingsaltsId, "reach", action);
            const radius = p(smellingsaltsId, "radius", action);
            const push = p(smellingsaltsId, "push", action);
            const puff = Math.round(p(smellingsaltsId, "puff", action));
            const spark = Math.round(p(smellingsaltsId, "spark", action));
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.30));
            const coarse = config && config.coarse === true;
            const stagger = Math.max(1, Math.round(p(smellingsaltsId, "stagger", action)));
            const heading: number[] = [direction.x(), direction.y(), direction.z()];

            const body = scope.observe(actor);
            const from = body === null ? action.origin() : body.position();
            const to = from.plus(direction.scale(reach));
            sound(action, "minecraft:block.snow.break");

            // 权威判定：第一个身体（含同伴）或实墙就是盐掌真实停下的地方。
            const contact = action.trace(from, to, radius, true);
            const at = contact.position();
            const lander = contact.hitEntity() ? contact.target() : null;
            const victim = lander !== null && scope.valid(lander) && String(lander.ref()) !== selfRef ? lander : null;

            WorldFeedback.emit(scope, smellingsaltsScene, 1, at, { moment: "slap", direction: heading, puff: puff, scale: scale }, 20);

            if (victim !== null) {
                // 读真实被拍中者：显式 target 优先，状态与威力都看这个人。
                const hitContext = withTarget(factContext(action), victim);
                const numb = smellingsaltsNumb(hitContext) > 0;
                if (scope.friendly(victim)) {
                    // 同伴：不造成伤害，只有它真在麻痹时才被盐激醒。
                    let cured = false;
                    if (numb && scope.valid(victim)) cured = CombatStatus.cure(scope, victim, "paralysis");
                    WorldFeedback.emit(scope, smellingsaltsScene, 1, at,
                        { moment: "ally", target: String(victim.ref()), numb: numb ? 1 : 0, cured: cured ? 1 : 0,
                            puff: Math.round(puff * 0.7), spark: cured ? spark : 0, scale: scale,
                            intensity: cured ? 1.3 : 0.7 }, 26);
                    if (cured) {
                        scope.sound("cobblemon:move.powder.target", at, 16, "{}");
                        WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), smellingsaltsAllyText, [], 26);
                    } else {
                        scope.sound("minecraft:block.snow.break", at, 12, "{}");
                    }
                } else {
                    const power = p(smellingsaltsId, "salts", hitContext);
                    const landed = impact(action, contact, smellingsaltsId, power, { damage: damageSpec(smellingsaltsId, "salts"), contact: true });
                    if (!landed) {
                        // 伤害被拒（免疫等）：不声称命中，也不把配方当作已生效。
                        WorldFeedback.emit(scope, smellingsaltsScene, 1, at, { moment: "miss", scale: scale }, 16);
                        sound(action, "minecraft:entity.player.attack.nodamage");
                        done(action);
                        return;
                    }
                    let cured = false;
                    const away = at.minus(from);
                    if (away.length() > 0.05 && scope.valid(victim)) scope.displace(victim, away.unit().scale(push));
                    if (numb && scope.valid(victim) && CombatStatus.cure(scope, victim, "paralysis")) {
                        cured = true;
                        // 粗盐踉跄只对敌方、且只在真正治愈了麻痹之后留下。
                        if (coarse && scope.valid(victim)) scope.marker(victim, "minecraft:slowness", stagger, 0);
                    }
                    WorldFeedback.emit(scope, smellingsaltsScene, 1, at,
                        { moment: numb ? "wake" : "plain", target: String(victim.ref()), numb: numb ? 1 : 0, cured: cured ? 1 : 0,
                            coarse: coarse ? 1 : 0, power: Math.round(power * 10) / 10,
                            puff: numb ? puff : Math.round(puff * 0.6), spark: cured ? spark : 0, scale: scale,
                            intensity: Math.max(0.6, Math.min(2.2, power / 70)) }, 28);
                    scope.sound(numb ? "cobblemon:move.powder.target" : "cobblemon:impact.normal", at, 16, "{}");
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)),
                        numb ? smellingsaltsWakeText : smellingsaltsHitText, [], 26);
                }
            } else {
                // 实墙或空放：只散一小撮盐，不自动找旁边的敌人。
                const blocked = contact.blocked();
                const point = blocked && contact.blockPosition() !== null ? contact.blockPosition()! : at;
                WorldFeedback.emit(scope, smellingsaltsScene, 1, point,
                    { moment: "miss", scale: scale, puff: Math.round(puff * 0.35), blocked: blocked ? 1 : 0 }, 18);
                if (!blocked) WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), smellingsaltsMissText, [], 24);
                sound(action, "minecraft:entity.player.attack.nodamage");
            }
            done(action);
        }
    });
}
