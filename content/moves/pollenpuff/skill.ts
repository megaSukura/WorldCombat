/**
 * 花粉团 / pollenpuff 的出手方式。
 *
 * 核心念头：这是一团抛出去、落在谁身上就由谁决定结果的花粉球。施法者掌心拢起一团会炸也会养人的花粉，
 *   低弧丢向选定的落点；团子撞到第一个活体或落地即散开——
 *   圈内的**敌人**被炸成刺人的花粉（Bug 特殊伤害），圈内的**同伴**（包括自己）喝下花粉、按最大生命回血。
 *   同一团花粉，两种结果，由「站在落点上的都是谁」当场决定。
 *
 * 三幕：
 *   起（windup，提交前）：拢粉的预告；起手可被打断。
 *   掷（throw）：提交后低弧抛出花粉团，原生飞行与碰撞负责轨迹。
 *   散（burst → hit / mend）：落地或撞人立刻散开；圈内敌人各挨一次 `blast`，圈内未满血的同伴各回 `mend`。
 *
 * 与同族分开：毒粉抛出的粉尘只毒敌人、不留回复；帮助只能点同伴、只强化下一次命中；
 *   花粉团是**同一团花粉按对象给出伤害或回复**，是全 Table 里唯一能同时照顾圈内两类人的一招。
 */
namespace PokemonSkills {
    const pollenpuffScene = "world_combat:move_pollenpuff";
    const pollenpuffHitText = "world_combat.move.pollenpuff.text.hit";
    const pollenpuffMendText = "world_combat.move.pollenpuff.text.mend";
    const pollenpuffMissText = "world_combat.move.pollenpuff.text.miss";

    define({
        id: "pollenpuff",
        name: "Pollen Puff",
        description: "拢起一团会炸也会养人的花粉，低弧丢向选定的落点：撞到人或落地就散开——圈内的敌人被炸成刺人的花粉，圈内未满血的同伴（包括自己）喝下花粉回血。同一团花粉，两种结果。",
        uses: ["同一团花粉既能远程行凶、又能救助身边的同伴", "给挤在一起的一小群敌人一起下花粉", "在交战的间隙把受伤的自己或同伴拉回一点"],
        kind: "point",
        range: 7,
        maxRange: 11,
        prepare: 8,
        active: 1,
        recover: 7,
        cooldown: 24,
        style: "puff",
        defaults: { nurture: false, helpFriends: true, ai: { maxChase: 9, healBelow: 0.8 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["pollenpuff"], detail: { values: config } };
            return { radius: p("pollenpuff", "burstRadius", context), geometry: "area", style: "puff", color: 0xE8B84A,
                label: config && config.nurture === true ? "花粉团·养人" : "花粉团·炸人" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["pollenpuff"], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p("pollenpuff", "tempo", context)),
                recover: Math.round(p("pollenpuff", "settle", context)),
                cooldown: Math.round(p("pollenpuff", "recharge", context)),
                active: 1,
                range: p("pollenpuff", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("pollenpuff:gather", pollenpuffScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", nurture: config && config.nurture === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const power = p("pollenpuff", "blast", action);
            const mend = Math.max(0.1, Math.min(0.9, p("pollenpuff", "mend", action)));
            const radius = Math.max(1.2, p("pollenpuff", "burstRadius", action));
            const speed = Math.max(0.5, p("pollenpuff", "throwSpeed", action));
            const thickness = Math.max(0.15, p("pollenpuff", "collisionRadius", action));
            const cap = Math.max(1, Math.round(p("pollenpuff", "maxTargets", action)));
            const scale = Math.max(0.6, Math.min(2.0, radius / 1.9));
            const motes = Math.max(14, Math.round(18 + power * 0.25 + mend * 40));
            let settled = false;

            function burst(current: CombatAction, point: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                let struck = 0, mended = 0;

                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, radius, { below: 2.5, above: 3 }), function (other) {
                    if (String(other.ref()) === String(actor.ref()) || struck >= cap) return;
                    if (!hurt(current, other, "pollenpuff", power, { damage: damageSpec("pollenpuff", "blast") })) return;
                    struck++;
                    const body = scope.observe(other);
                    if (body === null) return;
                    WorldFeedback.emit(scope, pollenpuffScene, 1, body.position(),
                        { moment: "hit", target: String(other.ref()), scale: scale, motes: motes, intensity: Math.max(0.6, Math.min(2.2, power / 90)) }, 24);
                });

                WorldGeometry.select(scope, WorldGeometry.ring(point, 0, radius, { below: 2.5, above: 3 }), function (other, facts) {
                    if (!facts.friendly() || facts.health() >= facts.maxHealth()) return;
                    if (heal(scope, other, mend, "pollenpuff") <= 0) return;
                    mended++;
                    WorldFeedback.emit(scope, pollenpuffScene, 1, facts.position(),
                        { moment: "mend", target: String(other.ref()), scale: scale, motes: motes, mend: mend }, 26);
                });

                WorldFeedback.emit(scope, pollenpuffScene, 1, point,
                    { moment: "burst", radius: radius, scale: scale, motes: motes, struck: struck, mended: mended }, 28);
                sound(current, "cobblemon:move.powder.target");
                if (struck > 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), pollenpuffHitText, [struck], 26);
                if (mended > 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), pollenpuffMendText, [mended], 28);
                if (struck === 0 && mended === 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.8, 0)), pollenpuffMissText, [], 22);
                done(current);
            }

            sound(action, "cobblemon:move.powder.actor");
            const arc = LivingActions.ballistic(action.origin(), action.targetPosition(), speed, 0.05);
            const flight = LivingActions.projectile(action, {
                speed: speed, gravity: 0.05, range: action.range(), radius: thickness, lifetime: 100,
                direction: arc || undefined,
                appearance: { sprite: "cobblemon:particle/generic/powder", scale: 0.9, tint: 0xE8B84A },
                impact: function (current, hit) { burst(current, hit.position()); }
            }, function (current) { burst(current, current.targetPosition()); });
            WorldFeedback.emit(world, pollenpuffScene, 1, action.origin(),
                { moment: "throw", projectile: flight, target: action.target() === null ? "" : String(action.target()!.ref()),
                    scale: scale, motes: motes }, 40);
        }
    });
}
