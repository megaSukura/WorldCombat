/**
 * 喝牛奶 / Milk Drink —— 执行组织。
 *
 * 核心念头：仰头连饮几大口，温热的牛奶把伤补上，最后一口把身上的毒也冲掉——几口之间就是这招的节拍。
 * 这是一次需要连续喝完的主动饮用：中断或主动放弃只会保留已经喝下的部分，绝不会提前解毒。
 *
 * 出手：共享节奏。windup（提交前）只播预告——瓶口先浮起一层乳白的泡沫。
 * 连饮（gulp，提交后）：把回复分成 gulps 口，每 gulpTicks 交付一口，每口补进一部分；
 *   每口都推一次饮用表现（真实喝下即出现，满血但带毒时补 0 也照喝），最后一口结束后调用
 *   CombatStatus.cure(world, self, "poison")，只要身上带着任一来源的中毒就被冲掉（refresh 一幕）。
 * 收势：饮完抹嘴（wipe），结束；主动取消或被打断时动作直接收尾，不走到最后一口、不解毒，已喝部分保留。
 *
 * 反制：连饮有节拍、要花几息——对手可以在这段时间继续压血，把每一口都吃掉；解毒是完成奖励，不是保险。
 * 与同族分开：自我再生按刻连续、可在攻击中随时掐断；偷懒留下减速、生蛋外化为蛋；喝牛奶是**要喝完才有的节拍连饮，并额外清毒**。
 */
namespace PokemonSkills {
    const milkdrinkScene = "world_combat:move_milkdrink";
    const milkdrinkTextDrink = "world_combat.move.milkdrink.text.drink";
    const milkdrinkTextClean = "world_combat.move.milkdrink.text.clean";
    const milkdrinkTextQuenched = "world_combat.move.milkdrink.text.quenched";

    function milkdrinkAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.9, 0)); }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function milkdrinkHeal(world: CombatWorld, target: CombatActor, amount: number, cause: string): number {
        if (!(amount > 0) || !world.valid(target)) return 0;
        var before = world.observe(target);
        if (!before) return 0;
        if (String(target.domain()) === "cobblemon") {
            var pokemon = CobblemonCombat.pokemon(target), scale = Math.max(0.001, pokemon.healthScale());
            NativeEffects.heal(world, target, pokemon, amount / scale, cause);
        } else {
            world.health(target, amount, "world_combat:" + cause);
        }
        var after = world.observe(target);
        return after ? Math.max(0, after.health() - before.health()) : 0;
    }

    define({
        id: milkdrinkId, name: "喝牛奶",
        description: "仰头连饮几大口，把回复分成几口交付、总量约最大生命的一半；最后一口把身上的中毒冲掉。饮用期间可以继续走位，但每一口都要花掉几息；没喝完（主动取消或被打断）只保留已喝部分，也不会解毒。",
        uses: ["分几口补回生命", "喝完最后一口冲掉中毒", "满血中毒时也值得动用"],
        kind: "self", range: 0, prepare: 8, active: 0, recover: 10, cooldown: 200, style: "milk", maximumTicks: 220,
        stationary: false,
        defaults: { warm: false },
        fields: [],
        indicator: function (config) { return { radius: 1, style: "milk", label: config && config.warm === true ? "温奶" : "冷饮" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[milkdrinkId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var warm = config && config.warm === true;
            return {
                prepare: Math.max(3, Math.round(p(milkdrinkId, "open", context))),
                recover: Math.max(3, Math.round(p(milkdrinkId, "wipe", context))),
                cooldown: Math.round(p(milkdrinkId, "cooldown", context) * (warm ? 1.08 : 0.94)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            var world = action.sense(), self = action.actor(), body = world.observe(self);
            if (!body) return "invalid-target";
            // 满血且没有中毒就没有收益；满血但带毒仍可喝完（最后一口解毒）。
            if (body.health() >= body.maxHealth() - 0.01 && !CombatStatus.has(world, self, "poison")) return "nothing-to-restore";
            return "";
        },
        windup: function (action, _config, prepare) {
            action.present("milkdrink:windup", milkdrinkScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()), drops: p(milkdrinkId, "drops", action) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var warm = config && config.warm === true;
            var fraction = Math.max(0.05, Math.min(0.85, p(milkdrinkId, "heal", action)));
            var gulps = Math.max(3, Math.min(6, Math.round(p(milkdrinkId, "gulps", action))));
            var gap = Math.max(3, Math.round(p(milkdrinkId, "gulpTicks", action)));
            var drops = Math.max(8, Math.round(p(milkdrinkId, "drops", action)));
            var clean = Math.max(0.6, p(milkdrinkId, "cleanRadius", action));
            var scale = Math.max(0.7, Math.min(1.8, body.height() / 1.4));
            var portion = body.maxHealth() * fraction / gulps;

            sound(action, "minecraft:entity.cow.milk");
            WorldFeedback.emit(world, milkdrinkScene, 1, body.position(),
                { moment: "open", target: String(self.ref()), drops: drops, gulps: gulps, scale: scale, warm: warm ? 1 : 0 }, 26);
            WorldFeedback.text(world, milkdrinkAbove(body.position()), milkdrinkTextDrink, [], 26);

            var left = gulps;
            function step(current: CombatAction): void {
                var access = current.world();
                if (!access.valid(self)) { done(current); return; }
                var now = access.observe(self);
                if (!now) { done(current); return; }
                var missing = now.maxHealth() - now.health();
                var healed = milkdrinkHeal(access, self, Math.min(missing, portion), "milkdrink");
                if (healed > 0)
                    feedback(access, self, now.position(), "heal", { amount: Math.round(healed * 10) / 10 });
                left = left - 1;
                sound(current, "minecraft:entity.generic.drink");
                // 每口都推一次：真实喝下即出现；真正补进生命时画面更足，满血解毒时补 0 也照喝。
                WorldFeedback.emit(access, milkdrinkScene, 1, now.position(),
                    { moment: "gulp", target: String(self.ref()), drops: drops, left: left, total: gulps, scale: scale,
                        healed: Math.round(healed * 100) / 100,
                        intensity: healed > 0 ? Math.max(0.6, Math.min(1.6, 0.8 + healed / Math.max(0.001, portion) * 0.4)) : 0.6 }, 24);
                if (left <= 0) {
                    // 只有真正喝完最后一口才解毒；中途取消／被打断不会走到这里，因此不会提前解毒。
                    var cleaned = CombatStatus.cure(access, self, "poison");
                    if (cleaned) {
                        access.sound("minecraft:item.honey_bottle.drink", now.position(), 16, "{}");
                        WorldFeedback.emit(access, milkdrinkScene, 1, now.position(),
                            { moment: "refresh", target: String(self.ref()), clean: clean, scale: scale }, 28);
                        WorldFeedback.text(access, milkdrinkAbove(now.position()), milkdrinkTextClean, [], 28);
                    } else {
                        WorldFeedback.text(access, milkdrinkAbove(now.position()), milkdrinkTextQuenched, [], 26);
                    }
                    WorldFeedback.emit(access, milkdrinkScene, 1, now.position(),
                        { moment: "wipe", target: String(self.ref()), scale: scale, cleaned: cleaned ? 1 : 0 }, 22);
                    done(current);
                    return;
                }
                current.after(gap, step);
            }
            action.after(1, step);
        }
    });
}
