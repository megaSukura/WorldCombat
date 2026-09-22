/**
 * 双针 / twineedle —— 出手方式。
 *
 * 核心念头：一记**先后两下**的双刺。第一针先扎开伤口，第二针冲着这道伤口去，所以第二针更容易把毒带进去。
 *   它不是一次伤害结算两次，而是一段有前后因果的两拍。属性取原生的虫，毒只是它附带的。
 *
 * 幕：
 *   起（windup，提交前）：端起两根针、针尖挂毒的预告（`action.present`，可被打断、不花 PP）。
 *   一（first）：提交后射出第一根针，拖一条虫绿+毒的细尾。
 *   二（second）：第一根收针 `gap` 之后射出第二根；交叉式下两根从身体两侧夹击，直刺式下同一线连出。
 *   中（sting / done）：每针各自结算 `dart` 物理伤害并各自掷一次毒；第一针命中后，第二针的中毒概率加上 `woundBonus`。
 *
 * 与同族分开：毒针是一发一发的便宜细针、毒击是站定出臂的近身重刺、臂贝武器是重炮；只有双针是**一记两根、
 *   第二根吃第一根的伤口**，反制方式是在两针之间走位。
 */
namespace PokemonSkills {
    const twineedleScene = "world_combat:move_twineedle";
    const twineedleVenomText = "world_combat.move.twineedle.text.venom";

    /** 水平侧向单位向量：把两针摊到身体两侧；方向接近竖直时退化为世界 X 轴。 */
    function twineedleSide(direction: CombatPoint): CombatPoint {
        const side = WorldCombat.point(-direction.z(), 0, direction.x());
        return side.length() < 0.001 ? WorldCombat.point(1, 0, 0) : side.unit();
    }

    define({
        id: "twineedle",
        name: "Twineedle",
        description: "端起两根针先后刺出：第一针先扎开伤口，第二针冲着这道伤口去，所以第二针更容易带毒。交叉式让两根针从身体两侧夹击，加成更大，但每针更轻、间隔更长。",
        uses: ["一记两下的稳定连刺", "用第二针把毒补上", "对单体连续压出血线"],
        kind: "enemy",
        range: 8,
        maxRange: 12,
        prepare: 6,
        active: 2,
        recover: 6,
        cooldown: 16,
        style: "twin",
        defaults: { cross: false, ai: { maxChase: 12, finishLow: false, leaveStation: true } },
        fields: [],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["twineedle"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("twineedle", "tempo", context)),
                recover: Math.round(p("twineedle", "settle", context)),
                cooldown: Math.round(p("twineedle", "recharge", context)),
                active: 2,
                range: p("twineedle", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const motes = Math.max(4, Math.round(p("twineedle", "motes", action)));
            action.present("twineedle:aim:" + action.id(), twineedleScene, 1, action.origin(),
                JSON.stringify({ moment: "aim", windup: prepare, needles: 2, motes: motes, cross: config && config.cross ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["twineedle"], detail: { values: config } };
            return { radius: p("twineedle", "reach", context), geometry: "line", style: "twin", color: 0xB6D84A,
                label: config && config.cross === true ? "双针·交叉" : "双针" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const target = action.target();
            const direction = aim(action);
            const side = twineedleSide(direction);
            const power = p("twineedle", "dart", action);
            const chance = p("twineedle", "poisonChance", action);
            const woundBonus = p("twineedle", "woundBonus", action);
            const venomTicks = Math.max(40, Math.round(p("twineedle", "venomTicks", action)));
            const speed = p("twineedle", "flight", action);
            const radius = p("twineedle", "dartRadius", action);
            const gap = Math.max(2, Math.round(p("twineedle", "gap", action)));
            const flank = p("twineedle", "flank", action);
            const motes = Math.max(6, Math.round(p("twineedle", "motes", action)));
            const cross = !!(config && config.cross === true);
            const scale = Math.max(0.5, Math.min(1.8, radius / 0.16));
            const intensity = Math.max(0.5, Math.min(2, power / 25));
            const ref = target !== null && world.valid(target) ? String(target.ref()) : "";
            let landedFirst = false, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function launch(current: CombatAction, index: number): void {
                const scope = current.world();
                const actor = current.actor();
                const body = scope.observe(actor);
                const base = body === null ? current.origin() : body.position();
                const offset = cross ? side.scale(index === 0 ? flank : -flank) : WorldCombat.point(0, index * 0.12, 0);
                const from = base.plus(offset);
                const appearance: any = { sprite: "cobblemon:particle/generic/spike", tint: 0xB6D84A, glow: true, scale: Math.max(0.8, radius / 0.16) };
                if (ref) appearance.homing = { target: ref, turn: 18, range: current.range() };
                sound(current, index === 0 ? "minecraft:entity.arrow.shoot" : "minecraft:entity.arrow.shoot");
                WorldFeedback.emit(scope, twineedleScene, 1, from,
                    { moment: index === 0 ? "first" : "second", needles: 2, index: index + 1, motes: motes,
                        direction: [direction.x(), direction.y(), direction.z()], flank: flank, scale: scale, intensity: intensity }, 20);
                const flight = LivingActions.projectile(current, {
                    speed: speed, range: current.range(), radius: radius, direction: direction, appearance: appearance,
                    impact: function (inner: CombatAction, hit: CombatImpact, age: number) {
                        const innerWorld = inner.world();
                        const victim = hit.target();
                        const point = hit.position();
                        WorldFeedback.emit(innerWorld, twineedleScene, 1, point,
                            { moment: "sting", target: victim === null ? "" : String(victim.ref()), needles: 2, index: index + 1,
                                motes: motes, projectile: flight, scale: scale, intensity: intensity }, 20);
                        if (victim === null || !innerWorld.valid(victim)) return;
                        const dealt = impact(inner, hit, "twineedle", power, { damage: damageSpec("twineedle", "dart") });
                        if (!dealt) return;
                        if (index === 0) landedFirst = true;
                        const bonus = index === 1 && landedFirst ? woundBonus : 0;
                        if (innerWorld.valid(victim) && innerWorld.random() < Math.min(0.95, chance + bonus)) {
                            CombatStatus.inflict(innerWorld, victim, "poison", venomTicks, 0, { secondary: true });
                            const at = innerWorld.observe(victim);
                            if (at !== null) WorldFeedback.text(innerWorld, at.position().plus(WorldCombat.point(0, 1.0, 0)), twineedleVenomText, [], 20);
                        }
                    }
                }, function (inner: CombatAction) {
                    if (index === 0) { inner.after(gap, function (next: CombatAction) { launch(next, 1); }); return; }
                    WorldFeedback.emit(inner.world(), twineedleScene, 1, inner.targetPosition(),
                        { moment: "done", needles: 2, motes: motes, scale: scale }, 16);
                    finish(inner);
                });
            }

            launch(action, 0);
        }
    });
}
