/**
 * 铁壁 / irondefense — 执行组织。
 *
 * 核心念头：一层铁水从脚下浇上来，沿着身体凝成一座铁像——硬，也沉。撼不动它，它也挪不开。
 *
 * 两幕：
 *   浇（windup 播「浇铸」，提交前只观察与预告，打断不花代价）。
 *   凝（提交后）：NativeEffects.boostWindow 把两级防御挂到共享身份 world_combat:status/irondefense
 *     的「铁壳」窗口上，窗口归属这层铁壳载体——铁壳本身带击退抗性与沉重减速（见 startup.ts）。
 *     紧贴身体的金属片由一条托管效果随铁壳状态同寿渲染；受击时敲出铁火花。
 * 结束：铁壳被撕掉、被清除或到期时，这段防护抬起的等级随窗口原样收回，只收本次实际贡献；
 *   重复施放按同一载体的叠加约定刷新，不会扣走别处抬起的等级。
 */
namespace PokemonSkills {
    const ironDefenseScene = "world_combat:move_irondefense";
    const ironDefenseShell = "world_combat:iron_defense_shell";
    const ironDefenseShellMark = "world_combat:move_irondefense/shell_mark";
    const ironDefenseContribution = "world_combat:move/irondefense";
    const ironDefenseCladText = "world_combat.move.irondefense.text.clad";
    const ironDefenseShedText = "world_combat.move.irondefense.text.shed";
    /** 表现里的参考半径：`data.scale = 实际铁环半径 / 这个数`，让浇铸与判定同径。 */
    const ironDefenseReferenceRadius = 1.2;

    /**
     * 铁壳寄存表现：把「紧贴身体的金属片」绑在真实铁壳状态的生命周期上——状态自然到期、
     * 被牛奶／驱散提前拿掉，这条托管效果随之结束，表现一起收，不靠自己的计时。
     */
    function ironDefenseWatch(effect: CombatEffect): void {
        const world = effect.world(), target = effect.target();
        const body = world.valid(target) ? world.observe(target) : null;
        if (body === null) { effect.end(); return; }
        const carrier = MobEffects.read(world, target, ironDefenseShell);
        if (carrier === null) { effect.end(); return; }
        const state = JSON.parse(effect.state());
        WorldFeedback.onEffect(world, effect.id(), "world_combat:move_irondefense/shell", ironDefenseScene, 1, body.position(),
            { moment: "hold", actor: String(target.ref()), levels: state.levels, plates: state.plates,
                filings: state.filings, scale: state.scale });
        const remaining = carrier.duration() < 0 ? 2400 : Math.max(1, Math.min(2400, carrier.duration()));
        effect.remaining(remaining);
        effect.schedule("watch", "watch", 10, "{}");
    }
    WorldCombat.effect(ironDefenseShellMark, 1, 2400, "actor", function (json) {
        const value = JSON.parse(json || "{}");
        [value.levels, value.plates, value.filings, value.scale].forEach(function (n) {
            if (typeof n !== "number" || !isFinite(n)) throw new Error("Invalid iron defense shell mark");
        });
        return JSON.stringify(value);
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(ironDefenseShellMark, "start", ironDefenseWatch);
    WorldCombat.effectHandler(ironDefenseShellMark, "watch", ironDefenseWatch);
    WorldCombat.effectHandler(ironDefenseShellMark, "operation:world_combat:dispel", function (effect) { effect.end(); });

    define({
        id: "irondefense",
        cooldownParameter: "wait",
        name: "铁壁",
        description: "大幅提高防御和抗击退能力，但移动变慢。效果结束后收回本次防御提升。",
        uses: ["在被近身围攻前先把身体淬成铁", "顶着击退站住位置，不让对手把你推开", "用可见的铁壳窗口逼对手先花时间磨它"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 120,
        style: "iron",
        stationary: true,
        defaults: { ai: { maxChase: 12, panic: 0.55 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("irondefense", "clad", pokemon), geometry: "area", style: "iron", color: 0x8C9AA6,
                label: "铁壁" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["irondefense"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("irondefense", "tempo", context)),
                recover: Math.round(p("irondefense", "aftercast", context)),
                cooldown: Math.round(p("irondefense", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_irondefense:pour", ironDefenseScene, 1, action.origin(),
                JSON.stringify({ moment: "pour" }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("irondefense", "gift", action))));
            const shell = Math.max(120, Math.round(p("irondefense", "shell", action)));
            const clad = Math.max(0.7, p("irondefense", "clad", action));
            const filings = Math.max(16, Math.round(p("irondefense", "filings", action)));
            const plates = Math.max(4, Math.min(12, Math.round(filings / 8)));
            const scale = clad / ironDefenseReferenceRadius;
            // 防御等级走 boostWindow，窗口归属这层铁壳载体：到期／被清除只收回本次实际贡献；
            // 重复施放按 previous 刷新同一窗口，既不会叠加，也不会扣走别处抬起的等级。
            const before = NativeEffects.effectiveStage(world, actor, "def");
            const previous = MobEffects.read(world, actor, ironDefenseShell);
            const carrier = MobEffects.apply(world, actor, ironDefenseShell, shell, previous ? previous.amplifier() : 0);
            let levels = 0;
            if (carrier) {
                NativeEffects.boostWindow(world, actor, { def: gift }, carrier.duration(), ironDefenseContribution, carrier, previous);
                levels = Math.max(0, NativeEffects.effectiveStage(world, actor, "def") - before);
                // 载体等级同时驱动铁壳的固定属性（击退抗性/减速按 amplifier+1 缩放），刷新到本次实际级数。
                if (carrier.amplifier() !== levels) {
                    const shown = MobEffects.apply(world, actor, ironDefenseShell, shell, levels);
                    if (shown) NativeEffects.boostWindow(world, actor, {}, shown.duration(), ironDefenseContribution, shown, carrier);
                }
            }
            // 紧贴身体的金属片：托管效果随铁壳状态同寿，刷新即重挂。
            world.effects(actor, ironDefenseShellMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
            world.effect(ironDefenseShellMark, actor, JSON.stringify({ levels: levels, plates: plates, filings: filings, scale: scale }),
                Math.max(1, Math.min(2400, shell)));
            const feet = body.position().plus(WorldCombat.point(0, -body.height() / 2, 0));
            WorldFeedback.emit(world, ironDefenseScene, 1, feet,
                { moment: "clad", actor: String(actor.ref()), levels: levels, clad: clad, filings: filings, plates: plates,
                    scale: scale, intensity: Math.max(0.8, Math.min(2, levels / 2 + filings / 48)) }, 34);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), ironDefenseCladText,
                [levels, Math.round(shell / 20)], 32);
            world.sound("minecraft:block.anvil.land", body.position(), 16, "{}");
            done(action);
        }
    });

    // 铁壳被撕掉、被清除或到期：等级随载体窗口自行收回（无需手动倒扣），这里只播碎壳与结束金属片。
    WorldCombat.on("world_combat:move_irondefense/shed", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== ironDefenseShell) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧应用被移除而新应用仍在：不是真的结束，不撒碎壳。
        if (MobEffects.read(world, actor, ironDefenseShell)) return;
        world.effects(actor, ironDefenseShellMark).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, ironDefenseScene, 1, body.position(), { moment: "shed", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), ironDefenseShedText, [], 24);
    });

    // 受击敲铁：铁壳在身时，每次真实伤害在落点敲出一簇铁火花与金属冲击。
    WorldCombat.on("world_combat:move_irondefense/struck", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), target = event.target();
        if (target === null || !world.valid(target)) return;
        if (MobEffects.read(world, target, ironDefenseShell) === null) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        const body = world.observe(target);
        if (body === null) return;
        let point = body.position();
        if (typeof data.x === "number" && typeof data.y === "number" && typeof data.z === "number")
            point = WorldCombat.point(data.x, data.y, data.z);
        const sparks = Math.max(6, Math.min(40, Math.round(data.actual / Math.max(1, body.maxHealth()) * 60) + 6));
        WorldFeedback.emit(world, ironDefenseScene, 1, point,
            { moment: "struck", actor: String(target.ref()), sparks: sparks, scale: 1 }, 18);
    });
}
