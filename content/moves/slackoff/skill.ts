/**
 * 偷懒 / Slack Off —— 执行组织。
 *
 * 核心念头：就地一摊，偷懒休息——这一口来得最快最足，但懒意会粘在身上一阵子：随后它拖着步子，走得慢。
 *
 * 出手：共享节奏，起手极短（同族里最快）。windup 只播一点下沉的预告。
 * 结算（提交后，一次结算）：按 heal 补一大口，给自己挂上「倦怠」身份 world_combat:status/loafing
 *   （本单元效果 world_combat:loafing，带移动速度下降的原生属性修饰），持续 loafTicks。
 * 起身：倦怠走完，效果到期被移除时补一幕 rise，画面告诉玩家它缓过来了。
 *
 * 反制：倦怠窗口就是余地——对手可以趁它拖着步子时拉开距离或贴上来打，所以这一口换的是接下来的机动力。
 * 与同族分开：自我再生按刻连续、不锁足；偷懒是一锤子买卖，代价留在身上（移动变慢）。
 */
namespace PokemonSkills {
    const slackoffScene = "world_combat:move_slackoff";
    const slackoffMark = "world_combat:loafing";
    const slackoffTextFlop = "world_combat.move.slackoff.text.flop";
    const slackoffTextLoaf = "world_combat.move.slackoff.text.loaf";

    function slackoffAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 0.8, 0)); }

    /** 回复走共享健康写入；宝可梦经过 NativeEffects.heal（含受治疗加成），其他战斗者直接写 MC 生命。 */
    function slackoffHeal(world: CombatWorld, target: CombatActor, amount: number, cause: string): number {
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

    // 倦怠结束、效果到期被移除时补一幕起身：这件事发生在动作之后，所以从效果移除事件里写。
    WorldCombat.on("world_combat:move/slackoff/rise", "world_combat:mob_effect_removed", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== slackoffMark) return;
        var world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        var body = world.observe(actor);
        if (!body) return;
        WorldFeedback.emit(world, slackoffScene, 1, body.position(), { moment: "rise", target: String(actor.ref()), scale: 1 }, 24);
    });

    define({
        id: slackoffId, name: "偷懒",
        description: "就地一摊偷懒休息：立刻回复最大生命的一半左右，是同族里起手最快的一口；代价是随后一段「倦怠」，期间移动速度降低 22%，直到缓过来为止。",
        uses: ["用最短的起手补一大口", "在对手够不到的间隙里偷懒", "拿接下来的机动力换当下的生命"],
        kind: "self", range: 0, prepare: 6, active: 0, recover: 12, cooldown: 200, style: "slack", maximumTicks: 260,
        defaults: { deep: false },
        fields: [],
        indicator: function (config) { return { radius: 1, style: "slack", label: config && config.deep === true ? "酣睡" : "打盹" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills[slackoffId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            var deep = config && config.deep === true;
            return {
                prepare: Math.max(3, Math.round(p(slackoffId, "slouch", context))),
                recover: Math.max(4, Math.round(p(slackoffId, "stretch", context))),
                cooldown: Math.round(p(slackoffId, "cooldown", context) * (deep ? 1.1 : 0.96)),
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
            action.present("slackoff:windup", slackoffScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()), dust: p(slackoffId, "dust", action) }));
            return prepare;
        },
        execute: function (action, _move, config, done) {
            var world = action.world(), self = action.actor(), body = world.observe(self);
            if (!body) { done(action); return; }
            var deep = config && config.deep === true;
            var fraction = Math.max(0.05, Math.min(0.85, p(slackoffId, "heal", action)));
            var loaf = Math.max(20, Math.round(p(slackoffId, "loafTicks", action)));
            var dust = Math.max(10, Math.round(p(slackoffId, "dust", action)));
            var snores = Math.max(4, Math.round(p(slackoffId, "snoreRate", action)));
            var scale = Math.max(0.7, Math.min(1.8, body.height() / 1.4));
            var missing = body.maxHealth() - body.health();
            var before = body.health();
            slackoffHeal(world, self, Math.min(missing, body.maxHealth() * fraction), "slackoff");
            var after = world.observe(self);
            var gained = after ? Math.max(0, after.health() - before) : 0;
            MobEffects.apply(world, self, slackoffMark, loaf, 0);
            sound(action, "minecraft:block.moss.place");
            WorldFeedback.emit(world, slackoffScene, 1, body.position(),
                { moment: "flop", target: String(self.ref()), dust: dust, gained: Math.round(gained * 10) / 10, deep: deep ? 1 : 0, scale: scale }, 30);
            WorldFeedback.text(world, slackoffAbove(body.position()), slackoffTextFlop, [Math.round(gained * 10) / 10], 30);
            WorldFeedback.emit(world, slackoffScene, 1, body.position(),
                { moment: "loaf", target: String(self.ref()), snores: snores, loaf: loaf, scale: scale }, loaf);
            WorldFeedback.text(world, slackoffAbove(body.position()), slackoffTextLoaf, [], 30);
            done(action);
        }
    });
}
