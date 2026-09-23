/**
 * 礼物 / present 的出手方式。
 *
 * 核心念头：你给对面递上一个盒子，它当着面打开——多数时候是个弹簧拳套（造成伤害），偶尔真是一颗糖
 *   （反而把对方治好）。你并不知道递出去的是哪一种；恶作剧上得越紧，大的那几下越可能，误放糖果的机会也越大。
 *
 * 三幕：
 *   起（windup，提交前）：掌心托起一个礼盒、缎带亮起，只播预告。
 *   掷（throw → open，提交后）：盒子沿低弧抛向选定的落点，撞到人或落地就当着谁打开。
 *   开（candy / blast，提交后）：掷中糖果（`sweetChance`）就治疗落点旁最近的一个活物（连对手一起）；
 *       否则按 `heavyChance`／固定 30% 分出重／中／轻三档，对落点附近的非友方炸出机关。落点没人时盒子空开。
 *
 * 与家族分开：其余三招是稳定的「伤害换回复」，只有礼物会把生命还给对手——结果由一次掷骰决定，不由对象决定
 *   （花粉团按友敌分红结果，这里按概率）。
 *
 * 伤害走共享 `hurt`；治疗走共享 `heal`，对宝可梦、原版生物、玩家同一条路。
 */
namespace PokemonSkills {
    const presentHitText = "world_combat.move.present.text.hit";
    const presentCandyText = "world_combat.move.present.text.candy";
    const presentEmptyText = "world_combat.move.present.text.empty";

    /** 落点附近最近的活物；用来决定「当着谁开盒」。 */
    function presentNearest(world: CombatWorld, point: CombatPoint, radius: number): CombatActor | null {
        const found = world.query(point, radius, false);
        let best: CombatActor | null = null, closest = radius + 1;
        for (let i = 0; i < found.length; i++) {
            const facts = world.observe(found[i]);
            if (facts === null) continue;
            const gap = facts.position().minus(point).length();
            if (gap <= radius && gap < closest) { closest = gap; best = found[i]; }
        }
        return best;
    }

    define({
        id: presentId,
        cooldownParameter: "recharge",
        name: "Present",
        description: "递给对手设有圈套的盒子进行攻击。也有可能回复对手HP。",
        uses: ["远程递上一个有时会炸、偶尔会治人的盒子", "在安全距离外赌一次高伤害", "恶作剧式地给对手送上一盒"],
        kind: "point",
        range: 7,
        maxRange: 11,
        prepare: 7,
        active: 1,
        recover: 6,
        cooldown: 22,
        style: "gift",
        defaults: { trick: false, ai: { maxChase: 10, riskBelow: 0.4 } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[presentId], detail: { values: config } };
            return { radius: p(presentId, "burstRadius", context), geometry: "area", style: "gift", color: 0xE05050,
                label: config && config.trick === true ? "礼物·戏耍盒" : "礼物·稳妥盒" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[presentId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(presentId, "tempo", context)),
                recover: Math.round(p(presentId, "settle", context)),
                cooldown: Math.round(p(presentId, "recharge", context)),
                active: 1,
                range: p(presentId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:present:" + action.id(), presentScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", trick: config && config.trick === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const power = p(presentId, "surprise", action);
            const mend = Math.max(0.08, Math.min(0.9, p(presentId, "mend", action)));
            const radius = Math.max(1.2, p(presentId, "burstRadius", action));
            const speed = Math.max(0.5, p(presentId, "throwSpeed", action));
            const sweet = Math.max(0, Math.min(0.9, p(presentId, "sweetChance", action)));
            const heavy = Math.max(0, Math.min(0.9, p(presentId, "heavyChance", action)));
            const motes = Math.max(10, Math.round(p(presentId, "motes", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 1.7));
            let settled = false;

            function open(current: CombatAction, point: CombatPoint): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const roll = scope.random();

                if (roll < sweet) {
                    const recipient = presentNearest(scope, point, radius + 0.6);
                    const at = recipient === null ? point : (scope.observe(recipient) === null ? point : scope.observe(recipient)!.position());
                    let healed = 0;
                    if (recipient !== null) healed = heal(scope, recipient, mend, "present");
                    WorldFeedback.emit(scope, presentScene, 1, at,
                        { moment: "candy", target: recipient === null ? "" : String(recipient.ref()),
                            friend: recipient !== null && scope.friendly(recipient) ? 1 : 0,
                            motes: motes, scale: scale, healed: Math.round(healed * 10) / 10 }, 30);
                    sound(current, "minecraft:entity.allay.item_given");
                    WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 1.1, 0)), presentCandyText, [Math.round(mend * 100)], 26);
                    done(current);
                    return;
                }

                const tier = roll < sweet + heavy ? 1.5 : roll < sweet + heavy + 0.3 ? 1 : 0.65;
                let struck = 0;
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, radius, { below: 2, above: 3 }), function (other, facts) {
                    if (String(other.ref()) === String(current.actor().ref()) || struck >= 8) return;
                    if (!hurt(current, other, presentId, power * tier,
                        { damage: damageSpec(presentId, "surprise") })) return;
                    struck++;
                    WorldFeedback.emit(scope, presentScene, 1, facts.position(),
                        { moment: "blast", target: String(other.ref()), tier: tier, motes: motes, scale: scale,
                            intensity: Math.max(0.5, Math.min(2.2, power * tier / 70)) }, 24);
                });
                WorldFeedback.emit(scope, presentScene, 1, point,
                    { moment: "open", tier: tier, motes: motes, scale: scale, struck: struck }, 26);
                sound(current, "minecraft:entity.generic.explode");
                if (struck > 0) WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.0, 0)), presentHitText, [struck], 26);
                else WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.9, 0)), presentEmptyText, [], 22);
                done(current);
            }

            sound(action, "minecraft:entity.armor_stand.place");
            const arc = LivingActions.ballistic(action.origin(), action.targetPosition(), speed, 0.05);
            const flight = LivingActions.projectile(action, {
                speed: speed, gravity: 0.05, range: action.range(), radius: p(presentId, "collisionRadius", action), lifetime: 100,
                direction: arc || undefined,
                appearance: { sprite: "cobblemon:particle/generic/present", scale: 0.8, glow: true },
                impact: function (current, hit) { open(current, hit.position()); }
            }, function (current) { open(current, current.targetPosition()); });
            WorldFeedback.emit(world, presentScene, 1, action.origin(),
                { moment: "throw", projectile: flight, target: action.target() === null ? "" : String(action.target()!.ref()),
                    motes: motes, scale: scale, sweet: Math.round(sweet * 100), power: Math.round(power * 10) / 10 }, 40);
        }
    });
}
