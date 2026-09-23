/**
 * 自我再生 / Recover —— 执行组织。
 *
 * 核心念头：让身体自己把伤口一点点补上——细胞持续再生，伤得越狠干得越猛，而且它**不锁足、边走边修**。
 *
 * 出手：共享节奏。windup（提交前）只播预告——体表先浮起一层细密的再生微光；准备可被打断，不花代价。
 * 再生（regen，提交后）：给自己挂共享身份 world_combat:status/regenerating（本单元效果 world_combat:regenerating），
 *   在 restoreTicks 窗口里每 2 刻交付一小份回复；每份按当前缺失生命封顶，生命补满即提前收势。
 * 结束：窗口走完（settle）、补满（full）或身份被清除（broken）——身份被牛奶／`/effect clear` 清掉时
 *   立刻停止剩余的交付，只留下已经补进去的部分。
 *
 * 反制：这段窗口持续而缓慢，爆发伤害可以在它补满之前把它按死；清除身份则直接掐掉剩下的回复。
 * 与同族分开：光合作用读光照、集沙吃地面、羽栖落地分段；自我再生不吃环境、不锁足、按刻连续交付。
 */
namespace PokemonSkills {
    const recoverScene = "world_combat:move_recover";
    const recoverMark = "world_combat:regenerating";
    const recoverTextBegin = "world_combat.move.recover.text.begin";
    const recoverTextFull = "world_combat.move.recover.text.full";
    const recoverTextEnd = "world_combat.move.recover.text.end";
    const recoverTextBroken = "world_combat.move.recover.text.broken";

    function recoverAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function recoverHeal(world: CombatWorld, target: CombatActor, amount: number, cause: string): number {
        if (!(amount > 0) || !world.valid(target)) return 0;
        var healed = 0;
        if (String(target.domain()) === "cobblemon") {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            healed = NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            healed = world.health(target, amount, "world_combat:" + cause);
        }
        return healed;
    }

    define({
        id: recoverId, name: "自我再生",
        description: "让身体自行再生：在一段窗口里按刻把生命补回来，总量随伤势最多约最大生命的六成；伤得越重回得越多，而且不锁足、可以边走边修。清除身上的再生效果会掐断剩余的回复。",
        uses: ["在走位中持续补回生命", "重伤时让细胞干得更猛", "用不锁足的窗口换一段安全的回复"],
        kind: "self", range: 0, prepare: 10, active: 0, recover: 8, cooldown: 230, style: "regenerate", maximumTicks: 340,
        stationary: false,
        defaults: { steady: false },
        fields: [],
        indicator: function (config) { return { radius: 1, style: "regenerate", label: config && config.steady === true ? "稳态再生" : "速生" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[recoverId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var steady = config && config.steady === true;
            return {
                prepare: Math.max(3, Math.round(p(recoverId, "gather", context))),
                recover: Math.max(3, Math.round(p(recoverId, "settle", context))),
                cooldown: Math.round(p(recoverId, "cooldown", context) * (steady ? 1.08 : 0.95)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            if (body.health() >= body.maxHealth() - 0.01) return "nothing-to-restore";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("recover:windup", recoverScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()),
                    motes: p(recoverId, "motes", action), glow: p(recoverId, "glow", action) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var total = Math.max(0.05, Math.min(0.85, p(recoverId, "heal", action)));
            var window = Math.max(20, Math.round(p(recoverId, "restoreTicks", action)));
            var motes = Math.max(12, Math.round(p(recoverId, "motes", action)));
            var glow = Math.max(0.6, p(recoverId, "glow", action));
            var scale = Math.max(0.7, Math.min(1.9, glow / 0.9));
            var interval = 2;
            var steps = Math.max(1, Math.round(window / interval));
            var perStep = body.maxHealth() * total / steps;

            MobEffects.apply(world, self, recoverMark, window + 20, 0);
            sound(action, "minecraft:block.beacon.activate");
            WorldFeedback.emit(world, recoverScene, 1, body.position(),
                { moment: "begin", target: String(self.ref()), motes: motes, glow: glow, scale: scale, rate: Math.round(perStep / interval * 10) }, 30);
            WorldFeedback.text(world, recoverAbove(body.position()), recoverTextBegin, [], 30);

            var left = steps, sinceFloat = 0;
            function step(current: CombatAction): void {
                var access = current.world();
                if (!access.valid(self)) { done(current); return; }
                var now = access.observe(self);
                if (!now) { done(current); return; }
                if (MobEffects.read(access, self, recoverMark) === null) {
                    WorldFeedback.emit(access, recoverScene, 1, now.position(), { moment: "broken", target: String(self.ref()), scale: scale }, 24);
                    WorldFeedback.text(access, recoverAbove(now.position()), recoverTextBroken, [], 24);
                    done(current);
                    return;
                }
                var missing = now.maxHealth() - now.health();
                if (missing <= 0.01) {
                    MobEffects.consume(access, self, recoverMark);
                    WorldFeedback.emit(access, recoverScene, 1, now.position(), { moment: "settle", target: String(self.ref()), scale: scale }, 22);
                    WorldFeedback.text(access, recoverAbove(now.position()), recoverTextFull, [], 24);
                    done(current);
                    return;
                }
                var healed = recoverHeal(access, self, Math.min(missing, perStep), "recover");
                sinceFloat += healed;
                if (sinceFloat >= now.maxHealth() * 0.08) {
                    feedback(access, self, now.position(), "heal", { amount: Math.round(sinceFloat * 10) / 10 });
                    sinceFloat = 0;
                }
                WorldFeedback.keep(access, "recover:regen:" + String(self.ref()), recoverScene, 1, now.position(),
                    { moment: "regenerate", target: String(self.ref()), motes: motes, glow: glow, scale: scale,
                        left: left, total: steps, rate: Math.round(perStep / interval * 10) }, 20);
                left = left - 1;
                if (left <= 0) {
                    if (sinceFloat > 0) feedback(access, self, now.position(), "heal", { amount: Math.round(sinceFloat * 10) / 10 });
                    WorldFeedback.emit(access, recoverScene, 1, now.position(), { moment: "settle", target: String(self.ref()), scale: scale }, 24);
                    WorldFeedback.text(access, recoverAbove(now.position()), recoverTextEnd, [], 24);
                    done(current);
                    return;
                }
                current.after(interval, step);
            }
            action.after(interval, step);
        }
    });
}
