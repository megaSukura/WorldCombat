/**
 * 镜面反射 / mirrorcoat 的出手方式。
 *
 * 核心念头：立起一面镜，把最近吃下的特殊伤害映住，再沿着来击的方向把翻倍的能量射回给账主。
 *
 * 两幕：
 *   起（windup，提交前）：镜面在身前立起、微微发亮；账越大镜面映得越满（present mirror）。
 *   反射（execute）：光束脱手——有实体就锁定追飞，只有空点就照瞄准方向直射；命中按账本直接结算，
 *       命中反馈读真实伤害回执；撞墙或被免疫在接触点碎成片；没有账时镜面只闪一下。
 *
 * 与同族分开：镜面反射只认特殊、可隔空/对点发射、镜面与光束是它的形状；双倍奉还只认物理、贴身迎击。
 */
namespace PokemonSkills {
    define({
        id: mirrorcoatId,
        cooldownParameter: "recharge",
        name: "Mirror Coat",
        description: "把最近受到的特殊伤害以两倍射回给对手；没有账可讨时镜面只闪一下。",
        uses: ["挨了一记特殊重击后隔空还回去", "惩罚远程特攻手", "在安全距离上把承伤转成输出"],
        kind: "aim",
        range: 7.5,
        maxRange: 12,
        prepare: 6,
        active: 0,
        recover: 8,
        cooldown: 34,
        style: "mirror",
        defaults: { polish: false, ai: { maxChase: 11 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(mirrorcoatId, "collisionRadius", pokemon), geometry: "line", style: "mirror", color: 0xBFE9FF,
                label: config && config.polish === true ? "镜面反射·抛光" : "镜面反射" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[mirrorcoatId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(mirrorcoatId, "focus", context)),
                recover: Math.round(p(mirrorcoatId, "settle", context)),
                cooldown: Math.round(p(mirrorcoatId, "recharge", context)),
                active: 0,
                range: p(mirrorcoatId, "boltRange", context)
            };
        },
        windup: function (action, config, prepare) {
            const record = mirrorcoatRecord(action.sense(), action.actor());
            const amount = record === null ? 0 : record.amount;
            const panes = p(mirrorcoatId, "mirrorRadius", action);
            action.present("mirrorcoat:mirror", mirrorcoatScene, 1, action.origin(),
                JSON.stringify({ moment: "mirror", target: String(action.target() === null ? "" : action.target()!.ref()),
                    panes: Math.round(10 + Math.min(70, amount * 0.6)), scale: panes / 0.7,
                    polish: config && config.polish === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const refund = Math.round(p(mirrorcoatId, "refund", action));
            const target = action.target();
            mirrorcoatConsume(self);
            if (!(refund > 0)) {
                sound(action, "minecraft:block.glass.place");
                WorldFeedback.emit(world, mirrorcoatScene, 1, action.targetPosition(), { moment: "whiff" }, 22);
                WorldFeedback.text(world, action.targetPosition().plus(WorldCombat.point(0, 1, 0)), mirrorcoatWhiffText, [], 24);
                done(action);
                return;
            }

            const speed = p(mirrorcoatId, "boltSpeed", action);
            const radius = p(mirrorcoatId, "collisionRadius", action);
            const range = p(mirrorcoatId, "boltRange", action);
            // aim 契约：有实体就沿目标锁定，只有空点/目标离场就照瞄准方向直射，不强制存在敌人。
            const direction = aim(action);
            const scale = radius / 0.34;
            let settled = false;

            sound(action, "minecraft:entity.illusioner.prepare_mirror");
            const appearance: any = { sprite: "cobblemon:particle/generic/psychic/psyswirl", tint: 0xBFE9FF, glow: true, scale: 0.9 };
            if (target !== null && world.valid(target)) appearance.homing = { target: String(target.ref()), turn: 8, delay: 1, range: range };

            const flight: LivingActions.Flight = {
                speed: speed, range: range, radius: radius, direction: direction, gravity: 0,
                lifetime: Math.max(30, Math.round(range / Math.max(0.2, speed) + 30)),
                appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact, age: number) {
                    const scope = current.world(), point = hit.position(), victim = hit.target();
                    if (victim === null || !scope.valid(victim) || scope.friendly(victim)) {
                        // 打到实体与打到方块分开呈现：撞墙用 shatter，空放/掠过用 whiff。
                        WorldFeedback.emit(scope, mirrorcoatScene, 1, point,
                            { moment: hit.blocked() ? "shatter" : "whiff", scale: scale, face: hit.blockFace() }, 20);
                        return;
                    }
                    current.data("mirrorcoat/strike", JSON.stringify({ scale: scale }));
                    const landed = mirrorcoatRawHit(current, victim, refund, false);
                    if (!landed) WorldFeedback.emit(scope, mirrorcoatScene, 1, point, { moment: "shatter", scale: scale }, 20);
                    scope.sound("cobblemon:impact.psychic", point, 16, "{}");
                }
            };
            const projectile = LivingActions.projectile(action, flight, function (current: CombatAction) {
                if (settled) { done(current); return; }
                settled = true;
                done(current);
            });
            WorldFeedback.emit(world, mirrorcoatScene, 1, action.origin(), { moment: "muzzle", scale: scale }, 18);
            WorldFeedback.keep(world, "mirrorcoat:flight:" + action.id(), mirrorcoatScene, 1, action.origin(),
                { moment: "flight", projectile: projectile, scale: scale }, flight.lifetime! + 10);
        }
    });
}
