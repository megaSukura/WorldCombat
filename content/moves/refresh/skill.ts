/**
 * 焕然一新 / Refresh —— 执行组织。
 *
 * 核心念头：站定屏住一口气，把身上的毒、灼、麻一口气抖落干净；抖落之后身体清爽一小段时间，
 *   同样的三种异常再想上身会被弹开。它不回复生命、不解睡眠与冰冻——那正是它和「睡觉」的分界。
 *
 * 两幕：
 *   息（windup，提交前）：只观察与预告，被打断不付任何代价；准备期不能移动（stationary）。
 *   净（提交后）：一次把毒／剧毒、灼伤、麻痹从身上清除，并挂上真实 MobEffect world_combat:clearheaded
 *     （共享身份 world_combat:status/clearheaded，物品栏可见、/effect 可用），窗口长度由特防与等级决定。
 * 反制：清的是此刻身上的状态；清爽窗口有时限，错过窗口对方可以再上一次；窗口只挡毒／灼／麻，睡与冻照旧。
 * 宝可梦层：共享默认效果会同步成原生异常，清掉再挂窗口后原生队伍面板同步干净；窗口是本单元的身份，
 *   不自动变成原生异常，宝可梦身上要不要再加一层由别的单元决定。
 * 持续表现：clear 光环不另行计时，绑在真正挂上的 clearheaded 载体上（见 refreshWindow）；载体刷新按最新
 *   revision 重建、到期或被驱散即收，所以画面和窗口同生共死，结束时玩家看得见保护消失。
 */
namespace PokemonSkills {
    /** 窗口内三类异常再想上身就在这里被弹开；效果只借身份，行为全部由本单元写。 */
    CombatStatus.gate.define({ id: "world_combat:move_refresh/ward", apply: function (context) {
        if (!context.allowed) return;
        if (refreshAfflictions.indexOf(context.name) < 0) return;
        if (!CombatStatus.has(context.world, context.actor, refreshStatus)) return;
        context.allowed = false; context.reason = "clearheaded";
        const body = context.world.observe(context.actor);
        if (body === null) return;
        WorldFeedback.emit(context.world, refreshScene, 1, body.position(),
            { moment: "ward", target: String(context.actor.ref()) }, 18);
        WorldFeedback.text(context.world, body.position().plus(WorldCombat.point(0, 0.9, 0)), refreshWardText, [], 20);
        context.world.sound("minecraft:entity.illusioner.cast_spell", body.position(), 12, "{}");
    } });

    // 清爽窗口的 owned 归属：一个真正属于本 source 的托管效果，只观察 clearheaded 载体的实例 key。
    // 它把 clear 持续表现挂在真实 carrier 上；载体刷新（added 带新 key）时旧窗口作废、按最新 revision 重建，
    // 载体被驱散或到期（removed 且当前无 carrier）时一并收掉，不留失效锚。
    const refreshWindow = "world_combat:move_refresh/window";
    WorldCombat.effect(refreshWindow, 1, 600, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        if (typeof value.key !== "string" || !value.key) throw new Error("Invalid refresh window anchor");
        return JSON.stringify({ key: value.key });
    }, EffectProtocols.unchanged);
    function refreshWindowPresent(effect: CombatEffect): void {
        const world = effect.world(), actor = effect.target(), anchor = JSON.parse(effect.state());
        const body = world.valid(actor) ? world.observe(actor) : null;
        if (body === null || !MobEffects.matches(world, actor, { id: refreshEffect, key: anchor.key })) { effect.end(); return; }
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_refresh/clear", refreshScene, 1, body.position(),
            { moment: "clear", target: String(actor.ref()) });
    }
    WorldCombat.effectHandler(refreshWindow, "start", refreshWindowPresent);
    WorldCombat.effectHandler(refreshWindow, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.on("world_combat:move_refresh/bind", "world_combat:mob_effect_added", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== refreshEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        world.effects(actor, refreshWindow).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        const carrier = MobEffects.read(world, actor, refreshEffect);
        if (carrier === null) return;
        const ticks = carrier.duration() < 0 ? 600 : Math.max(1, Math.min(600, carrier.duration()));
        world.effect(refreshWindow, actor, JSON.stringify({ key: String(carrier.key()) }), ticks);
    });
    WorldCombat.on("world_combat:move_refresh/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== refreshEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        if (MobEffects.read(world, actor, refreshEffect) !== null) return;
        world.effects(actor, refreshWindow).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    });

    define({
        id: refreshId,
        cooldownParameter: "recharge", name: "焕然一新",
        description: "站定净息，一次清除自己身上的中毒／剧毒、灼伤与麻痹，并留下一小段清爽窗口，窗口内新的中毒、灼伤与麻痹会被弹开；不解睡眠与冰冻，也不回复生命。",
        uses: ["烧着或中毒时把状态清掉，止住持续掉血", "在被麻痹锁住前挣脱，恢复正常行动", "净化后立刻用清爽窗口挡住紧接着的同类异常"],
        kind: "self", range: 0, prepare: 8, active: 0, recover: 6, cooldown: 110, style: "purify",
        stationary: true, maximumTicks: 400,
        defaults: { deep: false },
        fields: [flag("deep", "深息")],
        indicator: function () { return { radius: 1, style: "purify", label: "焕然一新" }; },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[refreshId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(refreshId, "tempo", context)),
                recover: Math.round(p(refreshId, "aftercast", context)),
                cooldown: Math.round(p(refreshId, "recharge", context)),
                active: 0, range: 0
            };
        },
        ready: function (action) {
            const world = action.sense(), self = action.actor();
            for (let index = 0; index < refreshAfflictions.length; index++)
                if (CombatStatus.has(world, self, refreshAfflictions[index])) return "";
            return "nothing-to-cleanse";
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_refresh:windup", refreshScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", target: String(action.actor().ref()) }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), self = action.actor(), body = world.observe(self);
            if (body === null) { done(action); return; }
            const ticks = Math.max(20, Math.round(p(refreshId, "clearTicks", action)));
            let cured = 0;
            for (let index = 0; index < refreshAfflictions.length; index++)
                if (CombatStatus.cure(world, self, refreshAfflictions[index])) cured++;
            // 只有真正挂上清爽窗口才算成立；挂不上就不播成功提示，clear 表现由窗口自带的托管效果拥有。
            const carrier = MobEffects.apply(world, self, refreshEffect, ticks, 0);
            if (carrier === null) { done(action); return; }
            const motes = Math.max(10, Math.round(p(refreshId, "motes", action)));
            const radius = Math.max(0.8, p(refreshId, "purgeRadius", action));
            sound(action, "minecraft:block.beacon.power_select");
            WorldFeedback.emit(world, refreshScene, 1, body.position(),
                { moment: "purge", target: String(self.ref()), cured: cured, motes: motes,
                    scale: Math.max(0.7, Math.min(2.2, radius / 1.4)),
                    intensity: Math.max(0.6, Math.min(1.8, 0.6 + cured * 0.4)) }, 30);
            if (cured > 0)
                WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 0.9, 0)), refreshPurgeText, [cured], 28);
            done(action);
        }
    });
}
