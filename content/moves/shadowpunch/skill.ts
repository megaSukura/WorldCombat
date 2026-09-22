/**
 * 暗影拳 / shadowpunch 的出手方式。
 *
 * 核心念头：本体不动，暗影从自己脚下窜到对手脚下的影子里，再从对手自己的影子中立起一只拳打它——
 *   拳的起点就在对手站的地方，预判不到，所以必中。
 *
 * 两幕：
 *   起（coil，提交前）：脚下的影子拉长、翻涌（可读的预告）。
 *   窜（seep → rise/strike）：提交后一道暗影沿地面从施法者窜向对手（蔓延需要一点时间，对手看得到它爬过来），
 *       抵达后从对手影子里升起一只拳，按 `shadow` 结算接触伤害；开了 `hold` 还会拽住它拖向施法者。
 *       目标离场则拳从空影子里落回（fizzle）。
 *
 * 与同族分开：出奇一击是施法者本人瞬移到对手背后；暗影拳是**施法者站着不动、招式本身穿过地面阴影去打**，
 *   中间那一段沿地面爬行的暗影是它的身份，也给了对手一点挪开影子的余地。
 */
namespace PokemonSkills {
    const shadowpunchScene = "world_combat:move_shadowpunch";
    const shadowpunchFizzleText = "world_combat.move.shadowpunch.text.fizzle";
    const shadowpunchHitText = "world_combat.move.shadowpunch.text.hit";

    define({
        id: "shadowpunch",
        name: "Shadow Punch",
        description: "The user throws a punch from the shadows. This attack never misses.",
        uses: ["让拳从对手自己的影子里升起", "站着不动打到远处的对手", "用影子抓住并拖住对手"],
        kind: "enemy",
        range: 7,
        maxRange: 11,
        prepare: 8,
        active: 0,
        recover: 7,
        cooldown: 50,
        style: "shadow",
        defaults: { hold: false, ai: { maxChase: 12, grounding: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("shadowpunch", "reach", pokemon), geometry: "line", style: "shadow", color: 0x8A5FD0,
                label: config && config.hold === true ? "暗影拳·地缚" : "暗影拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["shadowpunch"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("shadowpunch", "tempo", context)),
                recover: Math.round(p("shadowpunch", "settle", context)),
                cooldown: Math.round(p("shadowpunch", "recharge", context)),
                active: 0,
                range: p("shadowpunch", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("shadowpunch:coil", shadowpunchScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", windup: prepare, target: action.target() === null ? "" : String(action.target()!.ref()),
                    hold: !!(config && config.hold) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const hold = !!(config && config.hold);
            const self = world.observe(actor);

            function fizzle(current: CombatAction): void {
                const scope = current.world();
                WorldFeedback.emit(scope, shadowpunchScene, 1, current.origin(), { moment: "fizzle" }, 20);
                WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.0, 0)), shadowpunchFizzleText, [], 22);
                scope.sound("minecraft:entity.vex.ambient", current.origin(), 10, "{}");
                done(current);
            }

            if (self === null || target === null || !world.valid(target)) { fizzle(action); return; }
            const body = world.observe(target);
            if (body === null) { fizzle(action); return; }
            const origin = self.position();
            const at = body.position();
            const distance = at.minus(origin).length();
            const seep = Math.max(0.4, p("shadowpunch", "seep", action));
            const travel = Math.max(2, Math.min(14, Math.round(distance / seep)));
            const targetRef = String(target.ref());
            const selfRef = String(actor.ref());

            WorldFeedback.emit(world, shadowpunchScene, 1, origin,
                { moment: "seep", target: targetRef, travel: travel, hold: hold ? 1 : 0,
                    path: [selfRef, targetRef], direction: [at.x() - origin.x(), at.y() - origin.y(), at.z() - origin.z()] }, 30);
            sound(action, "cobblemon:move.shadowball.actor");

            action.after(travel, function (current: CombatAction) {
                const scope = current.world();
                const victim = scope.actor(targetRef);
                if (victim === null || !scope.valid(victim) || scope.observe(victim) === null) { fizzle(current); return; }
                const power = p("shadowpunch", "shadow", current);
                const rise = p("shadowpunch", "rise", current);
                const fist = p("shadowpunch", "fist", current);
                const landed = hurt(current, victim, "shadowpunch", power,
                    { damage: damageSpec("shadowpunch", "shadow"), contact: true, punch: true });
                const hitBody = scope.observe(victim);
                const hitAt = hitBody !== null ? hitBody.position() : at;
                WorldFeedback.emit(scope, shadowpunchScene, 1, hitAt,
                    { moment: landed ? "rise" : "fizzle", target: targetRef, rise: rise, scale: fist / 0.4,
                        power: Math.round(power * 10) / 10, hold: hold ? 1 : 0,
                        path: [selfRef, targetRef] }, 26);
                if (landed && hold) {
                    const caster = scope.observe(current.actor());
                    const pulled = scope.observe(victim);
                    if (caster !== null && pulled !== null) {
                        const toward = caster.position().minus(pulled.position());
                        if (toward.length() > 0.05) scope.displace(victim, toward.unit().scale(p("shadowpunch", "drag", current)));
                    }
                }
                if (landed) {
                    scope.sound("cobblemon:impact.ghost", hitAt, 16, "{}");
                    WorldFeedback.text(scope, hitAt.plus(WorldCombat.point(0, 1.1, 0)), shadowpunchHitText, [], 24);
                }
                done(current);
            });
        }
    });
}
