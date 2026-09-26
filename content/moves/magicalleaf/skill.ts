/**
 * 魔法叶 / magicalleaf 的出手方式。
 *
 * 核心念头：散出一群会拐弯追人的叶，从四面八方一起收拢——叶会追，所以打得到。
 *
 * 两幕：
 *   起（gather，提交前）：叶在身周旋起、越聚越多（可被打断的预告，叶数按本招算出的实际片数）。
 *   放（launch → seek → hit/block/fade）：提交后叶群迸出；合围时沿整圈散开再加 2 片、转向更强，
 *       从对手四周划弧收拢；直取时从前方小锥面直插。只在发射时给选中的实体分配锁定，每片叶追该目标，
 *       碰到对手即按 `leaf` 结算一片叶的伤害；没有选中实体时按瞄准方向散射，飞出的叶不再另找目标。
 *       撞到方块则在撞点碎开，飞完或落空自然散去。
 *
 * 与同族分开：高速星星是向四面迸开后**一颗星一个对手**；魔法叶是**一整群叶全扑向同一个对手**（或朝一个方向散射），
 *   合围时从整圈散开、绕到背后再收拢，把对手包在叶网里。
 */
namespace PokemonSkills {
    const magicalleafScene = "world_combat:move_magicalleaf";

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
        description: "散出一群会拐弯追人的叶，从四面八方一起收拢——叶会追，所以打得到。选中一个对手时整群叶在发射时锁定它；没有选中实体时朝瞄准方向散射，飞出的叶不再另找目标。合围时从整圈散开绕到对手四周，直取时从前方小锥面直插。",
        uses: ["散出一群会拐弯的叶追一个对手", "从四面八方合围，逼对手无处可躲", "在对手拉开距离时仍然咬住它"],
        kind: "aim",
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
            const count = Math.max(1, Math.round(p("magicalleaf", "leaves", action)));
            action.present("magicalleaf:gather", magicalleafScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, count: count,
                    target: action.target() === null ? "" : String(action.target()!.ref()),
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
            // 只在发射时分配锁定：选中的实体离线后，叶保持最后方向自然散去，不自动另找目标。
            const locked = selected !== null && world.valid(selected) ? String(selected.ref()) : "";

            sound(action, "cobblemon:move.magicalleaf.actor_1");
            WorldFeedback.emit(world, magicalleafScene, 1, action.origin(),
                { moment: "launch", count: count, envelop: envelop, intensity: intensity, scale: scale }, 22);

            const base = magicalleafHeading(action);
            const cone = 70 * Math.PI / 180;
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
                const appearance: LivingActions.ProjectileAppearance = {
                    sprite: "cobblemon:particle/generic/grass/leaf", glow: true, tint: 0xBFE6A0 };
                if (locked !== "")
                    appearance.homing = { target: locked, turn: turn, delay: 1, range: range + 8 };
                const flight = LivingActions.projectile(action, {
                    speed: speed, range: range + 8, radius: radius, direction: direction,
                    appearance: appearance,
                    impact: function (current: CombatAction, hit: CombatImpact) {
                        const scope = current.world();
                        const who = hit.target();
                        if (who !== null && scope.valid(who) && !scope.friendly(who)) {
                            const landed = impact(current, hit, "magicalleaf", power,
                                { damage: damageSpec("magicalleaf", "leaf") });
                            WorldFeedback.emit(scope, magicalleafScene, 1, hit.position(),
                                { moment: landed ? "hit" : "fade", target: String(who.ref()), intensity: intensity,
                                    notes: notes, scale: scale }, 22);
                            if (landed) scope.sound("cobblemon:impact.grass", hit.position(), 12, "{}");
                            return;
                        }
                        if (hit.blocked()) {
                            WorldFeedback.emit(scope, magicalleafScene, 1, hit.position(),
                                { moment: "block", notes: notes, scale: scale, intensity: intensity }, 18);
                            scope.sound("minecraft:block.grass.break", hit.position(), 8, "{}");
                            return;
                        }
                        WorldFeedback.emit(scope, magicalleafScene, 1, hit.position(),
                            { moment: "fade", intensity: intensity }, 18);
                    }
                }, function (current: CombatAction) { completeOne(current); });
                WorldFeedback.emit(world, magicalleafScene, 1, action.origin(),
                    { moment: "seek", projectile: flight, target: locked, intensity: intensity, trail: trail, scale: scale }, 40);
            }
        }
    });
}
