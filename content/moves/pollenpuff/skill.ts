/**
 * 花粉团 / pollenpuff 的出手方式。
 *
 * 核心念头：这是一团抛出去、**撞到第一具身体就由那具身体决定结果**的花粉球。施法者掌心拢起一团会炸也会
 *   养人的花粉，低弧丢向选定的点；团子沿低弧飞出，撞到第一个活体就散开——
 *   那具身体是**敌人**就被炸成刺人的花粉（Bug 特殊伤害），是未满血的**同伴**（包括自己）就喝下花粉回血；
 *   撞到方块或飞完只原地散开，不复伤也不复疗。同一团花粉，两种结果，由「它先落到谁身上」当场决定。
 *
 * 三幕：
 *   起（windup，提交前）：拢粉的预告；起手可被打断。
 *   掷（throw）：提交后低弧抛出花粉团，原生飞行与碰撞负责轨迹；允许友军碰撞，第三具身体也能把团子接走。
 *   散（hit / mend / fade）：撞到第一个活体才结算——敌人一次 `blast`、同伴一次 `mend`；
 *      撞墙或飞完只在真实弹体末点散开（`world.projectilePosition`），没有落点圈，没有群伤群疗。
 *
 * 与同族分开：毒粉抛出的粉尘只毒敌人、不留回复；帮助只能点同伴、只强化下一次命中；泡影咏叹调照顾自己
 *   周围一圈的敌友；花粉团把一整团花粉**精确送到一具身体**，是唯一能被第三体半路接走的一招。
 *
 * 通路：伤害与治疗都要经过原生飞行与碰撞；实墙会在墙上先把团子拦下，掩体因此也挡住救援。
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
     * 投射物 range 取这段弧长（加一点余量），因此团子会在瞄准点附近落下——散开点仍是弹体的真实末点，
     * 不是另写一个「理论瞄准点」。落点被墙挡住时原生碰撞会先在墙上开爆。
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
        description: "拢起一团会炸也会养人的花粉，低弧丢向选定的点：它撞到第一个活体就由那具身体决定结果——敌人挨一次刺人的花粉爆炸，未满血的同伴（包括自己）喝下花粉回血；撞到方块或飞完就原地散开，不再波及旁人。实墙会挡住飞路，第三具站在弹道上的人也会把团子接走。同一团花粉，落在谁身上由谁决定结果。",
        uses: ["同一团花粉既能远程行凶、又能救助同伴", "把一整团花粉精确送到一个敌人或同伴身上", "在交战的间隙把受伤的自己或同伴拉回一点"],
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
            return { radius: Math.max(1.0, p("pollenpuff", "collisionRadius", context) * 4), geometry: "area", style: "puff", color: 0xE8B84A,
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
            const speed = Math.max(0.5, p("pollenpuff", "throwSpeed", action));
            const thickness = Math.max(0.15, p("pollenpuff", "collisionRadius", action));
            const scale = Math.max(0.6, Math.min(2.0, thickness / 0.24));
            const motes = Math.max(14, Math.round(18 + power * 0.25 + mend * 40));
            let settled = false;
            let flight = "";

            /**
             * 散开只发生在团子真正撞到的地方：第一具活体决定这是 `blast` 还是 `mend`；方块或空程只散粉，无伤无疗。
             * 被原生拒绝（免疫、无法治疗）时不发对应的成功表现。
             */
            function disperse(current: CombatAction, hit: CombatImpact): void {
                if (settled) return;
                settled = true;
                const point = hit.position(), target = hit.target();
                const scope = current.world();
                const body = target !== null && scope.valid(target) ? scope.observe(target) : null;
                if (body !== null && target !== null) {
                    if (scope.friendly(target)) {
                        const actual = heal(scope, target, mend, "pollenpuff");
                        if (actual > 0) {
                            WorldFeedback.emit(scope, pollenpuffScene, 1, body.position(),
                                { moment: "mend", target: String(target.ref()), scale: scale, motes: motes,
                                    healed: Math.round(actual * 10) / 10,
                                    intensity: Math.max(0.4, Math.min(2.4, actual / Math.max(1, body.maxHealth()) * 3)) }, 26);
                            WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.3, 0)), pollenpuffMendText,
                                [1, Math.round(actual * 10) / 10], 26);
                        } else {
                            WorldFeedback.emit(scope, pollenpuffScene, 1, body.position(),
                                { moment: "fade", target: String(target.ref()), scale: scale, motes: motes }, 16);
                        }
                    } else {
                        const delivered = impact(current, hit, "pollenpuff", power,
                            { damage: damageSpec("pollenpuff", "blast"), contact: false });
                        if (delivered) {
                            WorldFeedback.emit(scope, pollenpuffScene, 1, body.position(),
                                { moment: "hit", target: String(target.ref()), scale: scale, motes: motes,
                                    intensity: Math.max(0.6, Math.min(2.2, power / 90)) }, 24);
                            WorldFeedback.text(scope, body.position().plus(WorldCombat.point(0, 1.0, 0)), pollenpuffHitText, [1], 24);
                        } else {
                            WorldFeedback.emit(scope, pollenpuffScene, 1, body.position(),
                                { moment: "fade", target: String(target!.ref()), scale: scale, motes: motes }, 16);
                        }
                    }
                } else {
                    WorldFeedback.emit(scope, pollenpuffScene, 1, point, { moment: "fade", scale: scale, motes: motes }, 16);
                    if (target === null) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.8, 0)), pollenpuffMissText, [], 20);
                }
                sound(current, "cobblemon:move.powder.target");
                done(current);
            }

            sound(action, "cobblemon:move.powder.actor");
            const arc = pollenpuffFlight(action.origin(), action.targetPosition(), speed, 0.05);
            const direction = arc === null ? aim(action) : arc.direction;
            const range = arc === null ? action.range() : arc.range;
            flight = LivingActions.projectile(action, {
                speed: speed, gravity: 0.05, range: range, radius: thickness, lifetime: 100,
                direction: direction,
                appearance: { sprite: "cobblemon:particle/generic/powder", scale: 0.9, tint: 0xE8B84A, hitAllies: true },
                impact: function (current, hit) { disperse(current, hit); }
            }, function (current) {
                if (settled) return;
                settled = true;
                // 空程或撞墙：读真实弹体末点；读不到就不假造终点。
                const end = current.world().projectilePosition(flight);
                if (end !== null) WorldFeedback.emit(current.world(), pollenpuffScene, 1, end, { moment: "fade", scale: scale, motes: motes }, 16);
                done(current);
            });
            WorldFeedback.emit(world, pollenpuffScene, 1, action.origin(),
                { moment: "throw", projectile: flight, target: action.target() === null ? "" : String(action.target()!.ref()),
                    scale: scale, motes: motes }, 40);
        }
    });
}
