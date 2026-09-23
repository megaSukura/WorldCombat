/**
 * 影子偷袭 / shadowsneak 的出手方式。
 *
 * 核心念头：本人不动，影子从脚下钻出去，从对手**背后**立起一刀——不需要视线，绕过墙角与遮挡；
 *   命中从背后推来，把对手顺着手势拽向施法者，踉跄一步。它是全族最便宜、最快的先制起手。
 *
 * 两幕：
 *   起（windup，提交前）：脚下的影子加深、拉长，只播预告（present pool）；几乎不留前摇。
 *   刺（execute）：提交后影子沿地面从施法者爬向对手（蔓延需要一点时间，对手看得到它爬过来，也就有时间挪开），
 *       抵达后从对手**背面**立起一刀，按 `sneak` 结算接触伤害；裹足式（tether）再降对手一级速度，
 *       并把对手更狠地拽向施法者。目标离场则影子落回空处（fizzle）。
 *
 * 与同族分开：暗影拳从对手自己的影子里升起一只拳、位置在正面、从不失手；影子偷袭从**背面**刺、会把人往前拽，
 *   更轻、更快、更便宜，专做开局与打断。它与音速拳的差别是：音速拳走直线沿视线打，影子走地面、不需视线。
 */
namespace PokemonSkills {
    define({
        id: shadowsneakId,
        cooldownParameter: "recharge",
        name: "Shadow Sneak",
        description: "The user extends its shadow and strikes the target from behind at blinding speed. This move always goes first.",
        uses: ["开局最便宜的一记先手，把对手拽近", "隔着墙角从对手背后刺一刀", "裹足式减速，为下一次出手开团"],
        kind: "enemy",
        range: 6.2,
        maxRange: 11.4,
        prepare: 3,
        active: 0,
        recover: 5,
        cooldown: 16,
        style: "shadow",
        defaults: { tether: false, ai: { maxChase: 10, finish: true, preferBack: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: (pokemon ? p(shadowsneakId, "reach", pokemon) : 6.2) + 0.4, geometry: "line", style: "shadow", color: 0x7B4FD0,
                label: config && config.tether === true ? "影子偷袭·裹足" : "影子偷袭" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[shadowsneakId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(shadowsneakId, "tempo", context)),
                recover: Math.round(p(shadowsneakId, "settle", context)),
                cooldown: Math.round(p(shadowsneakId, "recharge", context)),
                active: 0,
                range: p(shadowsneakId, "reach", context) + 0.4
            };
        },
        windup: function (action, config, prepare) {
            action.present("shadowsneak:pool", shadowsneakScene, 1, action.origin(),
                JSON.stringify({ moment: "pool", windup: prepare, tether: config && config.tether === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const target = action.target();
            const tether = config && config.tether === true;
            const self = world.observe(actor);

            function fizzle(current: CombatAction): void {
                const scope = current.world(), at = current.origin();
                WorldFeedback.emit(scope, shadowsneakScene, 1, at, { moment: "fizzle" }, 20);
                WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.0, 0)), shadowsneakMissText, [], 22);
                scope.sound("minecraft:entity.vex.ambient", at, 10, "{}");
                done(current);
            }

            if (self === null || target === null || !world.valid(target)) { fizzle(action); return; }
            const body = world.observe(target);
            if (body === null) { fizzle(action); return; }
            const origin = self.position();
            const at = body.position();
            const distance = at.minus(origin).length();
            const seep = Math.max(0.6, p(shadowsneakId, "seep", action));
            const travel = Math.max(2, Math.min(16, Math.round(distance / seep)));
            const blade = p(shadowsneakId, "blade", action);
            const pull = p(shadowsneakId, "pull", action);
            const grip = Math.max(0, Math.round(p(shadowsneakId, "grip", action)));
            const shade = Math.max(10, Math.round(p(shadowsneakId, "shade", action)));
            const selfRef = String(actor.ref()), targetRef = String(target.ref());

            sound(action, "cobblemon:move.shadowball.actor");
            action.present("shadowsneak:crawl", shadowsneakScene, 1, origin,
                JSON.stringify({ moment: "crawl", target: targetRef, path: [selfRef, targetRef], shade: shade, seep: seep, travel: travel,
                    tether: tether ? 1 : 0 }));

            action.after(travel, function (current: CombatAction) {
                const scope = current.world();
                const victim = scope.actor(targetRef);
                if (victim === null || !scope.valid(victim)) { fizzle(current); return; }
                const vbody = scope.observe(victim), caster = scope.observe(actor);
                if (vbody === null || caster === null) { fizzle(current); return; }
                const hitAt = vbody.position();
                const away = hitAt.minus(caster.position());
                const back = hitAt.plus(away.length() < 0.05 ? current.direction() : away.unit().scale(0.6 + blade));
                const toward = caster.position().minus(hitAt);
                const power = p(shadowsneakId, "sneak", current);
                const landed = hurt(current, victim, shadowsneakId, power,
                    { damage: damageSpec(shadowsneakId, "sneak"), contact: true });
                WorldFeedback.emit(scope, shadowsneakScene, 1, back,
                    { moment: "stab", target: targetRef, blade: blade, pull: pull, shade: shade, grip: grip,
                        power: Math.round(power * 10) / 10, tether: tether ? 1 : 0,
                        path: [selfRef, targetRef], direction: toward.length() < 0.05 ? [0, 0, 0] : [toward.x(), toward.y(), toward.z()] }, 26);
                if (!landed) { fizzle(current); return; }
                scope.sound("cobblemon:impact.ghost", hitAt, 14, "{}");
                if (grip > 0 && scope.valid(victim)) NativeEffects.boost(scope, victim, "spe", -grip);
                if (scope.valid(victim) && toward.length() > 0.05) scope.displace(victim, toward.unit().scale(pull));
                WorldFeedback.text(scope, hitAt.plus(WorldCombat.point(0, 1.1, 0)),
                    grip > 0 ? shadowsneakBindText : shadowsneakHitText, [Math.round(power)], 22);
                done(current);
            });
        }
    });
}
