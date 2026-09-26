/**
 * 电磁炮 / zapcannon —— 出手方式。
 *
 * 核心念头：一门要蓄满才能放的重炮。蓄力时间长（可被打断、不花 PP），射出的电弹又慢又沉；炮口方向
 *   在提交时锁死、飞行中不再转向，对手横向拉开就能甩掉；但只要这一炮真的命中并造成伤害，就重而且一定麻住。
 *
 * 幕：
 *   起（windup，提交前）：把电灌进炮膛，电弧一圈圈收拢、越来越亮（`action.present`）。
 *   轰（fire）：提交后开炮——施法者被后坐向后推一截，炮口炸出一圈电光。
 *   飞（shell）：慢速电弹沿提交时锁定的方向飞出去，不再追踪。
 *   击（burst / fizzle）：真实造成伤害后才尝试施加共享麻痹身份；打空、撞墙或伤害被免疫只留一下散电。
 *
 * 与同族分开：十万伏特是快而稳的点射、电击是贴身的短刺、电磁波是瞬发无伤的直线；电磁炮是本族唯一
 *   「长蓄力 + 慢弹 + 必麻重击」的那门，代价是蓄力最久、冷却最长、也最容易被走位和打断惩罚。
 */
namespace PokemonSkills {
    const zapcannonScene = "world_combat:move_zapcannon";
    const zapcannonTravelKey = "zapcannon:shell:";
    const zapcannonHitText = "world_combat.move.zapcannon.text.hit";
    const zapcannonImmuneText = "world_combat.move.zapcannon.text.immune";
    const zapcannonMissText = "world_combat.move.zapcannon.text.miss";

    define({
        freeMovement: true,
        id: zapcannonId,
        cooldownParameter: "recharge",
        name: "Zap Cannon",
        description: "长时间蓄电，再射出一颗慢而沉的电弹。它飞得慢、只做有限修正，横向走位能甩开；但只要命中，威力很重而且一定麻住目标。蓄力期间可被打断，不花 PP。电属性对麻痹免疫。",
        uses: ["远距离的必麻重击", "先手把冲上来的目标钉住", "用一炮打断对手的节奏"],
        kind: "aim",
        range: 12,
        maxRange: 19,
        prepare: 30,
        active: 0,
        recover: 12,
        cooldown: 54,
        style: "cannon",
        defaults: { quickload: false, ai: { maxChase: 17, preferSteady: true, preferLarge: true, longShot: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[zapcannonId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(zapcannonId, "chargeTicks", context)),
                recover: Math.round(p(zapcannonId, "settle", context)),
                cooldown: Math.round(p(zapcannonId, "recharge", context)),
                active: 0,
                range: p(zapcannonId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const power = p(zapcannonId, "shell", action);
            const arcs = Math.max(6, Math.round(p(zapcannonId, "arcs", action)));
            const intensity = Math.max(0.6, Math.min(2.6, power / 120));
            action.present("zapcannon:charge:" + action.id(), zapcannonScene, 1, action.origin(),
                JSON.stringify({ moment: "charge", windup: prepare, arcs: arcs, intensity: intensity,
                    quickload: config && config.quickload ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[zapcannonId], detail: { values: config } };
            return { radius: p(zapcannonId, "reach", context), geometry: "line", style: "cannon", color: 0x9BE8FF,
                label: config && config.quickload === true ? "电磁炮·速装" : "电磁炮·满装" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const target = action.target();
            const power = p(zapcannonId, "shell", action);
            const speed = p(zapcannonId, "shellSpeed", action);
            const radius = p(zapcannonId, "shockRadius", action);
            const numbTicks = Math.max(20, Math.round(p(zapcannonId, "numbTicks", action)));
            const recoil = p(zapcannonId, "recoil", action);
            const arcs = Math.max(6, Math.round(p(zapcannonId, "arcs", action)));
            const scale = Math.max(0.6, Math.min(2.4, radius / 1.0));
            const intensity = Math.max(0.6, Math.min(2.6, power / 120));
            const flow = Math.round(40 + power * 0.4);
            let settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            // 提交时锁死炮口方向：不再转向目标。后坐沿瞄准方向的反向推开施法者。
            const aimBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const aimPoint = aimBody !== null ? aimBody.position() : action.targetPosition();
            const delta = aimPoint.minus(action.origin());
            const heading = delta.length() > 0.02 ? delta.unit() : action.direction();
            if (heading.length() > 0.02) world.displace(self, heading.unit().scale(-recoil));

            sound(action, "minecraft:item.trident.throw");
            WorldFeedback.emit(world, zapcannonScene, 1, action.origin(),
                { moment: "fire", recoil: recoil, arcs: arcs, scale: scale, intensity: intensity }, 22);

            // 弹体按真实碰撞半径 0.34 显示（scale 1 为原贴图大小），爆开大小仍随 shockRadius 走。
            const appearance: LivingActions.ProjectileAppearance = {
                sprite: "cobblemon:particle/generic/orb/energyorb", tint: 0x8FE8FF, glow: true, scale: 1
            };

            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.34, direction: heading,
                lifetime: Math.max(40, Math.round(action.range() / Math.max(0.15, speed) + 30)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const point = hit.position();
                    const victim = hit.target();
                    if (victim !== null && scope.valid(victim) && !scope.friendly(victim)) {
                        // 先看这一炮是否真的造成了伤害：免疫伤害或被挡下不算成功炮击，不施加必麻。
                        const dealt = impact(current, hit, zapcannonId, power, { damage: damageSpec(zapcannonId, "shell") });
                        if (!dealt) {
                            WorldFeedback.emit(scope, zapcannonScene, 1, point, { moment: "fizzle", arcs: arcs, scale: scale }, 24);
                            WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), zapcannonMissText, [], 24);
                            scope.sound("minecraft:block.amethyst_block.resonate", point, 14, "{}");
                            return;
                        }
                        const applied = CombatStatus.inflict(scope, victim, "paralysis", numbTicks);
                        WorldFeedback.emit(scope, zapcannonScene, 1, point,
                            { moment: "burst", target: String(victim.ref()), sparks: Math.round(20 + power * 0.5),
                                arcs: arcs, scale: scale, intensity: intensity }, 34);
                        scope.sound("minecraft:entity.lightning_bolt.impact", point, 18, "{}");
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)),
                            applied ? zapcannonHitText : zapcannonImmuneText, [], 30);
                        if (applied) sound(current, "cobblemon:move.thunderbolt.target");
                    } else {
                        WorldFeedback.emit(scope, zapcannonScene, 1, point, { moment: "fizzle", arcs: arcs, scale: scale }, 24);
                        WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.6, 0)), zapcannonMissText, [], 24);
                        scope.sound("minecraft:block.amethyst_block.resonate", point, 14, "{}");
                    }
                }
            }, function (current: CombatAction) { finish(current); });

            WorldFeedback.keep(world, zapcannonTravelKey + action.id(), zapcannonScene, 1, action.origin(),
                { moment: "shell", projectile: flight, arcs: arcs, scale: scale, intensity: intensity, flow: flow }, 140);
        }
    });
}
