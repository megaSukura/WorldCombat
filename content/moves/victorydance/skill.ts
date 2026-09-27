/**
 * 胜利之舞 / victorydance 的出手方式。
 *
 * 核心念头：一场唤来胜利的仪典。舞者立定行礼，然后一下一下把脚步真实踏进地面（左右短踏或原地压点），
 * 每踏一步从实际踏点荡开一圈金环；踏到终拍，一顶桂冠在头顶以清晰的冠形线合拢，攻击、防御、速度一起抬高。
 * 它是这一族里最长、最贵、最隆重的一支，也是唯一「越打越持久」的舞：凯旋存续期间，舞者每以一次主动攻击
 * 命中一个敌人，这份胜利就向上延续一段；同一次攻击打中多个目标只算一次；起舞完成的那一刻记下一个绝对最迟
 * 结束刻（延续上限），到点必定落幕。持续伤害与间接结算不续。
 *
 * 三幕：
 *   起式（windup，提交前）：立定、举臂行礼，金光自脚下聚起；可被打断，打断不消耗任何东西。
 *   仪典（提交后）：按 beats 拍踏步，每拍在安全空间里真实左右短踏；空间不足便原地压点，绝不穿方块。
 *   立冠（终拍）：桂冠以冠形线在头顶合拢，三项等级此刻才真正落到载体窗口上；存续期间每次主动攻击命中都延长一次，
 *     但延长不超过起舞时记下的绝对最迟结束刻。窗口走完或被清除时，只收回这次舞实际贡献的那几级。
 *
 * 与同族分开：剑舞前压连斩、龙之舞螺旋上升、蝶舞原地扬鳞；胜利之舞是**踏步立冠**的仪典，抬三项、最贵、会延续。
 */
namespace PokemonSkills {
    const victorydanceScene = "world_combat:move_victorydance";
    const victorydanceCrownScene = "world_combat:move_victorydance_crown";
    const victorydanceCrown = "world_combat:victorydance_crown";
    const victorydanceClock = "world_combat:victorydance_clock";
    const victorydanceGate = "world_combat:victorydance_gate";
    const victorydanceContribution = "world_combat:move/victorydance";
    const victorydanceText = "world_combat.move.victorydance.text.crowned";
    const victorydanceRallyText = "world_combat.move.victorydance.text.rallied";
    const victorydanceFadeText = "world_combat.move.victorydance.text.faded";
    /** 表现里的参考半径：`data.scale = 实际冠冕半径 / 这个数`。 */
    const victorydanceCrownRadius = 1.2;
    /** 同一次主动攻击（按 originInstance）只续时一次；多目标/多段回执不叠加。 */
    const victorydanceRally: { [ref: string]: string } = Object.create(null);

    // 起舞完成时记下的绝对最迟结束刻：一个无行为的隐藏时钟。JSON 里存着绝对世界刻，是这份凯旋可恢复的终点；
    // 时钟缺失时不再补满预算。
    WorldCombat.effect(victorydanceClock, 1, 1200, "actor", function (json) {
        const value = JSON.parse(String(json || "{}"));
        const deadline = typeof value.deadline === "number" && isFinite(value.deadline) ? Math.round(value.deadline) : 0;
        return JSON.stringify({ deadline: deadline });
    }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(victorydanceClock, "start", function () { });
    WorldCombat.effectHandler(victorydanceClock, "operation:world_combat:dispel", function (effect) { effect.end(); });
    // 续冠反馈的节流闸：存在期间不再重复发大回执，多段伤害不刷铃屏。
    WorldCombat.effect(victorydanceGate, 1, 40, "actor", function (_json) { return "{}"; }, EffectProtocols.unchanged);
    WorldCombat.effectHandler(victorydanceGate, "start", function () { });
    WorldCombat.effectHandler(victorydanceGate, "operation:world_combat:dispel", function (effect) { effect.end(); });

    /** 距绝对最迟结束刻还有多久；没有可恢复终点（时钟缺失或已过）时返回 0，绝不重开预算。 */
    function victorydanceDeadline(world: CombatWorld, actor: CombatActor, cap: number): number {
        const clocks = world.effects(actor, victorydanceClock);
        if (!clocks.length) return 0;
        const stored = JSON.parse(String(clocks[0].data() || "{}"));
        const deadline = typeof stored.deadline === "number" && isFinite(stored.deadline) ? stored.deadline : 0;
        const remaining = deadline > 0 ? deadline - world.tick() : clocks[0].remaining();
        return Math.max(0, Math.min(cap, Math.round(remaining)));
    }
    function victorydanceClearClock(world: CombatWorld, actor: CombatActor): void {
        world.effects(actor, victorydanceClock).forEach(function (view) { world.operation(view.id(), "world_combat:dispel", "{}"); });
    }
    /** 目标真实脚底（碰撞箱底面的水平中心）。 */
    function victorydanceFeet(body: CombatObservation): CombatPoint {
        const min = body.boundsMin(), max = body.boundsMax();
        return WorldCombat.point((min.x() + max.x()) / 2, min.y(), (min.z() + max.z()) / 2);
    }

    define({
        id: "victorydance",
        cooldownParameter: "wait",
        name: "胜利之舞",
        description: "跳起一场唤来胜利的仪典：立定行礼、踉步一下一下真实踏进地面，终拍在头顶以冠形线合拢一顶桂冠，提高自己的攻击、防御和速度。凯旋只维持一段可见的窗口，但存续期间每次主动攻击命中都会把它向上延续（同一次攻击打中多个目标只算一次，持续伤害不续）；起舞完成时会记下绝对最迟结束刻，命中再密也到此落幕，抬起的三项随后被收回。",
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
            action.present(victorydanceScene + "/salute", victorydanceScene, 1, action.origin(),
                JSON.stringify({ moment: "salute", start: action.sense().tick(), duration: prepare }));
            return prepare;
        },
        execute: function (action, _move, _config, done) {
            const world = action.world(), actor = action.actor(), body = world.observe(actor);
            if (body === null) { done(action); return; }
            const gift = Math.max(1, Math.min(2, Math.round(p("victorydance", "gift", action))));
            const beats = Math.max(3, Math.min(6, Math.round(p("victorydance", "beats", action))));
            const pace = Math.max(4, Math.round(p("victorydance", "pace", action)));
            const stride = Math.max(0.15, p("victorydance", "stride", action));
            const crown = Math.max(0.7, p("victorydance", "crown", action));
            const span = Math.max(80, Math.round(p("victorydance", "span", action)));
            const laurels = Math.max(12, Math.round(p("victorydance", "laurels", action)));
            const scale = crown / victorydanceCrownRadius;
            const perStamp = Math.max(8, Math.round(laurels / beats));
            const prongs = Math.max(4, Math.min(8, Math.round(laurels / 8)));
            const litKey = "world_combat:move_victorydance/lit";
            let index = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }
            // 冠冕的持续表现挂在这次载体窗口上：窗口自然结束、刷新或被清除时一并收走。
            function bindLit(scope: CombatWorld, point: CombatPoint, windowId: number, radius: number): void {
                if (!windowId) return;
                WorldFeedback.onEffect(scope, windowId, litKey, victorydanceCrownScene, 1, point,
                    { moment: "lit", actor: String(actor.ref()), crown: radius, scale: radius / victorydanceCrownRadius,
                        laurels: Math.max(8, Math.round(laurels / 3)), prongs: prongs });
            }
            // 终拍：桂冠升起，三项等级此刻才写入并绑在这层冠冕窗口上，同时记下绝对最迟结束刻。
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
                if (windowId && carrier) {
                    victorydanceClearClock(scope, actor);
                    const capTicks = Math.round(p("victorydance", "rallyCap", current));
                    // 把绝对终点写进时钟数据；即使时钟被提前移除，缺记录时不重开预算（deadline 读到 0）。
                    const clocked = scope.effect(victorydanceClock, actor, JSON.stringify({ deadline: scope.tick() + capTicks }), capTicks);
                    if (!clocked) victorydanceClearClock(scope, actor);
                    WorldFeedback.emit(scope, victorydanceCrownScene, 1, here.position(),
                        { moment: "crown", actor: String(actor.ref()), start: scope.tick(), duration: 26, crown: crown, scale: scale,
                            laurels: laurels, prongs: prongs }, 36);
                    bindLit(scope, here.position(), windowId, crown);
                }
                WorldFeedback.text(scope, here.position().plus(WorldCombat.point(0, 1.5, 0)), victorydanceText, [atk, def, spe], 32);
                scope.sound("minecraft:ui.toast.challenge_complete", here.position(), 20, "{}");
                finish(current);
            }
            // 踏步：在安全空间里真实左右短踏（空间不足则原地压点），每拍从实际踏点荡开一圈金环，尚不写入等级。
            function stampNow(current: CombatAction): void {
                const scope = current.world(), here = scope.observe(actor);
                if (here === null) { finish(current); return; }
                current.stopMovement();
                let point = victorydanceFeet(here), moved = false;
                const facing = WorldGeometry.facing(scope, actor);
                const frame = WorldGeometry.basis(facing || WorldCombat.point(0, 0, 1));
                const side = frame.right.scale(index % 2 === 0 ? stride : -stride);
                const target = point.plus(side);
                if (LivingActions.hasFreeSpace(scope) && LivingActions.freeSpace(scope, target, here.width() + 0.1, here.height() + 0.1)) {
                    if (scope.displace(actor, side) > 0) {
                        const after = scope.observe(actor);
                        if (after !== null) { point = victorydanceFeet(after); moved = true; }
                    }
                }
                WorldFeedback.emit(scope, victorydanceScene, 1, point,
                    { moment: "stamp", scale: scale, beats: beats, index: index + 1, laurels: perStamp, moved: moved ? 1 : 0,
                        origin: [point.x(), point.y(), point.z()], intensity: Math.max(0.6, Math.min(2, laurels / 30)) }, 22);
                scope.sound(index === 0 ? "minecraft:block.note_block.basedrum" : "minecraft:block.bell.use", point, 14, "{}");
                index++;
                if (index >= beats) { current.after(pace, crownNow); return; }
                current.after(pace, stampNow);
            }
            stampNow(action);
        }
    });

    // 凯旋靠战果延续：存续期间舞者每以一次主动攻击命中一个非友方目标，载体与三项贡献一起延长一次，
    // 但不越过起舞时记下的绝对上限；持续伤害/间接结算不续，同一次攻击的多目标回执按 originInstance 去重。
    WorldCombat.on("world_combat:move_victorydance/rally", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0) || !DamageSemantics.directOffense(data)) return;
        const world = event.world(), actor = event.actor(), target = event.target();
        if (target === null || !world.valid(actor) || world.friendly(target)) return;
        const effect = MobEffects.read(world, actor, victorydanceCrown);
        if (effect === null) return;
        const ref = String(actor.ref()), origin = String(data.originInstance || "");
        if (origin && victorydanceRally[ref] === origin) return;
        if (origin) victorydanceRally[ref] = origin;
        const cap = Math.round(p("victorydance", "rallyCap")), gain = Math.round(p("victorydance", "rallyGain"));
        const bound = victorydanceDeadline(world, actor, cap);
        const remaining = effect.duration();
        if (remaining >= bound) return;
        const next = Math.min(bound, remaining + gain);
        const refreshed = MobEffects.apply(world, actor, victorydanceCrown, next, effect.amplifier());
        if (refreshed === null) return;
        // 只把这一份来源的实际贡献迁到新载体上，不重新加级，也不动别处的能力变化。
        const windowId = NativeEffects.boostWindow(world, actor, {}, refreshed.duration(), victorydanceContribution, refreshed, effect);
        const body = world.observe(actor);
        if (body === null) return;
        const crown = Math.max(0.7, 0.9 + body.height() * 0.35);
        const prongs = Math.max(4, Math.min(8, Math.round(crown * 5)));
        const lit = Math.max(8, Math.round(9 + body.height() * 2));
        // 冠形持续表现必须跟着最新一次窗口，否则刷新后旧窗口释放会留下失效锚。
        if (windowId) WorldFeedback.onEffect(world, windowId, "world_combat:move_victorydance/lit", victorydanceCrownScene, 1, body.position(),
            { moment: "lit", actor: String(actor.ref()), crown: crown, scale: crown / victorydanceCrownRadius, laurels: lit, prongs: prongs });
        // 反馈节流：同一时间只留一次铃与文字，多段伤害不刷屏；续时本身按 originInstance 对每次攻击各记一次。
        if (world.effects(actor, victorydanceGate).length === 0) {
            world.effect(victorydanceGate, actor, "{}", 20);
            WorldFeedback.emit(world, victorydanceScene, 1, body.position(),
                { moment: "rally", actor: String(actor.ref()), crown: crown, scale: crown / victorydanceCrownRadius,
                    laurels: 12, intensity: Math.max(0.7, Math.min(2, next / cap + 0.4)) }, 30);
            WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), victorydanceRallyText, [Math.round(next / 20)], 28);
            world.sound("minecraft:block.bell.resonate", body.position(), 14, "{}");
        }
    });

    // 凯旋窗口走完或被清除：三项等级由载体窗口自行按实际贡献收回，这里收尾表现并撤掉时钟。
    WorldCombat.on("world_combat:move_victorydance/fade", "world_combat:mob_effect_removed", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== victorydanceCrown) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor)) return;
        // 刷新／替换时旧载体被移除而新载体仍在：不是真的结束。
        if (MobEffects.read(world, actor, victorydanceCrown)) return;
        victorydanceClearClock(world, actor);
        delete victorydanceRally[String(actor.ref())];
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.emit(world, victorydanceScene, 1, body.position(), { moment: "fade", actor: String(actor.ref()) }, 30);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.5, 0)), victorydanceFadeText, [], 28);
    });
}
