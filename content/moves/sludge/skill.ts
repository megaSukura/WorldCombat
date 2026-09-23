/**
 * 污泥攻击 / sludge —— 出手方式。
 *
 * 核心念头：一记**低弧丢出去的湿泥团**。施法者从脚边抓起一团泥甩出去，泥团拖着泥点飞向目标，
 *   落在谁身上就在谁身上摊开、顺着往下淌；够脏的时候，毒顺着泥缝钻进对方身体。
 *   它是这一族最便宜、最快、PP 最多的那一招，靠一次接一次地丢把毒累上去。
 *
 * 幕：
 *   起（windup，提交前）：脚边泥泡鼓起、泥点在掌中聚拢的预告（`action.present`，可被打断、不花 PP）。
 *   丢（throw，提交后）：泥团沿低弧飞出，身后甩出细小泥点，弧线让对手读得出落点。
 *   落（hit / splat）：命中活物→吃 `glob`、按概率挂共享中毒身份、在目标身上摊开；落地/落空→只在落点溅一摊泥。
 *
 * 与同族分开：污泥炸弹是落地插引信的延时爆弹、垃圾射击是负重直线炮、浊雾是正前方的雾锥；
 *   只有污泥攻击是**一记便宜的低弧小泥团**，反制方式是走位躲开这条弧线或撑过毒。
 */
namespace PokemonSkills {
    const sludgeScene = "world_combat:move_sludge";
    const sludgeHitText = "world_combat.move.sludge.text.hit";
    const sludgePoisonText = "world_combat.move.sludge.text.poison";
    const sludgeImmuneText = "world_combat.move.sludge.text.immune";
    const sludgeSplatText = "world_combat.move.sludge.text.splat";

    define({
        id: "sludge",
        cooldownParameter: "recharge",
        name: "Sludge",
        description: "从脚边抓一团湿泥低弧甩向对手：便宜、出手快、PP 多；糊中后按概率让对手中毒，泥团在身上摊开往下淌。黏附形态更黏更毒，代价是威力更低、出手更慢。",
        uses: ["远距离反复消耗、把毒累上去", "PP 多、随时补一发", "逼对手走位躲这条泥弧"],
        kind: "enemy",
        range: 9,
        maxRange: 13,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 14,
        style: "sludge",
        defaults: { cling: false, ai: { maxChase: 11, seekUnpoisoned: true, leaveStation: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["sludge"], detail: { values: config } };
            return { radius: p("sludge", "reach", context), geometry: "line", style: "sludge", color: 0x7FB84A,
                label: config && config.cling === true ? "污泥攻击·黏附" : "污泥攻击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["sludge"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("sludge", "tempo", context)),
                recover: Math.round(p("sludge", "settle", context)),
                cooldown: Math.round(p("sludge", "recharge", context)),
                active: 0,
                range: p("sludge", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const drops = Math.max(4, Math.round(p("sludge", "drops", action)));
            action.present("sludge:gather:" + action.id(), sludgeScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, drops: drops, cling: config && config.cling === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const speed = p("sludge", "globSpeed", action);
            const gravity = p("sludge", "globGravity", action);
            const radius = p("sludge", "globRadius", action);
            const power = p("sludge", "glob", action);
            const chance = p("sludge", "poisonChance", action);
            const venomTicks = Math.max(40, Math.round(p("sludge", "venomTicks", action)));
            const drops = Math.max(6, Math.round(p("sludge", "drops", action)));
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.22));
            const intensity = Math.max(0.6, Math.min(2, power / 65));
            const launch = LivingActions.ballistic(origin, action.targetPosition(), speed, gravity) || aim(action);
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            /** 命中活物：结算伤害、按概率挂毒，在目标身上摊开。 */
            function clump(current: CombatAction, point: CombatPoint, primary: CombatActor | null): void {
                const scope = current.world();
                if (primary !== null && scope.valid(primary) && !scope.friendly(primary)) {
                    const dealt = hurt(current, primary, "sludge", power,
                        { damage: damageSpec("sludge", "glob"), contact: false });
                    let poisoned = false;
                    if (dealt && scope.valid(primary) && scope.random() < chance)
                        poisoned = CombatStatus.inflict(scope, primary, "poison", venomTicks, 0, { secondary: true });
                    const at = scope.valid(primary) ? scope.observe(primary) : null;
                    const where = at === null ? point : at.position();
                    WorldFeedback.emit(scope, sludgeScene, 1, where,
                        { moment: dealt ? "hit" : "immune", target: String(primary.ref()), drops: drops,
                            sparks: Math.max(6, Math.round(power * 0.35)), scale: scale, intensity: intensity }, 24);
                    if (dealt) WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.0, 0)),
                        poisoned ? sludgePoisonText : sludgeHitText, [], 24);
                    else WorldFeedback.text(scope, where.plus(WorldCombat.point(0, 1.0, 0)), sludgeImmuneText, [], 22);
                    if (poisoned) scope.sound("cobblemon:impact.poison", where, 14, "{}");
                } else {
                    WorldFeedback.emit(scope, sludgeScene, 1, point,
                        { moment: "splat", drops: Math.round(drops * 0.6), scale: scale }, 20);
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 0.5, 0)), sludgeSplatText, [], 20);
                }
                finish(current);
            }

            sound(action, "cobblemon:move.sludgebomb.actor");
            sound(action, "minecraft:entity.slime.squish");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: radius, gravity: gravity, lifetime: 180,
                direction: launch,
                appearance: { sprite: "cobblemon:generic/goo/chemicalball", tint: 0x7FB84A, glow: false,
                    scale: Math.max(0.7, radius / 0.2) },
                impact: function (current: CombatAction, hit: CombatImpact) { clump(current, hit.position(), hit.target()); }
            }, function (current: CombatAction) { finish(current); });
            WorldFeedback.keep(world, "sludge:fly:" + action.id(), sludgeScene, 1, origin,
                { moment: "flight", projectile: flight, drops: drops, scale: scale, intensity: intensity }, 60);
        }
    });
}
