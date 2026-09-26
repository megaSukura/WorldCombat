/**
 * 花粉团 / pollenpuff 的出手方式。
 *
 * 核心念头：这是一团抛出去、落在谁身上就由谁决定结果的花粉球。施法者掌心拢起一团会炸也会养人的花粉，
 *   低弧丢向选定的点；团子撞到第一个活体或落地即散开——
 *   圈内的**敌人**被炸成刺人的花粉（Bug 特殊伤害），圈内的**同伴**（包括自己）喝下花粉、按最大生命回血。
 *   同一团花粉，两种结果，由「站在落点上的都是谁」当场决定。
 *
 * 三幕：
 *   起（windup，提交前）：拢粉的预告；起手可被打断。
 *   掷（throw）：提交后低弧抛出花粉团，原生飞行与碰撞负责轨迹；飞行长度按真实落点存档，弹会停在落点。
 *   散（burst → hit / mend）：落地或撞人立刻散开；圈内敌人各挨一次 `blast`，圈内未满血的同伴各回 `mend`。
 *
 * 与同族分开：毒粉抛出的粉尘只毒敌人、不留回复；帮助只能点同伴、只强化下一次命中；
 *   花粉团是**同一团花粉按对象给出伤害或回复**，是全 Table 里唯一能同时照顾圈内两类人的一招。
 *
 * 通路：伤害与治疗都要求爆点到身体的真实通路（`world.clear`），实墙两侧不互相炸/回血。
 * 配置 `helpFriends` 只改变伙伴 AI 是否主动挑同伴，手动落点仍按真实关系结算。
 */
namespace PokemonSkills {
    const pollenpuffScene = "world_combat:move_pollenpuff";
    const pollenpuffHitText = "world_combat.move.pollenpuff.text.hit";
    const pollenpuffMendText = "world_combat.move.pollenpuff.text.mend";
    const pollenpuffMissText = "world_combat.move.pollenpuff.text.miss";

    interface PollenFlight { direction: CombatPoint; range: number; end: CombatPoint; }

    /**
     * 低弧飞行的真实档案：由共享 `ballistic` 求初始方向，再按原生抛射物同样的
     * 「先位移、再乘拖拽(0.99)、再扣重力」逐刻递推，找出最接近落点的一刻，返回那一刻的位置与已飞弧长。
     * 投射物 range 取这段弧长（加一点余量），因此团子会在落点附近真实结束——散开点就是弹终点，
     * 而不是另写一个「理论瞄准点」。落点被墙挡住时原生碰撞会先在墙上开爆。
     */
    function pollenpuffFlight(origin: CombatPoint, target: CombatPoint, speed: number, gravity: number): PollenFlight | null {
        const direction = LivingActions.ballistic(origin, target, speed, gravity);
        if (direction === null) return null;
        let pos = origin, vel = direction.scale(speed), arc = 0;
        let bestArc = 0, bestDistance = pos.minus(target).length(), best = pos;
        for (let tick = 0; tick < 200; tick++) {
            const next = pos.plus(vel);
            arc += vel.length();
            const distance = next.minus(target).length();
            if (distance < bestDistance) { bestDistance = distance; bestArc = arc; best = next; }
            pos = next;
            vel = WorldCombat.point(vel.x() * 0.99, vel.y() * 0.99 - gravity, vel.z() * 0.99);
            if (arc > 64) break;
        }
        return { direction: direction, range: Math.max(0.4, bestArc + speed * 0.5), end: best };
    }

    define({
        id: "pollenpuff",
        cooldownParameter: "recharge",
        name: "Pollen Puff",
        description: "拢起一团会炸也会养人的花粉，低弧丢向选定的落点：撞到人或落地就散开——圈内的敌人被炸成刺人的花粉，圈内未满血的同伴（包括自己）喝下花粉回血；实墙会挡住飞路与扩散。同一团花粉，两种结果。",
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
                let struck = 0, mended = 0, restored = 0;

                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, radius, { below: 2.5, above: 3 }), function (other, facts) {
                    if (String(other.ref()) === String(actor.ref()) || struck >= cap) return;
                    // 实墙阻断：爆点到身体的通路不通，就不结算这一侧。
                    if (!scope.clear(point, facts.position())) return;
                    if (!hurt(current, other, "pollenpuff", power, { damage: damageSpec("pollenpuff", "blast") })) return;
                    struck++;
                    const body = scope.observe(other);
                    if (body === null) return;
                    WorldFeedback.emit(scope, pollenpuffScene, 1, body.position(),
                        { moment: "hit", target: String(other.ref()), scale: scale, radius: radius, motes: motes,
                            intensity: Math.max(0.6, Math.min(2.2, power / 90)) }, 24);
                });

                WorldGeometry.select(scope, WorldGeometry.ring(point, 0, radius, { below: 2.5, above: 3 }), function (other, facts) {
                    if (!facts.friendly() || facts.health() >= facts.maxHealth()) return;
                    if (!scope.clear(point, facts.position())) return;
                    const actual = heal(scope, other, mend, "pollenpuff");
                    if (actual <= 0) return;
                    mended++;
                    restored += actual;
                    const body = scope.observe(other);
                    if (body === null) return;
                    // 表现读实际恢复量，而不是理论比例。
                    WorldFeedback.emit(scope, pollenpuffScene, 1, body.position(),
                        { moment: "mend", target: String(other.ref()), scale: scale, radius: radius, motes: motes,
                            healed: Math.round(actual * 10) / 10,
                            intensity: Math.max(0.4, Math.min(2.4, actual / Math.max(1, body.maxHealth()) * 3)) }, 26);
                });

                WorldFeedback.emit(scope, pollenpuffScene, 1, point,
                    { moment: "burst", radius: radius, scale: scale, motes: motes, struck: struck, mended: mended,
                        healed: Math.round(restored * 10) / 10 }, 28);
                sound(current, "cobblemon:move.powder.target");
                if (struck > 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), pollenpuffHitText, [struck], 26);
                if (mended > 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.4, 0)), pollenpuffMendText,
                    [mended, Math.round(restored * 10) / 10], 28);
                if (struck === 0 && mended === 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.8, 0)), pollenpuffMissText, [], 22);
                done(current);
            }

            sound(action, "cobblemon:move.powder.actor");
            const arc = pollenpuffFlight(action.origin(), action.targetPosition(), speed, 0.05);
            const direction = arc === null ? aim(action) : arc.direction;
            const range = arc === null ? action.range() : arc.range;
            const endPoint = arc === null ? action.targetPosition() : arc.end;
            const flight = LivingActions.projectile(action, {
                speed: speed, gravity: 0.05, range: range, radius: thickness, lifetime: 100,
                direction: direction,
                appearance: { sprite: "cobblemon:particle/generic/powder", scale: 0.9, tint: 0xE8B84A },
                impact: function (current, hit) { burst(current, hit.position()); }
            }, function (current) { burst(current, endPoint); });
            WorldFeedback.emit(world, pollenpuffScene, 1, action.origin(),
                { moment: "throw", projectile: flight, target: action.target() === null ? "" : String(action.target()!.ref()),
                    scale: scale, motes: motes }, 40);
        }
    });
}
