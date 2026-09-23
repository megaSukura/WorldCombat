/**
 * 出奇一击 / feintattack 的出手方式。
 *
 * 核心念头：先悄悄贴近，在对手没看那一侧之前闪到它背后，贴着背打一记——对手根本没在防那一侧，所以必中。
 *
 * 两幕：
 *   起（vanish，提交前）：身影暗下去、暗影在脚下收拢（很淡的预告——这正是「出奇」）。
 *   袭（blink → decoy → strike）：提交后闪到对手背后，贴着背打出 `strike` 接触伤害；
 *       若开了 `decoy`，先在对手正面留一个暗影替身短暂引开它的注意力，再从背后打。
 *       目标离场则只扑出一缕暗烟（miss）。
 *
 * 与同族分开：燕返是掠过一整条刀路、扫路上所有人、落在对手身后；出奇一击是**瞬移到选定对手背后的一记接触拳**，
 *   还可用替身把对手的注意力钉在正面。暗影拳则由本体不动、拳从目标自己的影子里冒出（见 shadowpunch）。
 */
namespace PokemonSkills {
    const feintattackScene = "world_combat:move_feintattack";
    const feintattackMissText = "world_combat.move.feintattack.text.miss";
    const feintattackStrikeText = "world_combat.move.feintattack.text.strike";

    define({
        id: "feintattack",
        cooldownParameter: "recharge",
        name: "Feint Attack",
        description: "The user approaches the target disarmingly, then throws a sucker punch. This attack never misses.",
        uses: ["悄悄绕到对手背后打一记重拳", "用暗影替身把对手的注意力钉在正面", "收拾正在盯着别人的目标"],
        kind: "enemy",
        range: 6.5,
        maxRange: 10,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 45,
        style: "dark",
        defaults: { decoy: false, ai: { maxChase: 9, backline: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("feintattack", "reach", pokemon), geometry: "point", style: "dark", color: 0x7A5FD0,
                label: config && config.decoy === true ? "出奇一击·佯攻" : "出奇一击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["feintattack"], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            const decoy = !!(config && config.decoy);
            return {
                prepare: Math.round(p("feintattack", "tempo", context)) + (decoy ? 4 : 0),
                recover: Math.round(p("feintattack", "settle", context)),
                cooldown: Math.round(p("feintattack", "recharge", context)) + (decoy ? 8 : 0),
                active: 0,
                range: p("feintattack", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("feintattack:vanish", feintattackScene, 1, action.origin(),
                JSON.stringify({ moment: "vanish", windup: prepare, target: action.target() === null ? "" : String(action.target()!.ref()),
                    decoy: !!(config && config.decoy) }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            const target = action.target();
            const decoy = !!(config && config.decoy);
            const power = p("feintattack", "strike", action);
            const behind = p("feintattack", "behind", action);
            const decoyTicks = Math.max(20, Math.round(p("feintattack", "decoyTicks", action)));

            function miss(current: CombatAction): void {
                const scope = current.world();
                WorldFeedback.emit(scope, feintattackScene, 1, current.origin(), { moment: "miss" }, 20);
                WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.1, 0)), feintattackMissText, [], 22);
                scope.sound("minecraft:entity.vex.ambient", current.origin(), 12, "{}");
                done(current);
            }

            if (self === null || target === null || !world.valid(target)) { miss(action); return; }
            const body = world.observe(target);
            if (body === null) { miss(action); return; }
            const origin = self.position();
            const toward = body.position().minus(origin);
            if (toward.length() < 0.01) { miss(action); return; }
            const heading = toward.unit();

            sound(action, "minecraft:entity.enderman.teleport");
            const destination = body.position().plus(heading.scale(behind));
            if (!world.teleport(actor, destination)) {
                const here = world.observe(actor);
                if (here !== null) world.displace(actor, destination.minus(here.position()));
            }
            if (decoy) {
                const decoyAt = body.position().minus(heading.scale(1.3)).plus(WorldCombat.point(0, 0.1, 0));
                let silhouette: CombatActor | null = null;
                try {
                    silhouette = world.helper(decoyAt, 20,
                        JSON.stringify({ sprite: "cobblemon:generic/smoke/smoke", tint: 0x2A2140, glow: false, scale: 1 }), decoyTicks);
                } catch (error) { silhouette = null; }
                if (silhouette !== null) {
                    world.target(target, silhouette);
                    WorldFeedback.emit(world, feintattackScene, 1, decoyAt,
                        { moment: "decoy", target: String(target.ref()), decoy: String(silhouette.ref()) }, 26);
                }
            }

            const victim = world.valid(target) ? world.observe(target) : null;
            if (victim === null) { miss(action); return; }
            const landed = hurt(action, target, "feintattack", power,
                { damage: damageSpec("feintattack", "strike"), contact: true });
            const at = victim.position();
            WorldFeedback.emit(world, feintattackScene, 1, at,
                { moment: landed ? "strike" : "miss", target: String(target.ref()), decoy: decoy ? 1 : 0,
                    power: Math.round(power * 10) / 10,
                    path: [[origin.x(), origin.y(), origin.z()], [at.x(), at.y(), at.z()]] }, 28);
            if (landed) {
                world.sound("cobblemon:impact.dark", at, 16, "{}");
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), feintattackStrikeText, [], 24);
            }
            done(action);
        }
    });
}
