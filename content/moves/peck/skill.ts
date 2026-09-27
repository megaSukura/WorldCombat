/**
 * 啄 / peck 的出手方式。
 *
 * 核心念头：**全身前探，喙尖朝身前一个点一记快到几乎看不到起手的点啄**——本族最轻、最快、最省的一记，
 * 靠的是一记接一记地甩，而不是单发的分量。对手离地时，喙尖勾住它往下带，伤害更高并被压回地面
 * （原生可命中空中）。它是全族唯一的「贴脸单发、专把空中的打下来」的快速点啄。
 *
 * 两幕：
 *   起（read，提交前）：缩颈、喙尖聚一点微光，只播预告。
 *   啄（jab → hit / plummet / whiff，提交后）：朝目标垫进 `lunge` 格，随后从真实头部高度朝身前送出
 *       `reach` 格的一条短喙线，被墙截断到接触面；沿这条线取最近的一个非友方结算 `peck` 接触伤害。
 *       离地目标乘 `airBonus`，再以受原生碰撞与击退抗性约束的下压把它按回地面；实际下降才播「啄落」，
 *       免疫或抗性挡下时不补写位移；没啄中只留一点乱羽。墙外的目标不在截断后的线上。
 *
 * 选取：`kind: "aim"`——可点任意阵营实体或一个世界点，朝方向也能空啄；命中权限仍由命中层判断。
 *
 * 与同族分开：啄钻是原地旋转、连续几口把目标往后顶的钻孔，龙爪是宽弧重斩，角撞是顶住推走，木枝突刺是从最远处直刺；
 * 啄凭「贴脸、单发、对空下压」认出来。
 *
 * 配置 `dive` 由公式改威力、射程、前探与对空，由 resolve 改时序；提交后才触碰世界。该选项是**前探式**
 * （整个人探身扑出），不是下俯。
 */
namespace PokemonSkills {
    const peckScene = "world_combat:move_peck";
    const peckHitText = "world_combat.move.peck.text.hit";
    const peckDownText = "world_combat.move.peck.text.down";
    const peckMissText = "world_combat.move.peck.text.miss";

    /** 把瞄准方向压平成一个水平单位向量。 */
    function peckHeading(direction: CombatPoint): CombatPoint {
        const flat = WorldCombat.point(direction.x(), 0, direction.z());
        return flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
    }

    define({
        freeMovement: true,
        id: "peck",
        cooldownParameter: "recharge",
        name: "Peck",
        description: "快速啄击近处目标。命中空中的敌人时伤害提高，并以受原生碰撞与击退抗性约束的下压把它按向地面。",
        uses: ["贴脸一记最快、最省的单发点啄", "把离地的目标一喙压回地面", "在对手起手前抢一记速啄"],
        kind: "aim",
        range: 1.7,
        maxRange: 2.8,
        prepare: 4,
        active: 8,
        recover: 4,
        cooldown: 10,
        style: "peck",
        defaults: { dive: false, ai: { maxChase: 4, pickAir: true, finish: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("peck", "reach", pokemon), geometry: "line", style: "peck", color: 0xCFE8FF,
                label: config && config.dive === true ? "探身啄" : "啄" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["peck"], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p("peck", "tempo", context)),
                recover: Math.round(p("peck", "aftercast", context)),
                cooldown: Math.round(p("peck", "recharge", context)),
                active: skills["peck"].active,
                range: p("peck", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_peck:read", peckScene, 1, action.origin(),
                JSON.stringify({ moment: "read", windup: prepare, dive: config && config.dive === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const heading = peckHeading(aim(action));
            const reach = Math.max(1.4, p("peck", "reach", action));
            const beak = Math.max(0.22, p("peck", "beak", action));
            const lunge = Math.max(0, p("peck", "lunge", action));
            const plummet = Math.max(0.3, p("peck", "plummet", action));
            const airBonus = Math.max(1, p("peck", "airBonus", action));
            const power = p("peck", "peck", action);
            const feathers = Math.max(6, Math.round(p("peck", "feathers", action)));
            const scale = Math.max(0.6, Math.min(1.8, reach / 1.7));
            const intensity = Math.max(0.6, Math.min(2.0, power / 34));

            const self = world.observe(actor);
            if (self !== null && lunge > 0.05) {
                const target = action.target();
                const body = target !== null && world.valid(target) ? world.observe(target) : null;
                const delta = body !== null ? body.position().minus(self.position()) : heading.scale(lunge);
                const flat = Math.sqrt(delta.x() * delta.x() + delta.z() * delta.z());
                const advance = Math.min(lunge, Math.max(0, flat - beak - 0.15));
                if (advance > 0.02) world.displace(actor, heading.scale(advance));
            }
            const moved = world.observe(actor);
            const origin = moved === null ? action.origin() : moved.position();
            // 真实喙线：从实际头部高度朝身前送出 reach 格，被墙截断到接触面。
            const head = origin.plus(WorldCombat.point(0, moved === null ? 0.4 : Math.max(0, Math.min(0.7, moved.height() * 0.3)), 0));
            let tip = head.plus(heading.scale(reach));
            const wall = WorldGeometry.blockHit(world, head, tip);
            if (wall !== null) tip = wall.position();
            const path = [[head.x(), head.y(), head.z()], [tip.x(), tip.y(), tip.z()]];

            sound(action, "minecraft:entity.player.attack.weak");
            WorldFeedback.emit(world, peckScene, 1, tip,
                { moment: "jab", path: path, tip: [tip.x(), tip.y(), tip.z()], from: [head.x(), head.y(), head.z()],
                    direction: [heading.x(), heading.y(), heading.z()], reach: reach, feathers: feathers, scale: scale, intensity: intensity }, 16);

            // 沿真实喙线取最近的一个非友方；被墙截断后，墙外的目标不在线上。
            const found: { actor: CombatActor; facts: CombatObservation; distance: number }[] = [];
            WorldGeometry.selectBodies(world, WorldGeometry.bodySegment(head, tip, beak),
                function (candidate: CombatActor, facts: CombatObservation) {
                    if (facts.friendly() || String(candidate.ref()) === String(actor.ref())) return;
                    const contact = WorldGeometry.closestOnSegment(facts.position(), head, tip);
                    found.push({ actor: candidate, facts: facts, distance: contact.minus(head).length() });
                });
            found.sort(function (a, b) { return a.distance - b.distance; });

            if (found.length === 0) {
                WorldFeedback.emit(world, peckScene, 1, tip,
                    { moment: "whiff", feathers: Math.round(feathers * 0.6), scale: scale }, 16);
                WorldFeedback.text(world, tip.plus(WorldCombat.point(0, 1.0, 0)), peckMissText, [], 20);
                done(action);
                return;
            }

            const victim = found[0].actor;
            const foe = world.observe(victim);
            if (foe === null) { done(action); return; }
            const airborne = !foe.grounded();
            const per = power * (airborne ? airBonus : 1);
            if (!hurt(action, victim, "peck", per, { damage: damageSpec("peck", "peck"), contact: true })) { done(action); return; }

            WorldFeedback.emit(world, peckScene, 1, foe.position(),
                { moment: "hit", target: String(victim.ref()), feathers: feathers, airborne: airborne ? 1 : 0,
                    scale: scale, intensity: intensity }, 18);
            WorldFeedback.text(world, foe.position().plus(WorldCombat.point(0, 1.1, 0)), peckHitText, [], 20);
            sound(action, "cobblemon:impact.flying");

            if (airborne && world.valid(victim)) {
                // 下压走原生受击位移：被免疫或抗性挡下时返回 0，此时不播「啄落」、不补写 motion。
                const fell = world.hitDisplace(victim, WorldCombat.point(0, -plummet, 0));
                if (fell > 0.01) {
                    const now = world.observe(victim);
                    const at = now === null ? foe.position() : now.position();
                    WorldFeedback.emit(world, peckScene, 1, at,
                        { moment: "plummet", target: String(victim.ref()), plummet: plummet,
                            drives: Math.max(6, Math.min(30, Math.round(fell * 24))), scale: scale }, 18);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.35, 0)), peckDownText, [], 20);
                }
            }
            done(action);
        }
    });
}
