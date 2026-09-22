/**
 * 毒粉 / Poison Powder — 出手方式。
 *
 * 核心念头：一撮当空撒开、立刻落下就完事的毒尘。施法者把粉团抛向选定的落点，落地立刻炸开，把圈里的非友方
 *   一次全毒上，然后什么都不留下。它是四式状态里最便宜、最不占地方的出手：短距离、小范围、短冷却，
 *   用来顺手把贴身的目标们点上毒；不像毒瓦斯留一片会爆燃的云，也不像剧毒会越钻越深。
 *
 * 幕：
 *   起（windup，提交前）：拢粉的预告（`action.present`）。
 *   掷（throw）：提交后低弧抛出粉团，`LivingActions.projectile` 负责飞行与碰撞。
 *   散（scatter → poisoned）：落地立刻炸开，落点半径内的非友方各挂一次共享的 `world_combat:status/poison`
 *       （宝可梦那一层由共享默认效果同步成原生中毒），随后尘粒散去，不留任何东西。
 *
 * 反制：命中率 75，粉团落下前走开即可；草属性穿过粉末，毒属性与钢属性穿过中毒。
 */
namespace PokemonSkills {
    const poisonpowderScene = "world_combat:move_poisonpowder";
    const poisonpowderPoisonText = "world_combat.move.poisonpowder.text.poisoned";
    const poisonpowderLandText = "world_combat.move.poisonpowder.text.land";

    /** 草属性对粉末免疫：它直接穿过这撮毒尘。 */
    function poisonpowderGrassImmune(world: CombatWorld, actor: CombatActor): boolean {
        if (String(actor.domain()) !== "cobblemon" || !world.valid(actor)) return false;
        const pokemon = CobblemonCombat.pokemon(actor);
        for (let i = 0; i < pokemon.typeCount(); i++) if (String(pokemon.type(i)) === "grass") return true;
        return false;
    }

    define({
        id: poisonpowderId,
        name: "Poison Powder",
        description: "The user scatters a cloud of poisonous dust that poisons the target.",
        uses: ["顺手给贴身的目标上毒", "一次点上挤在一起的一小群", "用最短的冷却反复施压"],
        kind: "point",
        range: 6,
        maxRange: 10,
        prepare: 7,
        active: 1,
        recover: 6,
        cooldown: 24,
        style: "dust",
        defaults: { cling: false, ai: { maxChase: 7, minFoes: 1, leaveStation: true } },
        fields: [
            flag("cling", "黏附")
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[poisonpowderId], detail: { values: config }, world, actor, attributes };
            return {
                prepare: Math.round(p(poisonpowderId, "tempo", context)),
                recover: p(poisonpowderId, "recover", context),
                cooldown: Math.round(p(poisonpowderId, "recharge", context)),
                active: 1,
                range: p(poisonpowderId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("poisonpowder:windup:" + action.id(), poisonpowderScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", cling: config && config.cling ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[poisonpowderId], detail: { values: config } };
            return { radius: p(poisonpowderId, "dustRadius", context), geometry: "area", style: "dust", color: 0x9BE04A,
                label: config && config.cling === true ? "毒粉·黏附" : "毒粉·散撒" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const selfBody = world.observe(self);
            const origin = selfBody === null ? action.origin() : selfBody.position();
            const speed = Math.max(0.6, p(poisonpowderId, "puffSpeed", action));
            const radius = Math.max(1.2, p(poisonpowderId, "dustRadius", action));
            const poisonTicks = Math.max(60, Math.round(p(poisonpowderId, "poisonTicks", action)));
            const motes = Math.max(8, Math.round(p(poisonpowderId, "motes", action)));
            const scale = Math.max(0.5, Math.min(2.2, radius / 1.5));
            let settled = false;

            function scatter(current: CombatAction, point: CombatPoint, primary: CombatActor | null): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                let hits = 0;
                function bite(candidate: CombatActor): void {
                    if (!scope.valid(candidate) || scope.friendly(candidate)) return;
                    if (poisonpowderGrassImmune(scope, candidate)) return;
                    if (!CombatStatus.inflict(scope, candidate, "poison", poisonTicks)) return;
                    hits++;
                    const body = scope.observe(candidate);
                    if (body === null) return;
                    WorldFeedback.emit(scope, poisonpowderScene, 1, body.position(),
                        { moment: "poisoned", target: String(candidate.ref()), motes: motes, scale: scale }, 24);
                    WorldFeedback.text(scope, body.position(), poisonpowderPoisonText, [Math.round(poisonTicks / 20)], 28);
                }
                if (primary !== null && String(primary.key()) !== String(self.key())) bite(primary);
                WorldGeometry.selectEnemies(scope, WorldGeometry.ring(point, 0, radius, { below: 2, above: 2 }), function (other) {
                    if (primary !== null && String(other.ref()) === String(primary.ref())) return;
                    bite(other);
                });
                WorldFeedback.emit(scope, poisonpowderScene, 1, point,
                    { moment: "scatter", radius: radius, motes: motes, hits: hits, scale: scale }, 26);
                WorldFeedback.text(scope, point, poisonpowderLandText, [], 22);
                sound(current, "cobblemon:move.poisonpowder.target");
                done(current);
            }

            sound(action, "cobblemon:move.poisonpowder.actor");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: action.range(), radius: 0.24, lifetime: 90,
                appearance: { sprite: "cobblemon:particle/generic/powder", scale: 0.85, tint: 0x9BE04A },
                impact: function (current, hit) { scatter(current, hit.position(), hit.target()); }
            }, function (current) { scatter(current, current.targetPosition(), null); });
            WorldFeedback.emit(world, poisonpowderScene, 1, origin,
                { moment: "throw", projectile: flight, target: action.target() === null ? "" : String(action.target()!.ref()),
                    scale: scale, motes: motes }, 28);
        }
    });
}
