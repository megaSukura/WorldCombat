/**
 * 王牌 / trumpcard 的出手方式。
 *
 * 念头的形状：起手把这张牌亮出来，牌面随着这叠牌用剩多少而由暗转亮（windup，提交前只播预告）→
 * 把牌掷出去（throw）→ 牌一路飞行，必中式的牌自己拐弯追人（flight）→ 在对手身上炸开（strike / fade）。
 * 读数就是这招自己的 PP：每用一次牌更旧一分，下一掷更重，最后一张是全场最重的一掷。
 *
 * 两幕半：draw（亮牌）→ throw / flight（飞行）→ strike / fade（炸开或落空）。提交后才触碰世界。
 */
namespace PokemonSkills {
    const trumpcardScene = "world_combat:move_trumpcard";
    const trumpcardStrikeText = "world_combat.move.trumpcard.text.strike";
    const trumpcardFadeText = "world_combat.move.trumpcard.text.fade";

    define({
        id: "trumpcard",
        name: "Trump Card",
        description: "最后一张牌最重：把一张牌掷向对手，牌在它身上炸开。这招自己的剩余 PP 越少，这一掷越重，最后一张是全场最重的一击；它是本组唯一的远程招，只有它把「自己的资源余量」当威力表。",
        uses: ["把用剩的牌当重击掷出去", "最后一张牌做决胜一击", "从远处点名一个目标"],
        kind: "enemy",
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
            const spent = p("trumpcard", "spent", action);
            action.present("world_combat:move_trumpcard:draw", trumpcardScene, 1, action.origin(),
                JSON.stringify({ moment: "draw", windup: prepare, spent: spent, sure: sure, sparkles: Math.max(6, Math.round(8 + spent * 20)) }));
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
            const spent = p("trumpcard", "spent", action);
            const life = Math.max(40, Math.round(p("trumpcard", "life", action)));
            const scale = radius / 0.32;
            const intensity = Math.max(0.5, Math.min(2.4, 0.5 + spent * 1.9));
            const trail = Math.max(14, Math.round(power * 1.3));
            const sparks = Math.max(12, Math.round(power * 0.5));
            const appearance: LivingActions.ProjectileAppearance = { item: "minecraft:paper", scale: 1.1, glow: true };
            if (sure && foe !== null) appearance.homing = { target: String(foe.ref()), turn: turn, delay: 1, range: range + 4 };

            sound(action, "minecraft:entity.arrow.shoot");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: range, radius: radius, lifetime: life, appearance: appearance,
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world();
                    const who = hit.target();
                    const landed = who !== null && scope.valid(who)
                        ? impact(current, hit, "trumpcard", power, { damage: damageSpec("trumpcard", "power"), contact: false }) : false;
                    WorldFeedback.emit(scope, trumpcardScene, 1, hit.position(),
                        { moment: landed ? "strike" : "fade", target: who === null ? "" : String(who.ref()),
                            spent: spent, scale: scale, sparks: sparks, power: power, intensity: intensity }, 26);
                    if (landed) {
                        sound(current, "cobblemon:impact.normal");
                        const body = who === null ? null : scope.observe(who);
                        if (body !== null) {
                            const away = body.position().minus(hit.position());
                            const direction = away.length() < 0.01 ? current.direction() : away.unit();
                            scope.displace(who!, direction.scale(push));
                            WorldFeedback.text(scope, hit.position().plus(WorldCombat.point(0, 1.3, 0)), trumpcardStrikeText, [Math.round(power)], 24);
                        }
                    }
                }
            }, function (current: CombatAction) { done(current); });

            WorldFeedback.emit(world, trumpcardScene, 1, action.origin(),
                { moment: "throw", projectile: flight, spent: spent, scale: scale, intensity: intensity, trail: trail }, 30);
            WorldFeedback.emit(world, trumpcardScene, 1, action.origin(),
                { moment: "flight", projectile: flight, spent: spent, scale: scale, intensity: intensity, trail: trail, sparks: sparks }, 40);
        }
    });
}
