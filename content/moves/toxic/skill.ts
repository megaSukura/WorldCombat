/**
 * 剧毒 / toxic 的出手方式。
 *
 * 念头的形状：吐出一团浓缩毒液（windup → travel），扎进目标的一刻把共享的剧毒身份挂上去（root），
 * 之后毒在体内越钻越深——每隔 `escalateInterval` 把毒性加深一级，共享的毒伤随之跳得更密（escalate）；
 * 加到最后一级时毒素总爆发，按目标最大生命狠狠咬下一口并结束（burst）。被牛奶或别的招式清掉就提前枯萎。
 * 三幕：travel → root → escalate* → burst。身份是共享的 `world_combat:status/toxic`（毒 + amplifier≥1），
 * 宝可梦那一层由共享默认效果同步成原生剧毒，不需要本单元另写。
 *
 * 毒性的加深与爆发由持久效果 `world_combat:toxic_venom` 承担（源是施法者、目标是受害者），
 * 时间走完与被人为清除通向同一幕收尾。
 */
namespace PokemonSkills {
    const toxicScene = "world_combat:move_toxic";
    const ToxicVenom = "world_combat:toxic_venom";
    const toxicRootText = "world_combat.move.toxic.text.root";
    const toxicEscalateText = "world_combat.move.toxic.text.escalate";
    const toxicBurstText = "world_combat.move.toxic.text.burst";
    const toxicFizzleText = "world_combat.move.toxic.text.fizzle";

    function toxicVenomData(json: string): string {
        var value = JSON.parse(json);
        ["interval", "cap", "burst", "amp", "left"].forEach(function (key) {
            if (typeof value[key] !== "number" || !isFinite(value[key])) throw new Error("Invalid toxic venom");
        });
        return JSON.stringify(value);
    }

    /** 毒素消失或宿主离场时统一枯萎：清掉共享毒性并播放收尾。 */
    function toxicVenomWither(effect: CombatEffect): void {
        var world = effect.world(), victim = effect.target();
        if (!world.valid(victim)) return;
        CombatStatus.cure(world, victim, "toxic");
        var body = world.observe(victim);
        if (body !== null) WorldFeedback.emit(world, toxicScene, 1, body.position(), { moment: "wither", target: String(victim.ref()) }, 22);
    }

    WorldCombat.effect(ToxicVenom, 1, 1200, "actor", toxicVenomData, EffectProtocols.unchanged);
    WorldCombat.effectHandler(ToxicVenom, "start", function (effect) {
        var data = JSON.parse(effect.state());
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(ToxicVenom, "pulse", function (effect) {
        var world = effect.world(), victim = effect.target(), data = JSON.parse(effect.state());
        if (!world.valid(victim) || !CombatStatus.has(world, victim, "toxic")) { effect.end(); return; }
        var body = world.observe(victim);
        if (body === null) { effect.end(); return; }
        data.left = (data.left || 0) - 1;
        var ref = String(victim.ref());
        if (data.left <= 0) {
            // 终幕：毒素总爆发，按最大生命扣一口（可以击杀），随后毒素清空。
            var amount = body.maxHealth() * data.burst;
            if (amount > 0) world.health(victim, -amount, "world_combat:toxic");
            if (world.valid(victim)) {
                var after = world.observe(victim);
                if (after !== null) {
                    var intensity = Math.max(0.6, Math.min(2.6, data.burst * 12));
                    WorldFeedback.emit(world, toxicScene, 1, after.position(), { moment: "burst", target: ref,
                        count: Math.round(24 + intensity * 26), size: 0.28 + intensity * 0.12, speed: 0.18 + intensity * 0.12 }, 32);
                    WorldFeedback.text(world, after.position(), toxicBurstText, [Math.round(amount * 10) / 10], 30);
                }
                CombatStatus.cure(world, victim, "toxic");
            }
            world.sound("cobblemon:move.sludgebomb.target", body.position(), 16, "{}");
            effect.end();
            return;
        }
        data.amp = Math.min(data.cap, (data.amp || 1) + 1);
        var remaining = effect.remaining();
        if (!CombatStatus.inflict(world, victim, "toxic", remaining > 0 ? remaining : data.interval, data.amp)) { effect.end(); return; }
        WorldFeedback.emit(world, toxicScene, 1, body.position(), { moment: "escalate", target: ref, amp: data.amp,
            count: 10 + data.amp * 9, size: 0.07 + data.amp * 0.02, speed: 0.1 + data.amp * 0.04 }, 24);
        WorldFeedback.text(world, body.position(), toxicEscalateText, [data.amp], 24);
        effect.state(JSON.stringify(data));
        effect.schedule("pulse", "pulse", Math.max(1, Math.round(data.interval)), "{}");
    });
    WorldCombat.effectHandler(ToxicVenom, "operation:world_combat:dispel", function (effect) { effect.end(); });
    WorldCombat.effectHandler(ToxicVenom, "end", function (effect) { toxicVenomWither(effect); });
    // 外力提前清掉毒性（牛奶、/effect clear、别的招式）时，毒素随之枯萎。
    WorldCombat.on("world_combat:toxic/release", "world_combat:mob_effect_removed", "", function (event) {
        var data = JSON.parse(String(event.data()));
        if (String(data.id) !== "minecraft:poison") return;
        var world = event.world(), victim = event.actor();
        if (!world.valid(victim) || CombatStatus.has(world, victim, "toxic")) return;
        var bonds = world.effects(victim, ToxicVenom);
        for (var i = 0; i < bonds.length; i++) world.operation(bonds[i].id(), "world_combat:dispel", "{}");
    });

    define({
        id: "toxic",
        name: "Toxic",
        description: "A move that leaves the target badly poisoned. Its poison damage worsens every turn.",
        uses: ["开局给难缠的目标下毒", "把一场硬仗拖成消耗战", "逼对手先来清状态或后撤"],
        kind: "enemy",
        range: 10,
        maxRange: 16,
        prepare: 8,
        active: 40,
        recover: 8,
        cooldown: 50,
        style: "venom",
        defaults: { virulent: false, ai: { maxChase: 12, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            var context: NumberContext = { pokemon: pokemon, skill: skills["toxic"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            return {
                prepare: p("toxic", "prepare", context),
                recover: p("toxic", "recover", context),
                cooldown: p("toxic", "cooldown", context),
                range: p("toxic", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_toxic:windup", toxicScene, 1, action.origin(), JSON.stringify({ moment: "windup" }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = p("toxic", "venomSpeed", action);
            const radius = p("toxic", "venomRadius", action);
            const venomTicks = p("toxic", "venomTicks", action);
            const interval = Math.max(1, Math.round(p("toxic", "escalateInterval", action)));
            const cap = Math.max(1, Math.round(p("toxic", "ampCap", action)));
            const burst = p("toxic", "burstShare", action);
            sound(action, "cobblemon:move.sludgebomb.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius,
                appearance: { sprite: "cobblemon:particle/moves/sludgebomb" },
                impact: function (current, hit) {
                    const body = current.world();
                    const target = hit.target();
                    if (target === null || !body.valid(target)) {
                        WorldFeedback.emit(body, toxicScene, 1, hit.position(), { moment: "fizzle" }, 18);
                        WorldFeedback.text(body, hit.position(), toxicFizzleText, [], 24);
                        sound(current, "minecraft:entity.generic.splash");
                        return;
                    }
                    if (!CombatStatus.inflict(body, target, "toxic", venomTicks, 1)) {
                        WorldFeedback.emit(body, toxicScene, 1, hit.position(), { moment: "immune", target: String(target.ref()) }, 22);
                        return;
                    }
                    const pulses = Math.max(1, Math.floor(venomTicks / interval));
                    body.effect(ToxicVenom, target, JSON.stringify({ interval: interval, cap: cap, burst: burst, amp: 1, left: pulses }), venomTicks);
                    const ref = String(target.ref());
                    WorldFeedback.emit(body, toxicScene, 1, hit.position(), { moment: "root", target: ref }, 26);
                    WorldFeedback.text(body, hit.position(), toxicRootText, [], 30);
                    sound(current, "cobblemon:move.sludgebomb.target");
                }
            }, done);
            WorldFeedback.emit(world, toxicScene, 1, action.origin(), { moment: "travel", projectile: flight, target: action.target() ? String(action.target()!.ref()) : "" }, 60);
        }
    });
}
