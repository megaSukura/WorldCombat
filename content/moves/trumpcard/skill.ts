/**
 * 王牌 / trumpcard 的出手方式。
 *
 * 念头的形状：起手把这张牌亮出来，牌面随这叠牌用掉多少而由暗转亮，并数出手中还剩几张（windup，提交前只播预告）→
 * 把牌掷向点/方向或选定的敌人（throw）→ 牌一路飞行，选中敌人且开启必中式的牌自己拐弯追人（flight）→
 * 在目标身上炸开（strike / fade）或在原生方块格上碎开（break）。
 * 读数就是这招自己的 PP：每用一次牌更旧一分，这一掷更重；末牌完整大印一次，但不宣称是全场最重。
 *
 * 选取：`kind: "aim"`——点/方向可空投；只有选中敌人且开启必中时才有限追踪，撞墙则碎牌。不要求提交时存在敌人。
 *
 * 两幕半：draw（亮牌）→ throw / flight（飞行）→ strike / fade / break（炸开、落空或碎牌）。提交后才触碰世界。
 */
namespace PokemonSkills {
    const trumpcardScene = "world_combat:move_trumpcard";
    const trumpcardStrikeText = "world_combat.move.trumpcard.text.strike";
    const trumpcardFadeText = "world_combat.move.trumpcard.text.fade";
    const trumpcardBreakText = "world_combat.move.trumpcard.text.break";
    const trumpcardTierKey = "world_combat:trumpcard/tier";

    /** 这一掷的实际档位：用掉这一张之后还剩几张、对应的消耗比例、以及是不是末牌。 */
    function trumpcardTier(action: CombatAction): { remaining: number; deck: number; spent: number; last: number } {
        const deck = Math.max(1, Math.round(p("trumpcard", "maxCards", action)));
        const remaining = Math.max(0, Math.min(deck, Math.round(p("trumpcard", "ppRemaining", action))));
        return { remaining: remaining, deck: deck, spent: Math.max(0, Math.min(1, 1 - remaining / deck)), last: remaining <= 0 ? 1 : 0 };
    }
    /** windup 在提交前取一次牌档并存进动作数据；execute 沿用同一份，画面与结算一致，补 PP 后也不会沿用旧档。 */
    function trumpcardSnapshot(action: CombatAction): any {
        const stored = action.data(trumpcardTierKey);
        return stored === null ? trumpcardTier(action) : JSON.parse(stored);
    }

    define({
        id: "trumpcard",
        name: "Trump Card",
        description: "最后一张牌最重：把一张牌掷向目标，牌在它身上炸开。这招自己的剩余 PP 越少，这一掷越重，末牌完整大印一次；它是本组唯一的远程招，只有它把「自己的资源余量」当威力表。",
        uses: ["把用剩的牌当重击掷出去", "最后一张牌做决胜一击", "从远处点名一个目标"],
        kind: "aim",
        range: 12,
        maxRange: 18,
        prepare: 7,
        active: 20,
        recover: 7,
        cooldown: 22,
        style: "card",
        defaults: { sure: false, ai: { maxChase: 16, ace: 1, hold: false, finish: false, leaveStation: false } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("trumpcard", "collisionRadius", pokemon), geometry: "line", style: "card", color: 0xF0D060, label: "王牌" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills["trumpcard"], detail: { values: config }, world: world, actor: actor, attributes: attributes };
            const sure = !!(config && config.sure);
            return {
                prepare: p("trumpcard", "prepare", context) + (sure ? 2 : 0),
                recover: p("trumpcard", "recover", context),
                cooldown: p("trumpcard", "cooldown", context) + (sure ? 4 : 0),
                range: p("trumpcard", "flightRange", context) + 0.6
            };
        },
        windup: function (action, config, prepare) {
            const sure = !!(config && config.sure);
            const tier = trumpcardTier(action);
            action.data(trumpcardTierKey, JSON.stringify(tier));
            action.present("world_combat:move_trumpcard:draw", trumpcardScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", windup: prepare, spent: tier.spent, remaining: tier.remaining, deck: tier.deck,
                    last: tier.last, sure: sure, sparkles: Math.max(6, Math.round(8 + tier.spent * 20)) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const self = action.actor();
            const foe = action.target();
            const sure = !!(config && config.sure);
            const power = p("trumpcard", "power", action);
            const speed = p("trumpcard", "flightSpeed", action);
            const range = p("trumpcard", "flightRange", action);
            const turn = p("trumpcard", "turn", action);
            const radius = p("trumpcard", "collisionRadius", action);
            const push = p("trumpcard", "push", action);
            const tier = trumpcardSnapshot(action);
            const spent = tier.spent, remaining = tier.remaining, last = tier.last;
            const life = Math.max(40, Math.round(p("trumpcard", "life", action)));
            const scale = radius / 0.32;
            const intensity = Math.max(0.5, Math.min(2.4, 0.5 + spent * 1.9));
            const trail = Math.max(14, Math.round(power * 1.3));
            const sparks = Math.max(12, Math.round(power * 0.5));
            const appearance: LivingActions.ProjectileAppearance = { item: "minecraft:paper", scale: 1.1, glow: true };
            // 只有选中了敌人、又开启必中时才有限追踪；空投点/方向是直球。
            if (sure && foe !== null) appearance.homing = { target: String(foe.ref()), turn: turn, delay: 1, range: range + 4 };

            sound(action, "minecraft:entity.arrow.shoot");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: range, radius: radius, lifetime: life, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const who = hit.target();
                    if (who === null) {
                        // 方块接触：在原生方块格与表面上碎牌；非方块的悬空接触只留一点散光。
                        const blockAt = hit.blockPosition();
                        const at = blockAt === null ? hit.position() : blockAt;
                        if (hit.blocked()) {
                            WorldFeedback.emit(scope, trumpcardScene, 1, at,
                                { moment: "break", face: hit.blockFace(), remaining: remaining, spent: spent, scale: scale, sparks: sparks, intensity: intensity }, 22);
                            WorldFeedback.text(scope, at.plus(WorldCombat.point(0, 0.9, 0)), trumpcardBreakText, [], 20);
                        } else
                            WorldFeedback.emit(scope, trumpcardScene, 1, hit.position(),
                                { moment: "fade", remaining: remaining, spent: spent, scale: scale, intensity: intensity }, 22);
                        return;
                    }
                    const landed = scope.valid(who)
                        ? impact(current, hit, "trumpcard", power, { damage: damageSpec("trumpcard", "power"), contact: false }) : false;
                    WorldFeedback.emit(scope, trumpcardScene, 1, hit.position(),
                        { moment: landed ? "strike" : "fade", target: String(who.ref()), remaining: remaining, last: last, ring: last === 1 ? 0 : 1,
                            spent: spent, scale: scale, sparks: sparks, power: power, intensity: intensity }, 26);
                    if (landed) {
                        sound(current, "cobblemon:impact.normal");
                        const body = scope.observe(who);
                        if (body !== null) {
                            const away = body.position().minus(hit.position());
                            const direction = away.length() < 0.01 ? current.direction() : away.unit();
                            scope.displace(who, direction.scale(push));
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.3, 0)), trumpcardStrikeText, [Math.round(power)], 24);
                        }
                    }
                }
            }, function (current: CombatAction) { done(current); });

            WorldFeedback.emit(world, trumpcardScene, 1, action.origin(),
                { moment: "throw", projectile: flight, remaining: remaining, last: last, spent: spent, scale: scale, intensity: intensity, trail: trail }, 30);
            WorldFeedback.emit(world, trumpcardScene, 1, action.origin(),
                { moment: "flight", projectile: flight, remaining: remaining, last: last, spent: spent, scale: scale, intensity: intensity, trail: trail, sparks: sparks }, 40);
        }
    });
}
