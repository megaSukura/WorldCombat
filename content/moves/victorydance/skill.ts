/**
 * 胜利之舞 / victorydance 的出手方式。
 *
 * 核心念头：一场唤来胜利的仪典。舞者立定行礼，然后一下一下把脚步踏进地面，每踏一步从脚下荡开一圈金环；
 * 踏到终拍，一顶桂冠在头顶升起，攻击、防御、速度一起抬高。它是这一族里最长、最贵、最隆重的一支，
 * 也是唯一「越打越持久」的舞：凯旋存续期间，舞者每命中一次，这份胜利就向上延续一段（有上限）。
 *
 * 三幕：
 *   起式（windup，提交前）：立定、举臂行礼，金光自脚下聚起；可被打断，打断不消耗任何东西。
 *   仪典（提交后）：按 beats 拍踏步，每拍从脚下荡开一圈金环；等级此时还没有落账。
 *   立冠（终拍）：桂冠在头顶升起、三项等级此刻才真正落到载体窗口上；凯旋存续期间每次命中都延长一次。
 *     窗口走完或被清除时，只收回这次舞实际贡献的那几级，别处的增减不受影响。
 *
 * 与同族分开：剑舞前压连斩、龙之舞螺旋上升、蝶舞原地扬鳞；胜利之舞是**踏步立冠**的仪典，抬三项、最贵、会延续。
 */
namespace PokemonSkills {
    const victorydanceScene = "world_combat:move_victorydance";
    const victorydanceCrown = "world_combat:victorydance_crown";
    const victorydanceContribution = "world_combat:move/victorydance";
    const victorydanceText = "world_combat.move.victorydance.text.crowned";
    const victorydanceRallyText = "world_combat.move.victorydance.text.rallied";
    const victorydanceFadeText = "world_combat.move.victorydance.text.faded";
    /** 表现里的参考半径：`data.scale = 实际冠冕半径 / 这个数`。 */
    const victorydanceCrownRadius = 1.2;
    const victorydanceStats = ["atk", "def", "spe"];

    define({
        id: "victorydance",
        cooldownParameter: "wait",
        name: "胜利之舞",
        description: "跳起一场唤来胜利的仪典：立定行礼、一步步把脚步踏进地面，终拍在头顶立起桂冠，提高自己的攻击、防御和速度。凯旋只维持一段可见的窗口，但存续期间每次命中都会把它向上延续；窗口走完，抬起的这三项会被收回。",
        uses: ["决出胜负前把攻防速一起立起来", "在对手残血时开一场仪典，靠命中把胜利延续下去", "用最隆重的舞把身位钉住、把气势摆出来"],
        kind: "self",
        range: 1,
        maxRange: 1,
        prepare: 10,
        active: 1,
        recover: 7,
        cooldown: 140,
        style: "crown",
        stationary: true,
        defaults: { grand: false, ai: { maxChase: 16, minGap: 3 } },
        fields: [flag("grand", "隆重")],
        indicator: function (config, pokemon) {
            return { radius: Math.max(1.3, p("victorydance", "crown", pokemon) + 0.6), geometry: "area", style: "crown", color: 0xFFD75A,
                label: config && config.grand ? "胜利之舞 · 隆重" : "胜利之舞" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["victorydance"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("victorydance", "tempo", context)),
                recover: Math.round(p("victorydance", "aftercast", context)),
                cooldown: Math.round(p("victorydance", "wait", context)),
                active: 1,
                range: 1
            };
        },
        windup: function (action, _config, prepare) {
            action.present("world_combat:move_victorydance:salute", victorydanceScene, 1, action.origin(),
                JSON.stringify({ moment: "salute" }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("victorydance", "gift", action))));
            const beats = Math.max(3, Math.min(6, Math.round(p("victorydance", "beats", action))));
            const pace = Math.max(4, Math.round(p("victorydance", "pace", action)));
            const crown = Math.max(0.7, p("victorydance", "crown", action));
            const span = Math.max(80, Math.round(p("victorydance", "span", action)));
            const laurels = Math.max(12, Math.round(p("victorydance", "laurels", action)));
            const scale = crown / victorydanceCrownRadius;
            const perStamp = Math.max(8, Math.round(laurels / beats));
            const litKey = "world_combat:move_victorydance/lit";
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            // 冠冕的持续表现挂在这次载体窗口上：窗口自然结束、刷新或被清除时一并收走。
            function bindLit(scope: CombatWorld, point: CombatPoint, windowId: number, radius: number): void {
                if (!windowId) return;
                WorldFeedback.onEffect(scope, windowId, litKey, victorydanceScene, 1, point,
                    { moment: "lit", actor: String(actor.ref()), crown: radius, scale: radius / victorydanceCrownRadius,
                        laurels: Math.max(8, Math.round(laurels / 3)) });
            }
            // 终拍：桂冠升起，三项等级此时才写入并绑在这层冠冕窗口上。
            function crownNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                const before = NativeEffects.effectiveStages(scope, actor);
                const previous = MobEffects.read(scope, actor, victorydanceCrown);
                const carrier = MobEffects.apply(scope, actor, victorydanceCrown, span, previous ? previous.amplifier() : 0);
                let windowId = 0, atk = 0, def = 0, spe = 0;
                if (carrier) {
                    windowId = NativeEffects.boostWindow(scope, actor, { atk: gift, def: gift, spe: gift },
                        carrier.duration(), victorydanceContribution, carrier, previous);
                    const raised = NativeEffects.effectiveStages(scope, actor);
                    atk = Math.max(0, (raised.atk || 0) - (before.atk || 0));
                    def = Math.max(0, (raised.def || 0) - (before.def || 0));
                    spe = Math.max(0, (raised.spe || 0) - (before.spe || 0));
                }
                if (!windowId) MobEffects.consume(scope, actor, victorydanceCrown);
                WorldFeedback.emit(scope, victorydanceScene, 1, here.position(),
                    { moment: "crown", crown: crown, scale: scale, laurels: laurels,
                        intensity: Math.max(0.8, Math.min(2.2, laurels / 30)) }, 36);
                if (windowId) bindLit(scope, here.position(), windowId, crown);
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.5, 0)), victorydanceText, [atk, def, spe], 32);
                scope.sound("minecraft:ui.toast.challenge_complete", here.position(), 20, "{}");
                finish(current);
            }
            // 踏步：每拍从脚下荡开一圈金环，尚不写入任何等级。
            function stampNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                current.stopMovement();
                WorldFeedback.emit(scope, victorydanceScene, 1, here.position(),
                    { moment: "stamp", scale: scale, beats: beats, index: index + 1, laurels: perStamp,
                        intensity: Math.max(0.6, Math.min(2, laurels / 30)) }, 22);
                scope.sound(index === 0 ? "minecraft:block.note_block.basedrum" : "minecraft:block.bell.use", here.position(), 14, "{}");
                index++;
                if (index >= beats) { current.after(pace, crownNow); return; }
                current.after(pace, stampNow);
            }
            stampNow(action);
        }
    });

    // 凯旋靠战果延续：存续期间舞者每命中一个非友方目标，载体与它身上的三项贡献一起延长，直到上限。
    WorldCombat.on("world_combat:move_victorydance/rally", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        const world = event.world(), actor = event.actor(), target = event.target();
        if (target === null || !world.valid(actor) || world.friendly(target)) return;
        const effect = MobEffects.read(world, actor, victorydanceCrown);
        if (effect === null) return;
        const remaining = effect.duration();
        const cap = Math.round(p("victorydance", "rallyCap")), gain = Math.round(p("victorydance", "rallyGain"));
        if (remaining >= cap) return;
        const next = Math.min(cap, remaining + gain);
        const refreshed = MobEffects.apply(world, actor, victorydanceCrown, next, effect.amplifier());
        if (refreshed === null) return;
        // 只把这一份来源的实际贡献迁到新载体上，不重新加级，也不动别处的能力变化。
        const windowId = NativeEffects.boostWindow(world, actor, {}, refreshed.duration(), victorydanceContribution, refreshed, effect);
        const body = world.observe(actor);
        if (body === null) return;
        const crown = Math.max(0.7, 0.9 + body.height() * 0.35);
        WorldFeedback.emit(world, victorydanceScene, 1, body.position(),
            { moment: "rally", actor: String(actor.ref()), crown: crown, scale: crown / victorydanceCrownRadius,
                laurels: 12, intensity: Math.max(0.7, Math.min(2, next / cap + 0.4)) }, 30);
        if (windowId) WorldFeedback.onEffect(world, windowId, "world_combat:move_victorydance/lit", victorydanceScene, 1, body.position(),
            { moment: "lit", actor: String(actor.ref()), crown: crown, scale: crown / victorydanceCrownRadius, laurels: 10 });
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), victorydanceRallyText, [Math.round(next / 20)], 28);
        world.sound("minecraft:block.bell.resonate", body.position(), 14, "{}");
    });

    // 凯旋窗口走完或被清除：三项等级由载体窗口自行按实际贡献收回，这里只收尾表现。
    WorldCombat.on("world_combat:move_victorydance/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== victorydanceCrown) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧载体被移除而新载体仍在：不是真的结束。
        if (MobEffects.read(world, actor, victorydanceCrown)) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, victorydanceScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), victorydanceFadeText, [], 28);
    });
}
