/**
 * 魔法叶 / magicalleaf 的出手方式。
 *
 * 核心念头：散出一群会拐弯追人的叶，从四面八方一起收拢——叶会追，所以打得到。
 *
 * 两幕：
 *   起（gather，提交前）：叶在身周旋起、越聚越多（可被打断的预告）。
 *   放（launch → seek → hit/fade）：提交后叶群迸出；合围时沿整圈散开再加 2 片、转向更强，
 *       从对手四周划弧收拢；直取时从前方小锥面直插。每片叶锁定选定对手一路拐过去，
 *       碰到对手即按 `leaf` 结算一片叶的伤害；全部落地或落空后收势。
 *   目标离场则整群叶散尽（miss）。
 *
 * 与同族分开：高速星星是向四面迸开后**一颗星一个对手**；魔法叶是**一整群叶全扑向同一个对手**，
 *   合围时从整圈散开、绕到背后再收拢，把对手包在叶网里。
 */
namespace PokemonSkills {
    const magicalleafScene = "world_combat:move_magicalleaf";
    const magicalleafFadeText = "world_combat.move.magicalleaf.text.fade";

    /** 以瞄准方向为基准角（水平），没有目标时朝面前。 */
    function magicalleafHeading(action: CombatAction): number {
        const delta = action.targetPosition().minus(action.origin());
        const flat = WorldCombat.point(delta.x(), 0, delta.z());
        const unit = flat.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : flat.unit();
        return Math.atan2(unit.x(), unit.z());
    }

    define({
        id: "magicalleaf",
        cooldownParameter: "recharge",
        name: "Magical Leaf",
        description: "散出一群会拐弯追人的叶，从四面八方一起收拢——叶会追，所以打得到。合围时从整圈散开绕到对手四周，直取时从前方小锥面直插。",
        uses: ["散出一群会拐弯的叶追一个对手", "从四面八方合围，逼对手无处可躲", "在对手拉开距离时仍然咬住它"],
        kind: "enemy",
        range: 11,
        maxRange: 16,
        prepare: 8,
        active: 30,
        recover: 8,
        cooldown: 80,
        style: "leaf",
        defaults: { envelop: false, ai: { maxChase: 15, envelopFar: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("magicalleaf", "lockRange", pokemon), geometry: "area", style: "leaf", color: 0x7FD34A,
                label: config && config.envelop === true ? "魔法叶·合围" : "魔法叶" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["magicalleaf"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const envelop = !!(config && config.envelop);
            return {
                prepare: Math.round(p("magicalleaf", "tempo", context)) + (envelop ? 2 : 0),
                recover: Math.round(p("magicalleaf", "settle", context)),
                cooldown: Math.round(p("magicalleaf", "recharge", context)) + (envelop ? 3 : 0),
                active: skills["magicalleaf"].active,
                range: p("magicalleaf", "lockRange", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("magicalleaf:gather", magicalleafScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, target: action.target() === null ? "" : String(action.target()!.ref()),
                    envelop: !!(config && config.envelop) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const envelop = !!(config && config.envelop);
            const count = Math.max(1, Math.round(p("magicalleaf", "leaves", action)));
            const power = p("magicalleaf", "leaf", action);
            const speed = p("magicalleaf", "leafSpeed", action);
            const turn = p("magicalleaf", "turn", action);
            const radius = p("magicalleaf", "leafRadius", action);
            const range = p("magicalleaf", "lockRange", action);
            const intensity = Math.max(0.5, Math.min(2, power / 26));
            const trail = Math.max(16, Math.round(power * 1.5));
            const notes = Math.max(6, Math.round(power / 4));
            const scale = radius / 0.3;
            const selected = action.target();

            sound(action, "cobblemon:move.magicalleaf.actor_1");
            WorldFeedback.emit(world, magicalleafScene, 1, action.origin(),
                { moment: "launch", count: count, envelop: envelop, intensity: intensity, scale: scale }, 22);

            if (selected === null || !world.valid(selected)) {
                WorldFeedback.emit(world, magicalleafScene, 1, action.origin(), { moment: "fade", intensity: intensity }, 20);
                WorldFeedback.text(world, action.origin().plus(WorldCombat.point(0, 1.2, 0)), magicalleafFadeText, [], 24);
                done(action);
                return;
            }

            const base = magicalleafHeading(action);
            const cone = 70 * Math.PI / 180;
            const ref = String(selected.ref());
            let remaining = count;
            let settled = false;
            function completeOne(current: CombatAction): void {
                remaining--;
                if (remaining > 0 || settled) return;
                settled = true;
                done(current);
            }
            for (let shot = 0; shot < count; shot++) {
                const angle = envelop ? base + Math.PI * 2 * (shot / count)
                    : base + (count === 1 ? 0 : (shot / (count - 1) - 0.5) * cone);
                const direction = WorldCombat.point(Math.sin(angle), 0.14, Math.cos(angle)).unit();
                const homing = { target: ref, turn: turn, delay: 1, range: range + 8 };
                const flight = LivingActions.projectile(action, {
                    speed: speed, range: range + 8, radius: radius, direction: direction,
                    appearance: { sprite: "cobblemon:particle/generic/grass/leaf", glow: true, tint: 0xBFE6A0, homing: homing },
                    impact: function (current: CombatAction, hit: CombatImpact) {
                        const scope = current.world();
                        const who = hit.target();
                        const landed = who !== null && scope.valid(who)
                            ? impact(current, hit, "magicalleaf", power, { damage: damageSpec("magicalleaf", "leaf") }) : false;
                        WorldFeedback.emit(scope, magicalleafScene, 1, hit.position(),
                            { moment: landed ? "hit" : "fade", target: who === null ? "" : String(who.ref()),
                                intensity: intensity, notes: notes, scale: scale }, 22);
                        if (landed) scope.sound("cobblemon:impact.grass", hit.position(), 12, "{}");
                    }
                }, function (current: CombatAction) { completeOne(current); });
                WorldFeedback.emit(world, magicalleafScene, 1, action.origin(),
                    { moment: "seek", projectile: flight, target: ref, intensity: intensity, trail: trail, scale: scale }, 40);
            }
        }
    });
}
