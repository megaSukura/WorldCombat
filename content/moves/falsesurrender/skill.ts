/**
 * 假跪真撞 / falsesurrender 的出手方式。
 *
 * 核心念头：先伏低装作认错，把自己暴露出去骗过对手的注意；就在这一低头之间，凌乱的头发从最低处窜出去扎进护架下方——
 * 出刺点是最低、最突然的一刻，所以躲不掉；对手的注意越不在施法者身上，这一刺越狠。
 *
 * 两幕：
 *   起（feign，提交前）：伏地低头、乱发竖起，明摆着暴露自己（起手不能动，可被打断）。
 *   撞（lash → hit → stagger）：提交后乱发按发速窜出（目标越远到场越晚）；发梢够到目标时结算，
 *       注意不在施法者身上的目标吃更重的一刺，被顶开并压住一小段。
 *   发梢够不到（目标已走开）就扑空。
 *
 * 与同族分开：借力摔是等人扑进来的反手摔、修长之角是锁定追刺；假跪真撞是**以认输为饵的伏低发刺**——
 * 代价是施法者自己暴露，收益是对「没在盯自己」的目标打出更重的一击。与同类的仆刀区别在于：仆刀先开一道真实空门再兑现两段，
 * 假跪真撞是一记自己承担风险的独幕诈刺。
 */
namespace PokemonSkills {
    const falsesurrenderScene = "world_combat:move_falsesurrender";
    const falsesurrenderAmbushText = "world_combat.move.falsesurrender.text.ambush";
    const falsesurrenderHitText = "world_combat.move.falsesurrender.text.hit";
    const falsesurrenderMissText = "world_combat.move.falsesurrender.text.miss";

    define({
        id: "falsesurrender",
        name: "False Surrender",
        description: "先伏低装作认输，把对手的注意骗走，再让凌乱的黑发从最低处窜出去扎进护架下方：出刺点最低最突然，所以躲不掉。对手的注意越不在你身上，这一刺越狠；代价是伏低时你自己不能动。",
        uses: ["伏低装认输，再贴地一记发刺", "对没在盯着自己的目标打出更重的一击", "用较低的出手角度绕开正面护架"],
        kind: "enemy",
        range: 4.5,
        maxRange: 6.5,
        prepare: 12,
        active: 0,
        recover: 9,
        cooldown: 34,
        stationary: true,
        style: "thrust",
        defaults: { grovel: false, ai: { maxChase: 8, punish: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("falsesurrender", "whipRadius", pokemon) * 1.6, geometry: "line", style: "thrust", color: 0x6A5A8A, label: "假跪真撞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["falsesurrender"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: Math.max(4, Math.round(p("falsesurrender", "bowTicks", context))),
                recover: p("falsesurrender", "recover", context),
                cooldown: p("falsesurrender", "cooldown", context),
                range: p("falsesurrender", "hairReach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_falsesurrender:feign", falsesurrenderScene, 1, action.origin(),
                JSON.stringify({ moment: "feign", windup: prepare, grovel: !!(config && config.grovel) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const reach = p("falsesurrender", "hairReach", action);
            const lashSpeed = p("falsesurrender", "lashSpeed", action);
            const basePower = p("falsesurrender", "lash", action);
            const ambushBonus = p("falsesurrender", "ambush", action);
            const radius = p("falsesurrender", "whipRadius", action);
            const staggerTicks = Math.max(8, Math.round(p("falsesurrender", "staggerTicks", action)));
            const push = p("falsesurrender", "push", action);
            const scale = radius / 0.5;
            const selected = action.target();
            let settled = false;

            sound(action, "minecraft:entity.evoker.cast_spell");

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                done(current);
            }

            function miss(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                WorldFeedback.emit(scope, falsesurrenderScene, 1, current.origin(), { moment: "miss", scale: scale }, 20);
                WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.2, 0)), falsesurrenderMissText, [], 22);
                finish(current);
            }

            if (selected === null || !world.valid(selected)) { miss(action); return; }
            const self = world.observe(actor), first = world.observe(selected);
            if (self === null || first === null) { miss(action); return; }
            const from = self.position();
            const toward = first.position().minus(from);
            const distance = toward.length();
            const direction = distance < 0.05 ? aim(action) : toward.unit();
            // 对手的注意不在施法者身上 → 伏低骗到了它，这一刺更重。
            const attention = first.attacking();
            const ambush = attention === null || String(attention.ref()) !== String(actor.ref());
            const power = basePower * (1 + (ambush ? ambushBonus : 0));
            const intensity = Math.max(0.6, Math.min(2.4, power / 80));
            const delay = Math.max(1, Math.ceil(distance / lashSpeed));
            const targetRef = String(selected.ref());

            WorldFeedback.emit(world, falsesurrenderScene, 1, from,
                { moment: "lash", target: targetRef, ambush: ambush ? 1 : 0, intensity: intensity, scale: scale,
                  path: [[from.x(), from.y() + 0.4, from.z()], [first.position().x(), first.position().y(), first.position().z()]],
                  direction: [direction.x(), direction.y(), direction.z()] }, delay + 18);
            sound(action, "minecraft:entity.player.attack.sweep");

            action.after(delay, function (lashAction: CombatAction) {
                const scope = lashAction.world();
                const body = scope.observe(actor);
                if (body === null) { finish(lashAction); return; }
                const here = body.position();
                let victim: CombatActor | null = null;
                const current = scope.actor(targetRef);
                if (current !== null && scope.valid(current)) {
                    const seen = scope.observe(current);
                    if (seen !== null && seen.position().minus(here).length() <= reach + 0.6) victim = current;
                }
                if (victim === null) {
                    const hit = lashAction.trace(here, here.plus(direction.scale(reach)), radius);
                    if (hit.hitEntity()) victim = hit.target();
                }
                if (victim === null || scope.friendly(victim)) { miss(lashAction); return; }
                const victimBody = scope.observe(victim);
                const landed = hurt(lashAction, victim, "falsesurrender", power,
                    { damage: damageSpec("falsesurrender", "lash"), contact: true });
                if (landed) {
                    const at = victimBody === null ? here.plus(direction.scale(distance)) : victimBody.position();
                    WorldFeedback.emit(scope, falsesurrenderScene, 1, at,
                        { moment: "hit", target: String(victim.ref()), ambush: ambush ? 1 : 0,
                          intensity: intensity, notes: Math.max(14, Math.round(power * 1.1)), scale: scale }, 24);
                    if (scope.valid(victim)) {
                        scope.displace(victim, direction.scale(push));
                        WorldEffects.apply(scope, victim, "rooted", {}, staggerTicks);
                        const after = scope.observe(victim);
                        if (after !== null) WorldFeedback.emit(scope, falsesurrenderScene, 1, after.position(),
                            { moment: "stagger", target: String(victim.ref()), ambush: ambush ? 1 : 0, intensity: intensity, scale: scale }, 26);
                    }
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.2, 0)),
                        ambush ? falsesurrenderAmbushText : falsesurrenderHitText, [Math.round(power)], 26);
                    scope.sound("cobblemon:impact.dark", at, 14, "{}");
                }
                finish(lashAction);
            });
        }
    });
}
