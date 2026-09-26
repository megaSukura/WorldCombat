/**
 * 盘蜷 / coil 的出手方式。
 *
 * 核心念头：把身体一圈圈盘紧，能量环从外向里收拢；收到底后猛地一撑，攻击、防御与命中率一起抬起来。
 *   它是本族里最慢、也最完整的一支：窗口最长，把身位钉住，也把命中率一并拉正。
 *
 * 三幕：
 *   起势（windup，提交前）：压低重心、把身体盘起来，紫气从脚边聚拢；可被打断，打断不消耗任何东西。
 *   盘紧（提交后）：先只播盘绕与收紧，不立即给等级——三项实际提升留到盘定一撑的那一瞬才写入。
 *   撑定（收势）：盘到底后猛地一撑，攻击、防御与命中能力等级一起抬起（原生各 +1，配置「盘紧」防御 +2），
 *     挂上共享身份 world_combat:status/coil 的盘势窗口。等级由 boostWindow 拥有并绑在这层盘势载体上：
 *     窗口到期、被清除或再次刷新时只会撤去本招实际贡献；盘定前被终止则什么也不偷得。
 *
 * 与同族分开：磨爪是快而廉价的随手一蹭（只抬攻与命中）；盘蜷是慢而完整的架势——抬三项、窗口最长、起手最慢。
 */
namespace PokemonSkills {
    const coilScene = "world_combat:move_coil";
    const coilBrace = "world_combat:coil_brace";
    const coilContribution = "world_combat:move/coil";
    const coilText = "world_combat.move.coil.text.braced";
    const coilFadeText = "world_combat.move.coil.text.faded";
    /** 表现里的参考半径：`data.scale = 实际盘绕半径 / 这个数`。 */
    const coilReference = 1.0;

    define({
        id: "coil",
        cooldownParameter: "wait",
        name: "盘蜷",
        description: "把身体一圈圈盘紧、集中精神，然后猛地一撑，把攻击、防御与命中率一起抬高。它是这一族里最慢也最完整的一支，盘势维持一段最长的可见窗口；窗口走完或被清除时，这次抬起的等级按实际提高的级数收回。",
        uses: ["开打前盘一圈，把攻/防/命中一起垫起来", "硬顶一轮物理爆发前把三项钉住", "把被削掉的命中等级重新盘正"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 9,
        active: 1,
        recover: 6,
        cooldown: 95,
        style: "coil",
        stationary: true,
        defaults: { tight: false, ai: { maxChase: 16, minGap: 4 } },
        fields: [flag("tight", "盘紧")],
        indicator: function (config, pokemon) {
            return { radius: p("coil", "ring", pokemon), geometry: "area", style: "coil", color: 0x8A6FD8,
                label: config && config.tight === true ? "盘蜷 · 盘紧" : "盘蜷 · 松盘" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["coil"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("coil", "tempo", context)),
                recover: Math.round(p("coil", "aftercast", context)),
                cooldown: Math.round(p("coil", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_coil:draw", coilScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", tight: config && config.tight === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const rise = Math.max(1, Math.min(2, Math.round(p("coil", "rise", action))));
            const guard = Math.max(1, Math.min(2, Math.round(p("coil", "guard", action))));
            const focus = Math.max(1, Math.min(2, Math.round(p("coil", "focus", action))));
            const window = Math.max(120, Math.round(p("coil", "brace", action)));
            const coils = Math.max(8, Math.round(p("coil", "coils", action)));
            const ring = Math.max(0.6, p("coil", "ring", action));
            const scale = ring / coilReference;
            const beat = Math.max(4, Math.min(12, Math.round(14 - coils / 4)));
            let settled = false, humBound = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            // 盘定一撑：攻击、防御、命中此刻才真正写入载体窗口，盘定前被打断则什么也不给。
            function settle(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                const before = NativeEffects.effectiveStages(scope, actor);
                // 盘势载体拥有这三项贡献：刷新先按 previous 结束同招旧窗口，只续上本招自己那一份。
                const previous = MobEffects.read(scope, actor, coilBrace);
                const carrier = MobEffects.apply(scope, actor, coilBrace, window, previous ? previous.amplifier() : 0);
                let windowId = 0, gainedRise = 0, gainedGuard = 0, gainedFocus = 0;
                if (carrier) {
                    windowId = NativeEffects.boostWindow(scope, actor, { atk: rise, def: guard, accuracy: focus },
                        carrier.duration(), coilContribution, carrier, previous);
                    const raised = NativeEffects.effectiveStages(scope, actor);
                    gainedRise = Math.max(0, (raised.atk || 0) - (before.atk || 0));
                    gainedGuard = Math.max(0, (raised.def || 0) - (before.def || 0));
                    gainedFocus = Math.max(0, (raised.accuracy || 0) - (before.accuracy || 0));
                }
                const gain = gainedRise + gainedGuard + gainedFocus;
                if (!windowId) MobEffects.consume(scope, actor, coilBrace);
                WorldFeedback.emit(scope, coilScene, 1, here.position(),
                    { moment: "rise", actor: String(actor.ref()), coils: coils, ring: ring, scale: scale,
                        rise: gainedRise, guard: gainedGuard, focus: gainedFocus, gain: gain,
                        intensity: Math.max(0.8, Math.min(2, gain / 2 + coils / 24)) }, 32);
                if (windowId && !humBound) {
                    humBound = true;
                    // 盘势螺纹绑在真正的盘势窗口上，结束或被清除会同步收回。
                    WorldFeedback.onEffect(scope, windowId, "world_combat:move_coil/hold", coilScene, 1, here.position(),
                        { moment: "hum", actor: String(actor.ref()), coils: Math.max(6, Math.round(coils / 3)), ring: ring, scale: scale });
                }
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.4, 0)), coilText,
                    [gainedRise, gainedGuard, gainedFocus], 32);
                scope.sound("minecraft:block.beacon.power_select", here.position(), 16, "{}");
                finish(current);
            }
            // 盘绕阶段：从脚边向身体一圈圈收紧的低螺旋，此刻还没有任何等级。
            WorldFeedback.emit(world, coilScene, 1, body.position(),
                { moment: "coil", actor: String(actor.ref()), coils: coils, ring: ring, scale: scale,
                    intensity: Math.max(0.7, Math.min(1.8, coils / 18)) }, 26);
            world.sound("cobblemon:move.minimize.actor", body.position(), 16, "{}");
            action.after(beat, settle);
        }
    });

    // 盘势窗口走完或被清除：等级由载体窗口自行收回，这里只收尾表现。
    WorldCombat.on("world_combat:move_coil/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== coilBrace) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧载体被移除而新载体仍在：不是真的结束。
        if (MobEffects.read(world, actor, coilBrace)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, coilScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 24);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.4, 0)), coilFadeText, [], 24);
    });
}
